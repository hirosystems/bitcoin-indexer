mod http_api;
pub mod predicates;
mod runloops;

use crate::config::{Config, PredicatesApi};
use crate::core::pipeline::download_and_pipeline_blocks;
use crate::core::pipeline::processors::block_archiving::start_block_archiving_processor;
use crate::core::pipeline::processors::inscription_indexing::process_block;
use crate::core::pipeline::processors::start_inscription_indexing_processor;
use crate::core::pipeline::processors::transfers_recomputing::start_transfers_recomputing_processor;
use crate::core::protocol::inscription_parsing::{
    get_inscriptions_revealed_in_block, parse_inscriptions_in_standardized_block,
};
use crate::core::protocol::inscription_sequencing::SequenceCursor;
use crate::core::{new_traversals_lazy_cache, should_sync_ordhook_db, should_sync_rocks_db};
use crate::db::{
    delete_data_in_ordhook_db, insert_entry_in_blocks, open_readwrite_ordhook_db_conn,
    open_readwrite_ordhook_db_conn_rocks_db, open_readwrite_ordhook_dbs,
    update_inscriptions_with_block, update_locations_with_block, LazyBlock, LazyBlockTransaction,
};
use crate::scan::bitcoin::process_block_with_predicates;
use crate::service::http_api::start_predicate_api_server;
use crate::service::predicates::{
    create_and_consolidate_chainhook_config_with_predicates, open_readwrite_predicates_db_conn,
    update_predicate_spec, update_predicate_status, PredicateStatus,
};
use crate::service::runloops::start_bitcoin_scan_runloop;

use chainhook_sdk::chainhooks::bitcoin::BitcoinChainhookOccurrencePayload;
use chainhook_sdk::chainhooks::types::{
    BitcoinChainhookSpecification, ChainhookFullSpecification, ChainhookSpecification,
};
use chainhook_sdk::observer::{
    start_event_observer, BitcoinBlockDataCached, DataHandlerEvent, EventObserverConfig,
    HandleBlock, ObserverCommand, ObserverEvent, ObserverSidecar,
};
use chainhook_sdk::types::{BitcoinBlockData, BlockIdentifier};
use chainhook_sdk::utils::{BlockHeights, Context};
use crossbeam_channel::unbounded;
use crossbeam_channel::{select, Sender};
use dashmap::DashMap;
use fxhash::FxHasher;
use redis::Commands;

use std::collections::BTreeMap;
use std::hash::BuildHasherDefault;
use std::sync::mpsc::channel;
use std::sync::Arc;

pub struct Service {
    pub config: Config,
    pub ctx: Context,
}

impl Service {
    pub fn new(config: Config, ctx: Context) -> Self {
        Self { config, ctx }
    }

    pub async fn run(
        &mut self,
        predicates: Vec<ChainhookFullSpecification>,
        predicate_activity_relayer: Option<
            crossbeam_channel::Sender<BitcoinChainhookOccurrencePayload>,
        >,
    ) -> Result<(), String> {
        let mut event_observer_config = self.config.get_event_observer_config();
        let chainhook_config = create_and_consolidate_chainhook_config_with_predicates(
            predicates,
            predicate_activity_relayer.is_some(),
            &self.config,
            &self.ctx,
        );

        event_observer_config.chainhook_config = Some(chainhook_config);

        let ordhook_config = self.config.get_ordhook_config();

        // Sleep
        // std::thread::sleep(std::time::Duration::from_secs(1200));

        // Catch-up with chain tip
        self.catch_up_with_chain_tip(false, &event_observer_config)
            .await?;
        info!(
            self.ctx.expect_logger(),
            "Database up to date, service will start streaming blocks"
        );

        // Sidecar channels setup
        let observer_sidecar = self.set_up_observer_sidecar_runloop()?;

        // Create the chainhook runloop tx/rx comms
        let (observer_command_tx, observer_command_rx) = channel();
        let (observer_event_tx, observer_event_rx) = crossbeam_channel::unbounded();
        let inner_ctx = if ordhook_config.logs.chainhook_internals {
            self.ctx.clone()
        } else {
            Context::empty()
        };

        let _ = start_event_observer(
            event_observer_config,
            observer_command_tx.clone(),
            observer_command_rx,
            Some(observer_event_tx),
            Some(observer_sidecar),
            inner_ctx,
        );

        // If HTTP Predicates API is on, we start:
        // - Thread pool in charge of performing replays
        // - API server
        if self.config.is_http_api_enabled() {
            self.start_main_runloop_with_dynamic_predicates(
                &observer_command_tx,
                observer_event_rx,
                predicate_activity_relayer,
            )?;
        } else {
            self.start_main_runloop(
                &observer_command_tx,
                observer_event_rx,
                predicate_activity_relayer,
            )?;
        }
        Ok(())
    }

