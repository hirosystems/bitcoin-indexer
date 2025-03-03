mod zmq;

use std::{
    collections::HashMap,
    error::Error,
    str,
    sync::mpsc::{Receiver, Sender},
};

use chainhook_types::{
    BitcoinBlockData, BitcoinChainEvent, BitcoinChainUpdatedWithBlocksData,
    BitcoinChainUpdatedWithReorgData, BitcoinNetwork, BlockIdentifier, BlockchainEvent,
};
use config::BitcoindConfig;
use hiro_system_kit::{self, slog};
use rocket::{serde::Deserialize, Shutdown};

use crate::{
    indexer::bitcoin::{
        build_http_client, download_and_parse_block_with_retry, standardize_bitcoin_block,
        BitcoinBlockFullBreakdown,
    },
    utils::Context,
};

#[derive(Deserialize)]
pub struct NewTransaction {
    pub txid: String,
    pub status: String,
    pub raw_result: String,
    pub raw_tx: String,
}

#[derive(Clone, Debug)]
pub enum Event {
    BitcoinChainEvent(BitcoinChainEvent),
}

#[derive(Clone, Debug, PartialEq)]
pub enum ObserverCommand {
    StandardizeBitcoinBlock(BitcoinBlockFullBreakdown),
    CacheBitcoinBlock(BitcoinBlockData),
    PropagateBitcoinChainEvent(BlockchainEvent),
    Terminate,
}

#[derive(Clone, Debug, PartialEq)]
pub struct HookExpirationData {
    pub hook_uuid: String,
    pub block_height: u64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct MempoolAdmissionData {
    pub tx_data: String,
    pub tx_description: String,
}

#[derive(Clone, Debug)]
pub enum ObserverEvent {
    Error(String),
    Fatal(String),
    Info(String),
    Terminate,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
/// JSONRPC Request
pub struct BitcoinRPCRequest {
    /// The name of the RPC call
    pub method: String,
    /// Parameters to the RPC call
    pub params: serde_json::Value,
    /// Identifier for this Request, which should appear in the response
    pub id: serde_json::Value,
    /// jsonrpc field, MUST be "2.0"
    pub jsonrpc: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct BitcoinBlockDataCached {
    pub block: BitcoinBlockData,
    pub processed_by_sidecar: bool,
}

pub struct ObserverSidecar {
    pub bitcoin_blocks_mutator: Option<(
        crossbeam_channel::Sender<(Vec<BitcoinBlockDataCached>, Vec<BlockIdentifier>)>,
        crossbeam_channel::Receiver<Vec<BitcoinBlockDataCached>>,
    )>,
    pub bitcoin_chain_event_notifier: Option<crossbeam_channel::Sender<HandleBlock>>,
}

impl ObserverSidecar {
    fn perform_bitcoin_sidecar_mutations(
        &self,
        blocks: Vec<BitcoinBlockDataCached>,
        blocks_ids_to_rollback: Vec<BlockIdentifier>,
        ctx: &Context,
    ) -> Vec<BitcoinBlockDataCached> {
        if let Some(ref block_mutator) = self.bitcoin_blocks_mutator {
            ctx.try_log(|logger| slog::info!(logger, "Sending blocks to pre-processor",));
            let _ = block_mutator
                .0
                .send((blocks.clone(), blocks_ids_to_rollback));
            ctx.try_log(|logger| slog::info!(logger, "Waiting for blocks from pre-processor",));
            match block_mutator.1.recv() {
                Ok(updated_blocks) => {
                    ctx.try_log(|logger| slog::info!(logger, "Block received from pre-processor",));
                    updated_blocks
                }
                Err(e) => {
                    ctx.try_log(|logger| {
                        slog::error!(
                            logger,
                            "Unable to receive block from pre-processor {}",
                            e.to_string()
                        )
                    });
                    blocks
                }
            }
        } else {
            blocks
        }
    }

