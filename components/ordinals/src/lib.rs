use core::{
    first_inscription_height,
    meta_protocols::brc20::cache::brc20_new_cache,
    new_traversals_lazy_cache,
    pipeline::processors::{
        block_archiving::store_compacted_blocks,
        inscription_indexing::{process_blocks, rollback_block},
    },
    protocol::sequence_cursor::SequenceCursor,
};
use std::{sync::Arc, thread::JoinHandle};

use bitcoind::{
    indexer::{start_bitcoin_indexer, Indexer, IndexerCommand},
    utils::{future_block_on, Context},
};
use chainhook_postgres::{pg_pool, pg_pool_client};
use chainhook_types::BlockIdentifier;
use config::Config;
use db::{
    blocks::{self, open_blocks_db_with_retry},
    migrate_dbs,
};
use deadpool_postgres::Pool;
use utils::monitoring::PrometheusMonitoring;

#[macro_use]
extern crate hiro_system_kit;

#[macro_use]
extern crate serde_derive;

#[macro_use]
extern crate lazy_static;

extern crate serde;

pub mod core;
pub mod db;
pub mod utils;

#[derive(Debug, Clone)]
pub struct PgConnectionPools {
    pub ordinals: Pool,
    pub brc20: Option<Pool>,
}

fn pg_pools(config: &Config) -> PgConnectionPools {
    PgConnectionPools {
        ordinals: pg_pool(&config.ordinals.as_ref().unwrap().db).unwrap(),
        brc20: config
            .ordinals_brc20_config()
            .map(|brc20| pg_pool(&brc20.db).unwrap()),
    }
}

async fn new_ordinals_indexer_runloop(
    prometheus: &PrometheusMonitoring,
    config: &Config,
    ctx: &Context,
) -> Result<Indexer, String> {
    let (commands_tx, commands_rx) = crossbeam_channel::unbounded::<IndexerCommand>();
    let pg_pools = pg_pools(config);

    let config_moved = config.clone();
    let ctx_moved = ctx.clone();
    let pg_pools_moved = pg_pools.clone();
    let prometheus_moved = prometheus.clone();
    let handle: JoinHandle<()> = hiro_system_kit::thread_named("ordinals_indexer")
        .spawn(move || {
            future_block_on(&ctx_moved.clone(), async move {
                let cache_l2 = Arc::new(new_traversals_lazy_cache(2048));
                let garbage_collect_every_n_blocks = 100;
                let mut garbage_collect_nth_block = 0;

                let mut sequence_cursor = SequenceCursor::new();
                let mut brc20_cache: Option<core::meta_protocols::brc20::cache::Brc20MemoryCache> =
                    brc20_new_cache(&config_moved);
                loop {
                    match commands_rx.recv() {
                        Ok(command) => match command {
                            IndexerCommand::StoreCompactedBlocks(blocks) => {
                                let blocks_db_rw =
                                    open_blocks_db_with_retry(true, &config_moved, &ctx_moved);
                                store_compacted_blocks(
                                    blocks,
                                    true,
                                    &blocks_db_rw,
                                    &Context::empty(),
                                );
                            }
                            IndexerCommand::IndexBlocks {
                                mut apply_blocks,
                                rollback_block_ids,
                            } => {
                                if !rollback_block_ids.is_empty() {
                                    let blocks_db_rw =
                                        open_blocks_db_with_retry(true, &config_moved, &ctx_moved);
                                    for block_id in rollback_block_ids.iter() {
                                        blocks::delete_blocks_in_block_range(
                                            block_id.index as u32,
                                            block_id.index as u32,
                                            &blocks_db_rw,
                                            &ctx_moved,
                                        );
                                        rollback_block(
                                            block_id.index,
                                            &config_moved,
                                            &pg_pools_moved,
                                            &ctx_moved,
                                        )
                                        .await?;
                                    }
                                    blocks_db_rw.flush().map_err(|e| {
                                        format!("error dropping rollback blocks from rocksdb: {e}")
                                    })?;
                                }

                                let blocks = match process_blocks(
                                    &mut apply_blocks,
                                    &mut sequence_cursor,
                                    &cache_l2,
                                    &mut brc20_cache,
                                    &prometheus_moved,
                                    &config_moved,
                                    &pg_pools_moved,
                                    &ctx_moved,
                                )
                                .await
                                {
                                    Ok(blocks) => blocks,
                                    Err(e) => return Err(format!("error indexing blocks: {e}")),
                                };

                                garbage_collect_nth_block += blocks.len();
                                if garbage_collect_nth_block > garbage_collect_every_n_blocks {
                                    try_debug!(
                                        ctx_moved,
                                        "Clearing cache L2 ({} entries)",
                                        cache_l2.len()
                                    );
                                    cache_l2.clear();
                                    garbage_collect_nth_block = 0;
                                }
                            }
                        },
                        Err(_) => todo!(),
                    }
                }
            });
        })
        .expect("unable to spawn thread");

    let ord_client = pg_pool_client(&pg_pools.ordinals).await?;
    let chain_tip = db::ordinals_pg::get_chain_tip(&ord_client).await?;
    Ok(Indexer {
        commands_tx,
        chain_tip,
        thread_handle: handle,
    })
}

pub async fn get_chain_tip(config: &Config) -> Result<BlockIdentifier, String> {
    let pool = pg_pool(&config.ordinals.as_ref().unwrap().db).unwrap();
    let ord_client = pg_pool_client(&pool).await?;
    Ok(db::ordinals_pg::get_chain_tip(&ord_client).await?.unwrap())
}

pub async fn rollback_block_range(
    start_block: u64,
    end_block: u64,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let blocks_db_rw = open_blocks_db_with_retry(true, config, ctx);
    let pg_pools = pg_pools(config);
    blocks::delete_blocks_in_block_range(start_block as u32, end_block as u32, &blocks_db_rw, ctx);
    for block in start_block..=end_block {
        rollback_block(block, config, &pg_pools, ctx).await?;
    }
    blocks_db_rw
        .flush()
        .map_err(|e| format!("error dropping rollback blocks from rocksdb: {e}"))
}

/// Starts the ordinals indexing process. Will block the main thread indefinitely until explicitly stopped or it reaches chain tip
/// and `stream_blocks_at_chain_tip` is set to false.
pub async fn start_ordinals_indexer(
    stream_blocks_at_chain_tip: bool,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    migrate_dbs(config, ctx).await?;

    let indexer = new_ordinals_indexer_runloop(&PrometheusMonitoring::new(), config, ctx).await?;
    start_bitcoin_indexer(
        &indexer,
        first_inscription_height(config),
        stream_blocks_at_chain_tip,
        true,
        config,
        ctx,
    )
    .await
}