    pub async fn start_event_observer(
        &mut self,
        observer_sidecar: ObserverSidecar,
    ) -> Result<
        (
            std::sync::mpsc::Sender<ObserverCommand>,
            crossbeam_channel::Receiver<ObserverEvent>,
        ),
        String,
    > {
        let mut event_observer_config = self.config.get_event_observer_config();
        let chainhook_config = create_and_consolidate_chainhook_config_with_predicates(
            vec![],
            true,
            &self.config,
            &self.ctx,
        );

        event_observer_config.chainhook_config = Some(chainhook_config);

        let ordhook_config = self.config.get_ordhook_config();

        // Create the chainhook runloop tx/rx comms
        let (observer_command_tx, observer_command_rx) = channel();
        let (observer_event_tx, observer_event_rx) = crossbeam_channel::unbounded();

        let inner_ctx = if ordhook_config.logs.chainhook_internals {
            self.ctx.clone()
        } else {
            Context::empty()
        };

        let _ = start_event_observer(
            event_observer_config.clone(),
            observer_command_tx.clone(),
            observer_command_rx,
            Some(observer_event_tx),
            Some(observer_sidecar),
            inner_ctx,
        );

        Ok((observer_command_tx, observer_event_rx))
    }

    pub fn start_main_runloop(
        &self,
        _observer_command_tx: &std::sync::mpsc::Sender<ObserverCommand>,
        observer_event_rx: crossbeam_channel::Receiver<ObserverEvent>,
        predicate_activity_relayer: Option<
            crossbeam_channel::Sender<BitcoinChainhookOccurrencePayload>,
        >,
    ) -> Result<(), String> {
        loop {
            let event = match observer_event_rx.recv() {
                Ok(cmd) => cmd,
                Err(e) => {
                    error!(
                        self.ctx.expect_logger(),
                        "Error: broken channel {}",
                        e.to_string()
                    );
                    break;
                }
            };
            match event {
                ObserverEvent::BitcoinPredicateTriggered(data) => {
                    if let Some(ref tx) = predicate_activity_relayer {
                        let _ = tx.send(data);
                    }
                }
                ObserverEvent::Terminate => {
                    info!(self.ctx.expect_logger(), "Terminating runloop");
                    break;
                }
                _ => {}
            }
        }
        Ok(())
    }