    fn notify_chain_event(&self, chain_event: &BitcoinChainEvent, _ctx: &Context) {
        if let Some(ref notifier) = self.bitcoin_chain_event_notifier {
            match chain_event {
                BitcoinChainEvent::ChainUpdatedWithBlocks(data) => {
                    for block in data.new_blocks.iter() {
                        let _ = notifier.send(HandleBlock::ApplyBlock(block.clone()));
                    }
                }
                BitcoinChainEvent::ChainUpdatedWithReorg(data) => {
                    for block in data.blocks_to_rollback.iter() {
                        let _ = notifier.send(HandleBlock::UndoBlock(block.clone()));
                    }
                    for block in data.blocks_to_apply.iter() {
                        let _ = notifier.send(HandleBlock::ApplyBlock(block.clone()));
                    }
                }
            }
        }
    }
}

/// A helper struct used to configure and call [start_event_observer], which spawns a thread to observer chain events.
///
/// ### Examples
/// ```
/// use chainhook_sdk::observer::EventObserverBuilder;
/// use chainhook_sdk::observer::ObserverCommand;
/// use chainhook_sdk::utils::Context;
/// use config::BitcoindConfig;
/// use std::error::Error;
/// use std::sync::mpsc::{Receiver, Sender};
///
/// fn start_event_observer(
///     config: BitcoindConfig,
///     observer_commands_tx: &Sender<ObserverCommand>,
///     observer_commands_rx: Receiver<ObserverCommand>,
///     ctx: &Context,
/// )-> Result<(), Box<dyn Error>> {
///     EventObserverBuilder::new(
///         config,
///         &observer_commands_tx,
///         observer_commands_rx,
///         &ctx
///     )
///     .start()
/// }
/// ```
pub struct EventObserverBuilder {
    config: BitcoindConfig,
    observer_commands_tx: Sender<ObserverCommand>,
    observer_commands_rx: Receiver<ObserverCommand>,
    ctx: Context,
    observer_events_tx: Option<crossbeam_channel::Sender<ObserverEvent>>,
    observer_sidecar: Option<ObserverSidecar>,
}

impl EventObserverBuilder {
    pub fn new(
        config: BitcoindConfig,
        observer_commands_tx: &Sender<ObserverCommand>,
        observer_commands_rx: Receiver<ObserverCommand>,
        ctx: &Context,
    ) -> Self {
        EventObserverBuilder {
            config,
            observer_commands_tx: observer_commands_tx.clone(),
            observer_commands_rx,
            ctx: ctx.clone(),
            observer_events_tx: None,
            observer_sidecar: None,
        }
    }

    /// Sets the `observer_events_tx` Sender. Set this and listen on the corresponding
    /// Receiver to be notified of every [ObserverEvent].
    pub fn events_tx(
        &mut self,
        observer_events_tx: crossbeam_channel::Sender<ObserverEvent>,
    ) -> &mut Self {
        self.observer_events_tx = Some(observer_events_tx);
        self
    }

    /// Sets a sidecar for the observer. See [ObserverSidecar].
    pub fn sidecar(&mut self, sidecar: ObserverSidecar) -> &mut Self {
        self.observer_sidecar = Some(sidecar);
        self
    }

