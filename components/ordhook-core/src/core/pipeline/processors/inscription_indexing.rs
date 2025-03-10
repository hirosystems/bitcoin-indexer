use std::{
    collections::{BTreeMap, HashMap},
    sync::Arc,
};

use chainhook_postgres::{pg_begin, pg_pool_client};
use chainhook_sdk::utils::Context;
use chainhook_types::{BitcoinBlockData, TransactionIdentifier};
use config::Config;

use dashmap::DashMap;
use fxhash::FxHasher;
use std::hash::BuildHasherDefault;

use crate::{
    core::{
        meta_protocols::brc20::{
            brc20_pg, cache::Brc20MemoryCache, index::index_block_and_insert_brc20_operations,
        },
        protocol::{
            inscription_parsing::parse_inscriptions_in_standardized_block,
            inscription_sequencing::{
                get_bitcoin_network, get_jubilee_block_height,
                parallelize_inscription_data_computations,
                update_block_inscriptions_with_consensus_sequence_data,
            },
            satoshi_numbering::TraversalResult,
            satoshi_tracking::augment_block_with_transfers,
            sequence_cursor::SequenceCursor,
        },
    },
    db::{cursor::TransactionBytesCursor, ordinals_pg},
    try_info,
    utils::monitoring::PrometheusMonitoring,
    PgConnectionPools,
};

pub async fn process_blocks(
    next_blocks: &mut Vec<BitcoinBlockData>,
    sequence_cursor: &mut SequenceCursor,
    cache_l2: &Arc<DashMap<(u32, [u8; 8]), TransactionBytesCursor, BuildHasherDefault<FxHasher>>>,
    brc20_cache: &mut Option<Brc20MemoryCache>,
    prometheus: &PrometheusMonitoring,
    config: &Config,
    pg_pools: &PgConnectionPools,
    ctx: &Context,
) -> Result<Vec<BitcoinBlockData>, String> {
    let mut cache_l1 = BTreeMap::new();
    let mut updated_blocks = vec![];

    for _cursor in 0..next_blocks.len() {
        let mut block = next_blocks.remove(0);

        index_block(
            &mut block,
            &next_blocks,
            sequence_cursor,
            &mut cache_l1,
            cache_l2,
            brc20_cache.as_mut(),
            prometheus,
            config,
            pg_pools,
            ctx,
        )
        .await?;

        updated_blocks.push(block);
    }
    Ok(updated_blocks)
}

pub async fn index_block(
    block: &mut BitcoinBlockData,
    next_blocks: &Vec<BitcoinBlockData>,
    sequence_cursor: &mut SequenceCursor,
    cache_l1: &mut BTreeMap<(TransactionIdentifier, usize, u64), TraversalResult>,
    cache_l2: &Arc<DashMap<(u32, [u8; 8]), TransactionBytesCursor, BuildHasherDefault<FxHasher>>>,
    brc20_cache: Option<&mut Brc20MemoryCache>,
    prometheus: &PrometheusMonitoring,
    config: &Config,
    pg_pools: &PgConnectionPools,
    ctx: &Context,
) -> Result<(), String> {
    let stopwatch = std::time::Instant::now();
    let block_height = block.block_identifier.index;
    try_info!(ctx, "Indexing block #{block_height}");

    // Invalidate and recompute cursor when crossing the jubilee height
    if block.block_identifier.index
        == get_jubilee_block_height(&get_bitcoin_network(&block.metadata.network))
    {
        sequence_cursor.reset();
    }

    {
        let mut ord_client = pg_pool_client(&pg_pools.ordinals).await?;
        let ord_tx = pg_begin(&mut ord_client).await?;

        // Parsed BRC20 ops will be deposited here for this block.
        let mut brc20_operation_map = HashMap::new();
        parse_inscriptions_in_standardized_block(block, &mut brc20_operation_map, config, &ctx);

        let has_inscription_reveals = parallelize_inscription_data_computations(
            &block,
            &next_blocks,
            cache_l1,
            cache_l2,
            config,
            ctx,
        )?;
        if has_inscription_reveals {
            update_block_inscriptions_with_consensus_sequence_data(
                block,
                sequence_cursor,
                cache_l1,
                &ord_tx,
                ctx,
            )
            .await?;
        }
        augment_block_with_transfers(block, &ord_tx, ctx).await?;

        // Write data
        ordinals_pg::insert_block(block, &ord_tx).await?;

        // BRC-20
        if let (Some(brc20_cache), Some(brc20_pool)) = (brc20_cache, &pg_pools.brc20) {
            let mut brc20_client = pg_pool_client(brc20_pool).await?;
            let brc20_tx = pg_begin(&mut brc20_client).await?;

            index_block_and_insert_brc20_operations(
                block,
                &mut brc20_operation_map,
                brc20_cache,
                &brc20_tx,
                &ctx,
            )
            .await?;

            brc20_tx
                .commit()
                .await
                .map_err(|e| format!("unable to commit brc20 pg transaction: {e}"))?;
        }

        prometheus.metrics_block_indexed(block_height);
        prometheus.metrics_inscription_indexed(
            ordinals_pg::get_highest_inscription_number(&ord_tx)
                .await?
                .unwrap_or(0) as u64,
        );
        ord_tx
            .commit()
            .await
            .map_err(|e| format!("unable to commit ordinals pg transaction: {e}"))?;
    }

    try_info!(
        ctx,
        "Block #{block_height} indexed in {}s",
        stopwatch.elapsed().as_millis() as f32 / 1000.0
    );
    Ok(())
}

pub async fn rollback_block(
    block_height: u64,
    _config: &Config,
    pg_pools: &PgConnectionPools,
    ctx: &Context,
) -> Result<(), String> {
    try_info!(ctx, "Rolling back block #{block_height}");
    {
        let mut ord_client = pg_pool_client(&pg_pools.ordinals).await?;
        let ord_tx = pg_begin(&mut ord_client).await?;

        ordinals_pg::rollback_block(block_height, &ord_tx).await?;

        // BRC-20
        if let Some(brc20_pool) = &pg_pools.brc20 {
            let mut brc20_client = pg_pool_client(brc20_pool).await?;
            let brc20_tx = pg_begin(&mut brc20_client).await?;

            brc20_pg::rollback_block_operations(block_height, &brc20_tx).await?;

            brc20_tx
                .commit()
                .await
                .map_err(|e| format!("unable to commit brc20 pg transaction: {e}"))?;
            try_info!(
                ctx,
                "Rolled back BRC-20 operations at block #{block_height}"
            );
        }

        ord_tx
            .commit()
            .await
            .map_err(|e| format!("unable to commit ordinals pg transaction: {e}"))?;
        try_info!(
            ctx,
            "Rolled back inscription activity at block #{block_height}"
        );
    }
    Ok(())
}