    pub fn start_main_runloop_with_dynamic_predicates(
        &self,
        observer_command_tx: &std::sync::mpsc::Sender<ObserverCommand>,
        observer_event_rx: crossbeam_channel::Receiver<ObserverEvent>,
        predicate_activity_relayer: Option<
            crossbeam_channel::Sender<BitcoinChainhookOccurrencePayload>,
        >,
    ) -> Result<(), String> {
        let PredicatesApi::On(ref api_config) = self.config.http_api else {
            return Ok(());
        };

        let (bitcoin_scan_op_tx, bitcoin_scan_op_rx) = crossbeam_channel::unbounded();
        let ctx = self.ctx.clone();
        let config = self.config.clone();
        let observer_command_tx_moved = observer_command_tx.clone();
        let _ = hiro_system_kit::thread_named("Bitcoin scan runloop")
            .spawn(move || {
                start_bitcoin_scan_runloop(
                    &config,
                    bitcoin_scan_op_rx,
                    observer_command_tx_moved,
                    &ctx,
                );
            })
            .expect("unable to spawn thread");

        info!(
            self.ctx.expect_logger(),
            "Listening on port {} for chainhook predicate registrations", api_config.http_port
        );
        let ctx = self.ctx.clone();
        let api_config = api_config.clone();
        let moved_observer_command_tx = observer_command_tx.clone();
        // Test and initialize a database connection
        let _ = hiro_system_kit::thread_named("HTTP Predicate API").spawn(move || {
            let future = start_predicate_api_server(api_config, moved_observer_command_tx, ctx);
            let _ = hiro_system_kit::nestable_block_on(future);
        });

        loop {
            let event = match observer_event_rx.recv() {
                Ok(cmd) => cmd,
                Err(e) => {
                    error!(
                        self.ctx.expect_logger(),
                        "Error: broken channel {}",
                        e.to_string()
                    );
                    break;
                }
            };
            match event {
                ObserverEvent::PredicateRegistered(spec) => {
                    // If start block specified, use it.
                    // If no start block specified, depending on the nature the hook, we'd like to retrieve:
                    // - contract-id
                    if let PredicatesApi::On(ref config) = self.config.http_api {
                        let mut predicates_db_conn = match open_readwrite_predicates_db_conn(config)
                        {
                            Ok(con) => con,
                            Err(e) => {
                                error!(
                                    self.ctx.expect_logger(),
                                    "unable to register predicate: {}",
                                    e.to_string()
                                );
                                continue;
                            }
                        };
                        update_predicate_spec(
                            &spec.key(),
                            &spec,
                            &mut predicates_db_conn,
                            &self.ctx,
                        );
                        update_predicate_status(
                            &spec.key(),
                            PredicateStatus::Disabled,
                            &mut predicates_db_conn,
                            &self.ctx,
                        );
                    }
                    match spec {
                        ChainhookSpecification::Stacks(_predicate_spec) => {}
                        ChainhookSpecification::Bitcoin(predicate_spec) => {
                            let _ = bitcoin_scan_op_tx.send(predicate_spec);
                        }
                    }
                }
                ObserverEvent::PredicateEnabled(spec) => {
                    if let PredicatesApi::On(ref config) = self.config.http_api {
                        let mut predicates_db_conn = match open_readwrite_predicates_db_conn(config)
                        {
                            Ok(con) => con,
                            Err(e) => {
                                error!(
                                    self.ctx.expect_logger(),
                                    "unable to enable predicate: {}",
                                    e.to_string()
                                );
                                continue;
                            }
                        };
                        update_predicate_spec(
                            &spec.key(),
                            &spec,
                            &mut predicates_db_conn,
                            &self.ctx,
                        );
                        update_predicate_status(
                            &spec.key(),
                            PredicateStatus::InitialScanCompleted,
                            &mut predicates_db_conn,
                            &self.ctx,
                        );
                    }
                }
                ObserverEvent::PredicateDeregistered(spec) => {
                    if let PredicatesApi::On(ref config) = self.config.http_api {
                        let mut predicates_db_conn = match open_readwrite_predicates_db_conn(config)
                        {
                            Ok(con) => con,
                            Err(e) => {
                                error!(
                                    self.ctx.expect_logger(),
                                    "unable to deregister predicate: {}",
                                    e.to_string()
                                );
                                continue;
                            }
                        };
                        let predicate_key = spec.key();
                        let res: Result<(), redis::RedisError> =
                            predicates_db_conn.del(predicate_key);
                        if let Err(e) = res {
                            error!(
                                self.ctx.expect_logger(),
                                "unable to delete predicate: {}",
                                e.to_string()
                            );
                        }
                    }
                }
                ObserverEvent::BitcoinPredicateTriggered(data) => {
                    if let Some(ref tx) = predicate_activity_relayer {
                        let _ = tx.send(data);
                    }
                }
                ObserverEvent::Terminate => {
                    info!(self.ctx.expect_logger(), "Terminating runloop");
                    break;
                }
                _ => {}
            }
        }

        Ok(())
    }

