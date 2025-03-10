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

use chainhook_postgres::{pg_pool, pg_pool_client};
use chainhook_sdk::{indexer::IndexerCommand, utils::Context};
use chainhook_sdk::{
    indexer::{start_bitcoin_indexer, Indexer},
    utils::future_block_on,
};
use config::Config;
use db::{
    blocks::{self, open_blocks_db_with_retry},
    migrate_dbs,
    ordinals_pg::get_chain_tip,
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

async fn new_ordinals_indexer_runloop(
    prometheus: &PrometheusMonitoring,
    config: &Config,
    ctx: &Context,
) -> Result<Indexer, String> {
    let (commands_tx, commands_rx) = crossbeam_channel::unbounded::<IndexerCommand>();
    let ordinals_config = config.ordinals.as_ref().unwrap();
    let pg_pools = PgConnectionPools {
        ordinals: pg_pool(&ordinals_config.db).unwrap(),
        brc20: match config.ordinals_brc20_config() {
            Some(brc20) => Some(pg_pool(&brc20.db).unwrap()),
            _ => None,
        },
    };

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
                                if rollback_block_ids.len() > 0 {
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
    let chain_tip = get_chain_tip(&ord_client).await?;
    Ok(Indexer {
        commands_tx,
        chain_tip,
        thread_handle: handle,
    })
}

pub async fn start_ordinals_indexer(
    stream_blocks_at_chain_tip: bool,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    migrate_dbs(&config, ctx).await?;

    let indexer = new_ordinals_indexer_runloop(&PrometheusMonitoring::new(), &config, ctx).await?;
    start_bitcoin_indexer(
        &indexer,
        first_inscription_height(&config),
        stream_blocks_at_chain_tip,
        &config,
        ctx,
    )
    .await
}
