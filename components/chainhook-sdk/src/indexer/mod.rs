pub mod bitcoin;
pub mod chain_segment;
pub mod fork_scratch_pad;

use std::{
    collections::{HashMap, VecDeque},
    sync::{Arc, Mutex},
    thread::{sleep, JoinHandle},
    time::Duration,
};

use crate::{
    try_crit, try_debug, try_info,
    utils::{
        bitcoind::{bitcoind_get_chain_tip, bitcoind_wait_for_chain_tip},
        AbstractBlock, BlockHeights, Context,
    },
};

use bitcoin::{
    build_http_client, download_and_parse_block_with_retry,
    pipeline::{
        start_block_download_pipeline, BlockDownloadCommand, BlockDownloadProcessor,
        BlockDownloadProcessorEvent,
    },
    standardize_bitcoin_block,
};
use chainhook_types::{
    BitcoinBlockData, BitcoinNetwork, BlockIdentifier, BlockchainEvent,
};
use config::Config;
use crossbeam_channel::{Sender, TryRecvError};
use reqwest::Client;

use self::fork_scratch_pad::ForkScratchPad;

pub struct BlockBundle {
    pub apply_blocks: Vec<BitcoinBlockData>,
    pub rollback_block_ids: Vec<BlockIdentifier>,
}

pub enum IndexerCommand {
    StoreCompactedBlocks(Vec<(u64, Vec<u8>)>),
    IndexBlocks(BlockBundle),
}

pub struct Indexer {
    pub commands_tx: crossbeam_channel::Sender<IndexerCommand>,
}

/// Moves our block pool with a newly received standardized block
async fn advance_block_pool(
    block: BitcoinBlockData,
    block_pool: &Arc<Mutex<ForkScratchPad>>,
    block_store: &Arc<Mutex<HashMap<BlockIdentifier, BitcoinBlockData>>>,
    http_client: &Client,
    indexer_commands_tx: &Sender<IndexerCommand>,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let network = BitcoinNetwork::from_network(config.bitcoind.network);
    let mut block_ids = VecDeque::new();
    block_ids.push_front(block.block_identifier.clone());

    let block_pool_ref = block_pool.clone();
    let mut pool = block_pool_ref.lock().unwrap();

    let block_store_ref = block_store.clone();
    let mut block_store_obj = block_store_ref.lock().unwrap();
    block_store_obj.insert(block.block_identifier.clone(), block);

    while let Some(block_id) = block_ids.pop_front() {
        let block = block_store_obj.get(&block_id).unwrap();
        let header = block.get_header();
        if pool.can_process_header(&header) {
            match pool.process_header(header, ctx)? {
                Some(event) => match event {
                    BlockchainEvent::BlockchainUpdatedWithHeaders(event) => {
                        let mut apply_blocks = vec![];
                        for header in event.new_headers.iter() {
                            apply_blocks
                                .push(block_store_obj.remove(&header.block_identifier).unwrap());
                        }
                        indexer_commands_tx
                            .send(IndexerCommand::IndexBlocks(BlockBundle {
                                apply_blocks,
                                rollback_block_ids: vec![],
                            }))
                            .map_err(|e| e.to_string())?;
                    }
                    BlockchainEvent::BlockchainUpdatedWithReorg(event) => {
                        let mut apply_blocks = vec![];
                        for header in event.headers_to_apply.iter() {
                            apply_blocks
                                .push(block_store_obj.remove(&header.block_identifier).unwrap());
                        }
                        let rollback_block_ids: Vec<BlockIdentifier> = event
                            .headers_to_rollback
                            .iter()
                            .map(|h| h.block_identifier.clone())
                            .collect();
                        indexer_commands_tx
                            .send(IndexerCommand::IndexBlocks(BlockBundle {
                                apply_blocks,
                                rollback_block_ids,
                            }))
                            .map_err(|e| e.to_string())?;
                    }
                },
                None => {
                    // try_warn!(ctx, "zmq: Unable to append block");
                }
            };
        } else {
            // Handle a behaviour specific to ZMQ usage in bitcoind.
            // Considering a simple re-org:
            // A (1) - B1 (2) - C1 (3)
            //       \ B2 (4) - C2 (5) - D2 (6)
            // When D2 is being discovered (making A -> B2 -> C2 -> D2 the new canonical fork)
            // it looks like ZMQ is only publishing D2.
            // Without additional operation, we end up with a block that we can't append.
            let parent_block_hash = header
                .parent_block_identifier
                .get_hash_bytes_str()
                .to_string();
            // try_info!(
            //     ctx,
            //     "zmq: Re-org detected, retrieving parent block {parent_block_hash}"
            // );
            let parent_block = download_and_parse_block_with_retry(
                &http_client,
                &parent_block_hash,
                &config.bitcoind,
                ctx,
            )
            .await?;
            let parent_block =
                standardize_bitcoin_block(parent_block, &network, ctx).map_err(|(e, _)| e)?;

            block_ids.push_front(block_id);
            block_ids.push_front(parent_block.block_identifier.clone());
            block_store_obj.insert(parent_block.block_identifier.clone(), parent_block);
        }
    }
    Ok(())
}

/// Initialize our block pool with the current index's last seen block, so we can detect any re-orgs or gaps that may come our
/// way with the next blocks.
async fn prime_block_pool(
    block_pool: &Arc<Mutex<ForkScratchPad>>,
    index_chain_tip: &BlockIdentifier,
    http_client: &Client,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let last_block = download_and_parse_block_with_retry(
        http_client,
        index_chain_tip.get_hash_bytes_str(),
        &config.bitcoind,
        ctx,
    )
    .await?;
    let block_pool_ref = block_pool.clone();
    let mut pool = block_pool_ref.lock().unwrap();
    match pool.process_header(last_block.get_block_header(), ctx) {
        Ok(_) => {
            try_debug!(
                ctx,
                "Primed fork processor with last seen block hash {index_chain_tip}"
            );
        }
        Err(e) => return Err(format!("Unable to load last seen block: {e}")),
    }
    Ok(())
}

