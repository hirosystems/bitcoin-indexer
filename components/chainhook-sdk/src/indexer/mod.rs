pub mod bitcoin;
pub mod chain_segment;
pub mod fork_scratch_pad;

use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    thread::{sleep, JoinHandle},
    time::Duration,
};

use crate::{
    try_crit, try_debug, try_info, utils::{
        bitcoind::{bitcoind_get_chain_tip, bitcoind_wait_for_chain_tip},
        AbstractBlock, BlockHeights, Context,
    }
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
    BitcoinBlockData, BitcoinNetwork, BlockHeader, BlockIdentifier, BlockchainEvent,
};
use config::Config;
use crossbeam_channel::{Sender, TryRecvError};
use reqwest::Client;

use self::fork_scratch_pad::ForkScratchPad;

// pub struct Indexer {
//     pub config: BitcoindConfig,
//     bitcoin_blocks_pool: ForkScratchPad,
// }

// impl Indexer {
//     pub fn new(config: BitcoindConfig) -> Indexer {
//         let bitcoin_blocks_pool = ForkScratchPad::new();

//         Indexer {
//             config,
//             bitcoin_blocks_pool,
//         }
//     }

//     pub fn handle_bitcoin_header(
//         &mut self,
//         header: BlockHeader,
//         ctx: &Context,
//     ) -> Result<Option<BlockchainEvent>, String> {
//         self.bitcoin_blocks_pool.process_header(header, ctx)
//     }
// }

// pub trait Indexer {
//     async fn get_chain_tip(&self) -> Result<BlockIdentifier, String>;
//     async fn index_blocks(
//         &self,
//         config: &Config,
//         blocks: &Vec<BitcoinBlockData>,
//         rollback: &Vec<BlockIdentifier>,
//         ctx: &Context,
//     ) -> Result<(), String>;
// }

pub struct BlockBundle {
    apply_blocks: Vec<BitcoinBlockData>,
    rollback_blocks: Vec<BlockIdentifier>,
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
    block: &BitcoinBlockData,
    block_pool: &ForkScratchPad,
    block_store: &mut HashMap<BlockHeader, BitcoinBlockData>,
    http_client: &Client,
    indexer_commands_tx: &Sender<IndexerCommand>,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let network = BitcoinNetwork::from_network(config.bitcoind.network);
    let mut blocks: VecDeque<&BitcoinBlockData> = VecDeque::new();
    blocks.push_front(block);

    while let Some(block) = blocks.pop_front() {
        // let block =
        //     match download_and_parse_block_with_retry(&http_client, &block_hash, &config, ctx)
        //         .await
        //     {
        //         Ok(block) => block,
        //         Err(e) => {
        //             try_warn!(ctx, "zmq: Unable to download block: {e}");
        //             continue;
        //         }
        //     };

        // let header = block.get_block_header();
        // try_info!(ctx, "zmq: Standardizing bitcoin block #{}", block.height);
        // let _ = observer_commands_tx.send(ObserverCommand::StandardizeBitcoinBlock(block));

        let header = block.get_header();
        if block_pool.can_process_header(&header) {
            match block_pool.process_header(header, ctx)? {
                Some(event) => match event {
                    BlockchainEvent::BlockchainUpdatedWithHeaders(event) => {
                        let mut apply_blocks = vec![];
                        for header in event.new_headers.iter() {
                            // let block = block_store.insert();
                        }
                        indexer_commands_tx.send(IndexerCommand::IndexBlocks(BlockBundle {
                            apply_blocks,
                            rollback_blocks: vec![],
                        }));
                    }
                    BlockchainEvent::BlockchainUpdatedWithReorg(event) => todo!(),
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
            try_info!(
                ctx,
                "zmq: Re-org detected, retrieving parent block {parent_block_hash}"
            );
            let parent_block = download_and_parse_block_with_retry(
                &http_client,
                &parent_block_hash,
                &config.bitcoind,
                ctx,
            )
            .await?;
            let parent_block =
                standardize_bitcoin_block(parent_block, &network, ctx).map_err(|(e, _)| e)?;

            blocks.push_front(block);
            blocks.push_front(&parent_block);
        }
    }

    Ok(())
}

/// Initialize our block pool with the current index's last seen block, so we can detect any re-orgs or gaps that may come our
/// way with the next blocks.
async fn prime_block_pool(
    block_pool: &ForkScratchPad,
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
    match block_pool.process_header(last_block.get_block_header(), ctx) {
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

/// Starts a bitcoind block download pipeline and feeds blocks into an indexer.
async fn sync_to_block_height(
    indexer: &Indexer,
    block_pool: &Arc<ForkScratchPad>,
    block_store: &Arc<HashMap<BlockHeader, BitcoinBlockData>>,
    http_client: &Client,
    block_height: u64,
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
                    let (compacted_blocks, mut blocks) = match commands_rx.try_recv() {
                        Ok(BlockDownloadCommand::ProcessDownloadedBlocks(
                            compacted_blocks,
                            blocks,
                        )) => {
                            empty_cycles = 0;
                            (compacted_blocks, blocks)
                        }
                        Ok(BlockDownloadCommand::Terminate) => {
                            events_tx.send(BlockDownloadProcessorEvent::Terminated);
                            break;
                        }
                        Err(e) => match e {
                            TryRecvError::Empty => {
                                empty_cycles += 1;
                                if empty_cycles == 180 {
                                    try_info!(&ctx_moved, "Block processor reached expiration");
                                    events_tx.send(BlockDownloadProcessorEvent::Expired);
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
                        indexer_commands_tx_moved
                            .send(IndexerCommand::StoreCompactedBlocks(compacted_blocks));
                    }
                    for block in blocks.iter() {
                        if let Err(e) = advance_block_pool(
                            block,
                            &block_pool_moved,
                            &mut block_store_moved,
                            &http_client_moved,
                            &indexer_commands_tx_moved,
                            &config_moved,
                            &ctx_moved,
                        )
                        .await
                        {
                            try_crit!(ctx, "Error indexing blocks: {e}");
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

    let start_block = block_pool.canonical_chain_tip().unwrap().index;
    let blocks = BlockHeights::BlockRange(start_block, block_height)
        .get_sorted_entries()
        .map_err(|_e| format!("Block start / end block spec invalid"))?;
    start_block_download_pipeline(
        config,
        http_client,
        blocks.into(),
        sequence_start_block_height,
        &processor,
        1000,
        &ctx_moved,
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
    let block_pool = ForkScratchPad::new();
    let block_store = HashMap::new();
    let http_client = build_http_client();
    prime_block_pool(&block_pool, index_chain_tip, &http_client, config, ctx).await?;

    let block_pool_arc = Arc::new(block_pool);
    let block_store_arc = Arc::new(block_store);
    loop {
        if bitcoind_chain_tip == *block_pool.canonical_chain_tip().unwrap() {
            try_info!(
                ctx,
                "Index has reached bitcoind chain tip at {bitcoind_chain_tip}"
            );
            break;
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