    pub fn set_up_observer_config(
        &self,
        predicates: Vec<ChainhookFullSpecification>,
        enable_internal_trigger: bool,
    ) -> Result<
        (
            EventObserverConfig,
            Option<crossbeam_channel::Receiver<DataHandlerEvent>>,
        ),
        String,
    > {
        let mut event_observer_config = self.config.get_event_observer_config();
        let chainhook_config = create_and_consolidate_chainhook_config_with_predicates(
            predicates,
            enable_internal_trigger,
            &self.config,
            &self.ctx,
        );
        event_observer_config.chainhook_config = Some(chainhook_config);
        let data_rx = if enable_internal_trigger {
            let (tx, rx) = crossbeam_channel::bounded(256);
            event_observer_config.data_handler_tx = Some(tx);
            Some(rx)
        } else {
            None
        };
        Ok((event_observer_config, data_rx))
    }

    pub fn set_up_observer_sidecar_runloop(&self) -> Result<ObserverSidecar, String> {
        let (block_mutator_in_tx, block_mutator_in_rx) = crossbeam_channel::unbounded();
        let (block_mutator_out_tx, block_mutator_out_rx) = crossbeam_channel::unbounded();
        let (chain_event_notifier_tx, chain_event_notifier_rx) = crossbeam_channel::unbounded();
        let observer_sidecar = ObserverSidecar {
            bitcoin_blocks_mutator: Some((block_mutator_in_tx, block_mutator_out_rx)),
            bitcoin_chain_event_notifier: Some(chain_event_notifier_tx),
        };
        let cache_l2 = Arc::new(new_traversals_lazy_cache(
            self.config.limits.max_caching_memory_size_mb,
        ));
        let ctx = self.ctx.clone();
        let config = self.config.clone();

        let _ = hiro_system_kit::thread_named("Observer Sidecar Runloop").spawn(move || loop {
            select! {
                recv(block_mutator_in_rx) -> msg => {
                    if let Ok((mut blocks_to_mutate, blocks_ids_to_rollback)) = msg {
                        chainhook_sidecar_mutate_blocks(
                            &mut blocks_to_mutate,
                            &blocks_ids_to_rollback,
                            &cache_l2,
                            &config,
                            &ctx,
                        );
                        let _ = block_mutator_out_tx.send(blocks_to_mutate);
                    }
                }
                recv(chain_event_notifier_rx) -> msg => {
                    if let Ok(command) = msg {
                        chainhook_sidecar_mutate_ordhook_db(command, &config, &ctx)
                    }
                }
            }
        });

        Ok(observer_sidecar)
    }

    pub async fn catch_up_with_chain_tip(
        &mut self,
        rebuild_from_scratch: bool,
        event_observer_config: &EventObserverConfig,
    ) -> Result<(), String> {
        if rebuild_from_scratch {
            let blocks_db = open_readwrite_ordhook_db_conn_rocks_db(
                &self.config.expected_cache_path(),
                &self.ctx,
            )?;
            let inscriptions_db_conn_rw =
                open_readwrite_ordhook_db_conn(&self.config.expected_cache_path(), &self.ctx)?;

            delete_data_in_ordhook_db(
                767430,
                800000,
                &blocks_db,
                &inscriptions_db_conn_rw,
                &self.ctx,
            )?;
        }
        let tx_replayer = start_observer_forwarding(event_observer_config, &self.ctx);
        self.update_state(Some(tx_replayer)).await?;
        Ok(())
    }

    pub async fn update_state(
        &self,
        block_post_processor: Option<crossbeam_channel::Sender<BitcoinBlockData>>,
    ) -> Result<(), String> {
        // First, make sure that rocksdb and sqlite are aligned.
        // If rocksdb.chain_tip.height <= sqlite.chain_tip.height
        // Perform some block compression until that height.
        if let Some((start_block, end_block)) = should_sync_rocks_db(&self.config, &self.ctx)? {
            let blocks_post_processor = start_block_archiving_processor(
                &self.config,
                &self.ctx,
                true,
                block_post_processor.clone(),
            );

            self.ctx.try_log(|logger| {
                info!(
                    logger,
                    "Compressing blocks (from #{start_block} to #{end_block})"
                )
            });

            let ordhook_config = self.config.get_ordhook_config();
            let first_inscription_height = ordhook_config.first_inscription_height;
            let blocks = BlockHeights::BlockRange(start_block, end_block).get_sorted_entries();
            download_and_pipeline_blocks(
                &self.config,
                blocks.into(),
                first_inscription_height,
                Some(&blocks_post_processor),
                10_000,
                &self.ctx,
            )
            .await?;
        }

        // Start predicate processor
        let mut last_block_processed = 0;
        while let Some((start_block, end_block, speed)) =
            should_sync_ordhook_db(&self.config, &self.ctx)?
        {
            if last_block_processed == end_block {
                break;
            }
            let blocks_post_processor = start_inscription_indexing_processor(
                &self.config,
                &self.ctx,
                block_post_processor.clone(),
            );

            self.ctx.try_log(|logger| {
                info!(
                    logger,
                    "Indexing inscriptions from block #{start_block} to block #{end_block}"
                )
            });

            let ordhook_config = self.config.get_ordhook_config();
            let first_inscription_height = ordhook_config.first_inscription_height;
            let blocks = BlockHeights::BlockRange(start_block, end_block).get_sorted_entries();
            download_and_pipeline_blocks(
                &self.config,
                blocks.into(),
                first_inscription_height,
                Some(&blocks_post_processor),
                speed,
                &self.ctx,
            )
            .await?;

            last_block_processed = end_block;
        }

        Ok(())
    }