/// Starts a bitcoind block download pipeline that will send us all historical bitcoin blocks in a parallel fashion. We will then
/// stream these blocks into our block pool so they can be fed into the configured indexer. This will eventually bring the index
/// chain tip to `target_block_height`.
async fn sync_to_block_height(
    indexer: &Indexer,
    block_pool: &Arc<Mutex<ForkScratchPad>>,
    block_store: &Arc<Mutex<HashMap<BlockIdentifier, BitcoinBlockData>>>,
    http_client: &Client,
    target_block_height: u64,
    sequence_start_block_height: u64,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let (commands_tx, commands_rx) = crossbeam_channel::bounded::<BlockDownloadCommand>(2);
    let (events_tx, events_rx) = crossbeam_channel::unbounded::<BlockDownloadProcessorEvent>();

    let ctx_moved = ctx.clone();
    let config_moved = config.clone();
    let block_pool_moved = block_pool.clone();
    let block_store_moved = block_store.clone();
    let http_client_moved = http_client.clone();
    let indexer_commands_tx_moved = indexer.commands_tx.clone();

    let handle: JoinHandle<()> = hiro_system_kit::thread_named("block_download_processor")
        .spawn(move || {
            hiro_system_kit::nestable_block_on(async move {
                let mut empty_cycles = 0;
                loop {
                    let (compacted_blocks, blocks) = match commands_rx.try_recv() {
                        Ok(BlockDownloadCommand::ProcessDownloadedBlocks(
                            compacted_blocks,
                            blocks,
                        )) => {
                            empty_cycles = 0;
                            (compacted_blocks, blocks)
                        }
                        Ok(BlockDownloadCommand::Terminate) => {
                            let _ = events_tx.send(BlockDownloadProcessorEvent::Terminated);
                            break;
                        }
                        Err(e) => match e {
                            TryRecvError::Empty => {
                                empty_cycles += 1;
                                if empty_cycles == 180 {
                                    try_info!(&ctx_moved, "Block processor reached expiration");
                                    let _ = events_tx.send(BlockDownloadProcessorEvent::Expired);
                                    break;
                                }
                                sleep(Duration::from_secs(1));
                                continue;
                            }
                            _ => {
                                break;
                            }
                        },
                    };

                    if !compacted_blocks.is_empty() {
                        let _ = indexer_commands_tx_moved
                            .send(IndexerCommand::StoreCompactedBlocks(compacted_blocks));
                    }
                    for block in blocks.into_iter() {
                        if let Err(e) = advance_block_pool(
                            block,
                            &block_pool_moved,
                            &block_store_moved,
                            &http_client_moved,
                            &indexer_commands_tx_moved,
                            &config_moved,
                            &ctx_moved,
                        )
                        .await
                        {
                            try_crit!(ctx_moved, "Error indexing blocks: {e}");
                            std::process::exit(1);
                        };
                    }
                }
            });
        })
        .expect("unable to spawn thread");
    let processor = BlockDownloadProcessor {
        commands_tx,
        events_rx,
        thread_handle: handle,
    };

    let blocks = {
        let block_pool_ref = block_pool.clone();
        let pool = block_pool_ref.lock().unwrap();
        let start_block = pool.canonical_chain_tip().unwrap().index;
        BlockHeights::BlockRange(start_block, target_block_height)
            .get_sorted_entries()
            .map_err(|_e| format!("Block start / end block spec invalid"))?
    };
    start_block_download_pipeline(
        config,
        http_client,
        blocks.into(),
        sequence_start_block_height,
        &processor,
        1000,
        ctx,
    )
    .await
}

pub async fn start(
    indexer: &Indexer,
    index_chain_tip: &BlockIdentifier,
    sequence_start_block_height: u64,
    stop_at_chain_tip: bool,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let mut bitcoind_chain_tip = bitcoind_wait_for_chain_tip(&config.bitcoind, ctx);

    try_info!(ctx, "Index chain tip is at {index_chain_tip}");
    let http_client = build_http_client();

    // Block pool that will track the canonical chain and detect any reorgs that may happen.
    let block_pool_arc = Arc::new(Mutex::new(ForkScratchPad::new()));
    let block_pool = block_pool_arc.clone();
    prime_block_pool(&block_pool_arc, index_chain_tip, &http_client, config, ctx).await?;

    // Block cache that will keep block data in memory while it is prepared to be sent to indexers.
    let block_store_arc = Arc::new(Mutex::new(HashMap::new()));

    loop {
        {
            let pool = block_pool.lock().unwrap();
            if bitcoind_chain_tip == *pool.canonical_chain_tip().unwrap() {
                try_info!(
                    ctx,
                    "Index has reached bitcoind chain tip at {bitcoind_chain_tip}"
                );
                break;
            }
        }
        sync_to_block_height(
            indexer,
            &block_pool_arc,
            &block_store_arc,
            &http_client,
            bitcoind_chain_tip.index,
            sequence_start_block_height,
            config,
            ctx,
        )
        .await?;
        // Bitcoind may have advanced while we were indexing, check its chain tip again.
        bitcoind_chain_tip = bitcoind_get_chain_tip(&config.bitcoind, ctx);
    }

    if !stop_at_chain_tip {
        // zmq
    }

    Ok(())
}

#[cfg(test)]
pub mod tests;
