use std::thread::JoinHandle;

use bitcoind::{
    indexer::{start_bitcoin_indexer, Indexer, IndexerCommand},
    types::BlockIdentifier,
    utils::{future_block_on, Context},
};
use config::Config;
use db::{
    cache::index_cache::IndexCache,
    index::{get_rune_genesis_block_height, index_block, roll_back_block},
    pg_connect,
};

extern crate serde;

pub mod db;

async fn new_runes_indexer_runloop(config: &Config, ctx: &Context) -> Result<Indexer, String> {
    let (commands_tx, commands_rx) = crossbeam_channel::unbounded::<IndexerCommand>();

    let config_moved = config.clone();
    let ctx_moved = ctx.clone();
    let handle: JoinHandle<()> = hiro_system_kit::thread_named("runes_indexer")
        .spawn(move || {
            future_block_on(&ctx_moved.clone(), async move {
                let mut index_cache = IndexCache::new(
                    &config_moved,
                    &mut pg_connect(&config_moved, false, &ctx_moved).await,
                    &ctx_moved,
                )
                .await;
                loop {
                    match commands_rx.recv() {
                        Ok(command) => match command {
                            IndexerCommand::StoreCompactedBlocks(_) => {
                                // No-op
                            }
                            IndexerCommand::IndexBlocks {
                                mut apply_blocks,
                                rollback_block_ids,
                            } => {
                                let mut pg_client =
                                    pg_connect(&config_moved, false, &ctx_moved).await;
                                for block_id in rollback_block_ids.iter() {
                                    roll_back_block(&mut pg_client, block_id.index, &ctx_moved)
                                        .await;
                                }
                                for block in apply_blocks.iter_mut() {
                                    index_block(
                                        &mut pg_client,
                                        &mut index_cache,
                                        block,
                                        &ctx_moved,
                                    )
                                    .await;
                                }
                            }
                        },
                        Err(_) => todo!(),
                    }
                }
            });
        })
        .expect("unable to spawn thread");

    let mut pg_client = pg_connect(config, false, ctx).await;
    let chain_tip = db::get_chain_tip(&mut pg_client, ctx)
        .await
        .unwrap_or(BlockIdentifier {
            index: get_rune_genesis_block_height(config.bitcoind.network) - 1,
            hash: "0x0000000000000000000000000000000000000000000000000000000000000000".into(),
        });
    Ok(Indexer {
        commands_tx,
        chain_tip: Some(chain_tip),
        thread_handle: handle,
    })
}

pub async fn get_chain_tip(config: &Config, ctx: &Context) -> Result<BlockIdentifier, String> {
    let mut pg_client = pg_connect(config, false, ctx).await;
    Ok(db::get_chain_tip(&mut pg_client, ctx).await.unwrap())
}

pub async fn rollback_block_range(
    start_block: u64,
    end_block: u64,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let mut pg_client = pg_connect(config, false, ctx).await;
    for block_id in start_block..=end_block {
        roll_back_block(&mut pg_client, block_id, ctx).await;
    }
    Ok(())
}

/// Starts the runes indexing process. Will block the main thread indefinitely until explicitly stopped or it reaches chain tip
/// and `stream_blocks_at_chain_tip` is set to false.
pub async fn start_runes_indexer(
    stream_blocks_at_chain_tip: bool,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    pg_connect(config, true, ctx).await;

    let indexer = new_runes_indexer_runloop(config, ctx).await?;
    start_bitcoin_indexer(
        &indexer,
        get_rune_genesis_block_height(config.bitcoind.network),
        stream_blocks_at_chain_tip,
        false,
        config,
        ctx,
    )
    .await
}