    pub async fn replay_transfers(
        &self,
        blocks: Vec<u64>,
        block_post_processor: Option<crossbeam_channel::Sender<BitcoinBlockData>>,
    ) -> Result<(), String> {
        // Start predicate processor
        let blocks_post_processor =
            start_transfers_recomputing_processor(&self.config, &self.ctx, block_post_processor);

        let ordhook_config = self.config.get_ordhook_config();
        let first_inscription_height = ordhook_config.first_inscription_height;
        download_and_pipeline_blocks(
            &self.config,
            blocks,
            first_inscription_height,
            Some(&blocks_post_processor),
            100,
            &self.ctx,
        )
        .await?;

        Ok(())
    }
}

fn chainhook_sidecar_mutate_ordhook_db(command: HandleBlock, config: &Config, ctx: &Context) {
    let (blocks_db_rw, inscriptions_db_conn_rw) =
        match open_readwrite_ordhook_dbs(&config.expected_cache_path(), &ctx) {
            Ok(dbs) => dbs,
            Err(e) => {
                ctx.try_log(|logger| error!(logger, "Unable to open readwtite connection: {e}",));
                return;
            }
        };

    match command {
        HandleBlock::UndoBlock(block) => {
            info!(
                ctx.expect_logger(),
                "Re-org handling: reverting changes in block #{}", block.block_identifier.index
            );
            if let Err(e) = delete_data_in_ordhook_db(
                block.block_identifier.index,
                block.block_identifier.index,
                &blocks_db_rw,
                &inscriptions_db_conn_rw,
                &ctx,
            ) {
                ctx.try_log(|logger| {
                    error!(
                        logger,
                        "Unable to rollback bitcoin block {}: {e}", block.block_identifier
                    )
                });
            }
        }
        HandleBlock::ApplyBlock(block) => {
            let compressed_block: LazyBlock = match LazyBlock::from_standardized_block(&block) {
                Ok(block) => block,
                Err(e) => {
                    ctx.try_log(|logger| {
                        error!(
                            logger,
                            "Unable to compress block #{}: #{}",
                            block.block_identifier.index,
                            e.to_string()
                        )
                    });
                    return;
                }
            };
            insert_entry_in_blocks(
                block.block_identifier.index as u32,
                &compressed_block,
                true,
                &blocks_db_rw,
                &ctx,
            );
            let _ = blocks_db_rw.flush();

            update_inscriptions_with_block(&block, &inscriptions_db_conn_rw, &ctx);

            update_locations_with_block(&block, &inscriptions_db_conn_rw, &ctx);
        }
    }
}