    /// Starts the event observer, calling [start_event_observer]. This function consumes the
    /// [EventObserverBuilder] and spawns a new thread to run the observer.
    pub fn start(self) -> Result<(), Box<dyn Error>> {
        start_event_observer(
            self.config,
            self.observer_commands_tx,
            self.observer_commands_rx,
            self.observer_events_tx,
            self.observer_sidecar,
            self.ctx,
        )
    }
}

/// Spawns a thread to observe blockchain events. Use [EventObserverBuilder] to configure easily.
pub fn start_event_observer(
    config: BitcoindConfig,
    observer_commands_tx: Sender<ObserverCommand>,
    observer_commands_rx: Receiver<ObserverCommand>,
    observer_events_tx: Option<crossbeam_channel::Sender<ObserverEvent>>,
    observer_sidecar: Option<ObserverSidecar>,
    ctx: Context,
) -> Result<(), Box<dyn Error>> {
    ctx.try_log(|logger| {
        slog::info!(
            logger,
            "Observing Bitcoin chain events via ZeroMQ: {}",
            config.zmq_url
        )
    });
    let context_cloned = ctx.clone();
    let event_observer_config_moved = config.clone();
    let observer_commands_tx_moved = observer_commands_tx.clone();
    let _ = hiro_system_kit::thread_named("Chainhook event observer")
        .spawn(move || {
            let future = start_bitcoin_event_observer(
                event_observer_config_moved,
                observer_commands_tx_moved,
                observer_commands_rx,
                observer_events_tx.clone(),
                observer_sidecar,
                context_cloned.clone(),
            );
            match hiro_system_kit::nestable_block_on(future) {
                Ok(_) => {}
                Err(e) => {
                    if let Some(tx) = observer_events_tx {
                        context_cloned.try_log(|logger| {
                            slog::crit!(
                                logger,
                                "Chainhook event observer thread failed with error: {e}",
                            )
                        });
                        let _ = tx.send(ObserverEvent::Terminate);
                    }
                }
            }
        })
        .expect("unable to spawn thread");
    Ok(())
}

pub async fn start_bitcoin_event_observer(
    config: BitcoindConfig,
    _observer_commands_tx: Sender<ObserverCommand>,
    observer_commands_rx: Receiver<ObserverCommand>,
    observer_events_tx: Option<crossbeam_channel::Sender<ObserverEvent>>,
    observer_sidecar: Option<ObserverSidecar>,
    ctx: Context,
) -> Result<(), Box<dyn Error>> {
    let ctx_moved = ctx.clone();
    let config_moved = config.clone();
    let _ = hiro_system_kit::thread_named("ZMQ handler").spawn(move || {
        let future = zmq::start_zeromq_runloop(&config_moved, _observer_commands_tx, &ctx_moved);
        hiro_system_kit::nestable_block_on(future);
    });

    // This loop is used for handling background jobs, emitted by HTTP calls.
    start_observer_commands_handler(
        config,
        observer_commands_rx,
        observer_events_tx,
        None,
        observer_sidecar,
        ctx,
    )
    .await
}

pub enum HandleBlock {
    ApplyBlock(BitcoinBlockData),
    UndoBlock(BitcoinBlockData),
}

pub async fn start_observer_commands_handler(
    config: BitcoindConfig,
    observer_commands_rx: Receiver<ObserverCommand>,
    observer_events_tx: Option<crossbeam_channel::Sender<ObserverEvent>>,
    ingestion_shutdown: Option<Shutdown>,
    observer_sidecar: Option<ObserverSidecar>,
    ctx: Context,
) -> Result<(), Box<dyn Error>> {
    let mut bitcoin_block_store: HashMap<BlockIdentifier, BitcoinBlockDataCached> = HashMap::new();
    let http_client = build_http_client();
    let store_update_required = observer_sidecar
        .as_ref()
        .and_then(|s| s.bitcoin_blocks_mutator.as_ref())
        .is_some();

    loop {
        let command = match observer_commands_rx.recv() {
            Ok(cmd) => cmd,
            Err(e) => {
                ctx.try_log(|logger| {
                    slog::crit!(logger, "Error: broken channel {}", e.to_string())
                });
                break;
            }
        };
        match command {
            ObserverCommand::Terminate => {
                break;
            }
            ObserverCommand::StandardizeBitcoinBlock(mut block_data) => {
                let block_hash = block_data.hash.to_string();
                let mut attempts = 0;
                let max_attempts = 10;
                let block = loop {
                    match standardize_bitcoin_block(
                        block_data.clone(),
                        &BitcoinNetwork::from_network(config.network),
                        &ctx,
                    ) {
                        Ok(block) => break Some(block),
                        Err((e, refetch_block)) => {
                            attempts += 1;
                            if attempts > max_attempts {
                                break None;
                            }
                            ctx.try_log(|logger| {
                                slog::warn!(logger, "Error standardizing block: {}", e)
                            });
                            if refetch_block {
                                block_data = match download_and_parse_block_with_retry(
                                    &http_client,
                                    &block_hash,
                                    &config,
                                    &ctx,
                                )
                                .await
                                {
                                    Ok(block) => block,
                                    Err(e) => {
                                        ctx.try_log(|logger| {
                                            slog::warn!(
                                                logger,
                                                "unable to download_and_parse_block: {}",
                                                e.to_string()
                                            )
                                        });
                                        continue;
                                    }
                                };
                            }
                        }
                    };
                };
                let Some(block) = block else {
                    ctx.try_log(|logger| {
                        slog::crit!(
                            logger,
                            "Could not process bitcoin block after {} attempts.",
                            attempts
                        )
                    });
                    break;
                };

                bitcoin_block_store.insert(
                    block.block_identifier.clone(),
                    BitcoinBlockDataCached {
                        block,
                        processed_by_sidecar: false,
                    },
                );
            }
            ObserverCommand::CacheBitcoinBlock(block) => {
                bitcoin_block_store.insert(
                    block.block_identifier.clone(),
                    BitcoinBlockDataCached {
                        block,
                        processed_by_sidecar: false,
                    },
                );
            }
            ObserverCommand::PropagateBitcoinChainEvent(blockchain_event) => {
                ctx.try_log(|logger| {
                    slog::info!(logger, "Handling PropagateBitcoinChainEvent command")
                });
                let mut confirmed_blocks = vec![];

                // Update Chain event before propagation
                let (chain_event, _) = match blockchain_event {
                    BlockchainEvent::BlockchainUpdatedWithHeaders(data) => {
                        let mut blocks_to_mutate = vec![];
                        let mut new_blocks = vec![];
                        let mut new_tip = 0;

                        for header in data.new_headers.iter() {
                            if header.block_identifier.index > new_tip {
                                new_tip = header.block_identifier.index;
                            }

                            if store_update_required {
                                let Some(block) =
                                    bitcoin_block_store.remove(&header.block_identifier)
                                else {
                                    continue;
                                };
                                blocks_to_mutate.push(block);
                            } else {
                                let Some(cache) = bitcoin_block_store.get(&header.block_identifier)
                                else {
                                    continue;
                                };
                                new_blocks.push(cache.block.clone());
                            };
                        }

                        if let Some(ref sidecar) = observer_sidecar {
                            let updated_blocks = sidecar.perform_bitcoin_sidecar_mutations(
                                blocks_to_mutate,
                                vec![],
                                &ctx,
                            );
                            for cache in updated_blocks.into_iter() {
                                bitcoin_block_store
                                    .insert(cache.block.block_identifier.clone(), cache.clone());
                                new_blocks.push(cache.block);
                            }
                        }

                        for header in data.confirmed_headers.iter() {
                            match bitcoin_block_store.remove(&header.block_identifier) {
                                Some(res) => {
                                    confirmed_blocks.push(res.block);
                                }
                                None => {
                                    ctx.try_log(|logger| {
                                        slog::error!(
                                            logger,
                                            "Unable to retrieve confirmed bitcoin block {}",
                                            header.block_identifier
                                        )
                                    });
                                }
                            }
                        }

                        (
                            BitcoinChainEvent::ChainUpdatedWithBlocks(
                                BitcoinChainUpdatedWithBlocksData {
                                    new_blocks,
                                    confirmed_blocks: confirmed_blocks.clone(),
                                },
                            ),
                            new_tip,
                        )
                    }
                    BlockchainEvent::BlockchainUpdatedWithReorg(data) => {
                        let mut blocks_to_rollback = vec![];

                        let mut blocks_to_mutate = vec![];
                        let mut blocks_to_apply = vec![];
                        let mut new_tip = 0;

                        for header in data.headers_to_apply.iter() {
                            if header.block_identifier.index > new_tip {
                                new_tip = header.block_identifier.index;
                            }

                            if store_update_required {
                                let Some(block) =
                                    bitcoin_block_store.remove(&header.block_identifier)
                                else {
                                    continue;
                                };
                                blocks_to_mutate.push(block);
                            } else {
                                let Some(cache) = bitcoin_block_store.get(&header.block_identifier)
                                else {
                                    continue;
                                };
                                blocks_to_apply.push(cache.block.clone());
                            };
                        }

                        let mut blocks_ids_to_rollback: Vec<BlockIdentifier> = vec![];

                        for header in data.headers_to_rollback.iter() {
                            match bitcoin_block_store.get(&header.block_identifier) {
                                Some(cache) => {
                                    blocks_ids_to_rollback.push(header.block_identifier.clone());
                                    blocks_to_rollback.push(cache.block.clone());
                                }
                                None => {
                                    ctx.try_log(|logger| {
                                        slog::error!(
                                            logger,
                                            "Unable to retrieve bitcoin block {}",
                                            header.block_identifier
                                        )
                                    });
                                }
                            }
                        }

                        if let Some(ref sidecar) = observer_sidecar {
                            let updated_blocks = sidecar.perform_bitcoin_sidecar_mutations(
                                blocks_to_mutate,
                                blocks_ids_to_rollback,
                                &ctx,
                            );
                            for cache in updated_blocks.into_iter() {
                                bitcoin_block_store
                                    .insert(cache.block.block_identifier.clone(), cache.clone());
                                blocks_to_apply.push(cache.block);
                            }
                        }

                        for header in data.confirmed_headers.iter() {
                            match bitcoin_block_store.remove(&header.block_identifier) {
                                Some(res) => {
                                    confirmed_blocks.push(res.block);
                                }
                                None => {
                                    ctx.try_log(|logger| {
                                        slog::error!(
                                            logger,
                                            "Unable to retrieve confirmed bitcoin block {}",
                                            header.block_identifier
                                        )
                                    });
                                }
                            }
                        }

                        (
                            BitcoinChainEvent::ChainUpdatedWithReorg(
                                BitcoinChainUpdatedWithReorgData {
                                    blocks_to_apply,
                                    blocks_to_rollback,
                                    confirmed_blocks: confirmed_blocks.clone(),
                                },
                            ),
                            new_tip,
                        )
                    }
                };

                if let Some(ref sidecar) = observer_sidecar {
                    sidecar.notify_chain_event(&chain_event, &ctx)
                }
            }
        }
    }
    terminate(ingestion_shutdown, observer_events_tx, &ctx);
    Ok(())
}

fn terminate(
    ingestion_shutdown: Option<Shutdown>,
    observer_events_tx: Option<crossbeam_channel::Sender<ObserverEvent>>,
    ctx: &Context,
) {
    ctx.try_log(|logger| slog::info!(logger, "Handling Termination command"));
    if let Some(ingestion_shutdown) = ingestion_shutdown {
        ingestion_shutdown.notify();
    }
    if let Some(ref tx) = observer_events_tx {
        let _ = tx.send(ObserverEvent::Info("Terminating event observer".into()));
        let _ = tx.send(ObserverEvent::Terminate);
    }
}