pub fn start_observer_forwarding(
    event_observer_config: &EventObserverConfig,
    ctx: &Context,
) -> Sender<BitcoinBlockData> {
    let (tx_replayer, rx_replayer) = unbounded();
    let mut moved_event_observer_config = event_observer_config.clone();
    let moved_ctx = ctx.clone();

    let _ = hiro_system_kit::thread_named("Initial predicate processing")
        .spawn(move || {
            if let Some(mut chainhook_config) = moved_event_observer_config.chainhook_config.take()
            {
                let mut bitcoin_predicates_ref: Vec<&BitcoinChainhookSpecification> = vec![];
                for bitcoin_predicate in chainhook_config.bitcoin_chainhooks.iter_mut() {
                    bitcoin_predicates_ref.push(bitcoin_predicate);
                }
                while let Ok(block) = rx_replayer.recv() {
                    let future = process_block_with_predicates(
                        block,
                        &bitcoin_predicates_ref,
                        &moved_event_observer_config,
                        &moved_ctx,
                    );
                    let res = hiro_system_kit::nestable_block_on(future);
                    if let Err(_) = res {
                        error!(moved_ctx.expect_logger(), "Initial ingestion failing");
                    }
                }
            }
        })
        .expect("unable to spawn thread");

    tx_replayer
}

pub fn chainhook_sidecar_mutate_blocks(
    blocks_to_mutate: &mut Vec<BitcoinBlockDataCached>,
    blocks_ids_to_rollback: &Vec<BlockIdentifier>,
    cache_l2: &Arc<DashMap<(u32, [u8; 8]), LazyBlockTransaction, BuildHasherDefault<FxHasher>>>,
    config: &Config,
    ctx: &Context,
) {
    let mut updated_blocks_ids = vec![];

    let (blocks_db_rw, mut inscriptions_db_conn_rw) =
        match open_readwrite_ordhook_dbs(&config.expected_cache_path(), &ctx) {
            Ok(dbs) => dbs,
            Err(e) => {
                ctx.try_log(|logger| error!(logger, "Unable to open readwtite connection: {e}",));
                return;
            }
        };

    let inscriptions_db_tx = inscriptions_db_conn_rw.transaction().unwrap();

    for block_id_to_rollback in blocks_ids_to_rollback.iter() {
        if let Err(e) = delete_data_in_ordhook_db(
            block_id_to_rollback.index,
            block_id_to_rollback.index,
            &blocks_db_rw,
            &inscriptions_db_tx,
            &Context::empty(),
        ) {
            ctx.try_log(|logger| {
                error!(
                    logger,
                    "Unable to rollback bitcoin block {}: {e}", block_id_to_rollback.index
                )
            });
        }
    }

    let ordhook_config = config.get_ordhook_config();

    for cache in blocks_to_mutate.iter_mut() {
        let compressed_block: LazyBlock = match LazyBlock::from_standardized_block(&cache.block) {
            Ok(block) => block,
            Err(e) => {
                ctx.try_log(|logger| {
                    error!(
                        logger,
                        "Unable to compress block #{}: #{}",
                        cache.block.block_identifier.index,
                        e.to_string()
                    )
                });
                continue;
            }
        };

        insert_entry_in_blocks(
            cache.block.block_identifier.index as u32,
            &compressed_block,
            true,
            &blocks_db_rw,
            &ctx,
        );
        let _ = blocks_db_rw.flush();

        if cache.processed_by_sidecar {
            update_inscriptions_with_block(&cache.block, &inscriptions_db_tx, &ctx);
            update_locations_with_block(&cache.block, &inscriptions_db_tx, &ctx);
        } else {
            updated_blocks_ids.push(format!("{}", cache.block.block_identifier.index));

            parse_inscriptions_in_standardized_block(&mut cache.block, &ctx);

            let mut cache_l1 = BTreeMap::new();
            let mut sequence_cursor = SequenceCursor::new(&inscriptions_db_tx);

            let _ = process_block(
                &mut cache.block,
                &vec![],
                &mut sequence_cursor,
                &mut cache_l1,
                &cache_l2,
                &inscriptions_db_tx,
                &ordhook_config,
                &ctx,
            );

            let inscriptions_revealed = get_inscriptions_revealed_in_block(&cache.block)
                .iter()
                .map(|d| d.inscription_number.to_string())
                .collect::<Vec<String>>();

            ctx.try_log(|logger| {
                info!(
                    logger,
                    "Block #{} processed, mutated and revealed {} inscriptions [{}]",
                    cache.block.block_identifier.index,
                    inscriptions_revealed.len(),
                    inscriptions_revealed.join(", ")
                )
            });
            cache.processed_by_sidecar = true;
        }
    }
    let _ = inscriptions_db_tx.rollback();
}
