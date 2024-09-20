use std::{
    collections::{BTreeMap, HashMap},
    sync::Arc,
    thread::{sleep, JoinHandle},
    time::Duration,
};

use chainhook_sdk::{
    types::{BitcoinBlockData, TransactionIdentifier},
    utils::Context,
};
use crossbeam_channel::{Sender, TryRecvError};
use rusqlite::Transaction;

use dashmap::DashMap;
use fxhash::FxHasher;
use rusqlite::Connection;
use std::hash::BuildHasherDefault;

use crate::{
    core::{
        meta_protocols::brc20::{
            cache::{brc20_new_cache, Brc20MemoryCache},
            db::brc20_new_rw_db_conn,
        },
        pipeline::processors::block_archiving::store_compacted_blocks,
        protocol::{
            inscription_parsing::{
                get_inscriptions_revealed_in_block, get_inscriptions_transferred_in_block,
                parse_inscriptions_in_standardized_block,
            },
            inscription_sequencing::{
                augment_block_with_ordinals_inscriptions_data_and_write_to_db_tx,
                get_bitcoin_network, get_jubilee_block_height,
                parallelize_inscription_data_computations, SequenceCursor,
            },
            satoshi_numbering::TraversalResult,
            satoshi_tracking::augment_block_with_ordinals_transfer_data,
        },
    },
    db::{
        blocks::open_blocks_db_with_retry,
        cursor::TransactionBytesCursor,
        ordinals::{
            get_any_entry_in_ordinal_activities, get_latest_indexed_inscription_number,
            open_ordinals_db, open_ordinals_db_rw,
        },
    },
    service::write_brc20_block_operations,
    try_error, try_info,
    utils::monitoring::PrometheusMonitoring,
};

use crate::{
    config::Config,
    core::{
        new_traversals_lazy_cache,
        pipeline::{PostProcessorCommand, PostProcessorController, PostProcessorEvent},
    },
};

pub fn start_inscription_indexing_processor(
    config: &Config,
    ctx: &Context,
    post_processor: Option<Sender<BitcoinBlockData>>,
    prometheus: &PrometheusMonitoring,
) -> PostProcessorController {
    let (commands_tx, commands_rx) = crossbeam_channel::bounded::<PostProcessorCommand>(2);
    let (events_tx, events_rx) = crossbeam_channel::unbounded::<PostProcessorEvent>();

    let config = config.clone();
    let ctx = ctx.clone();
    let prometheus = prometheus.clone();
    let handle: JoinHandle<()> = hiro_system_kit::thread_named("Inscription indexing runloop")
        .spawn(move || {
            let cache_l2 = Arc::new(new_traversals_lazy_cache(2048));
            let garbage_collect_every_n_blocks = 100;
            let mut garbage_collect_nth_block = 0;

            let mut inscriptions_db_conn_rw =
                open_ordinals_db_rw(&config.expected_cache_path(), &ctx).unwrap();
            let mut empty_cycles = 0;

            let inscriptions_db_conn =
                open_ordinals_db(&config.expected_cache_path(), &ctx).unwrap();
            let mut sequence_cursor = SequenceCursor::new(&inscriptions_db_conn);

            let mut brc20_cache = brc20_new_cache(&config);
            let mut brc20_db_conn_rw = brc20_new_rw_db_conn(&config, &ctx);

            loop {
                let (compacted_blocks, mut blocks) = match commands_rx.try_recv() {
                    Ok(PostProcessorCommand::ProcessBlocks(compacted_blocks, blocks)) => {
                        empty_cycles = 0;
                        (compacted_blocks, blocks)
                    }
                    Ok(PostProcessorCommand::Terminate) => {
                        let _ = events_tx.send(PostProcessorEvent::Terminated);
                        break;
                    }
                    Err(e) => match e {
                        TryRecvError::Empty => {
                            empty_cycles += 1;
                            if empty_cycles == 180 {
                                try_info!(ctx, "Block processor reached expiration");
                                let _ = events_tx.send(PostProcessorEvent::Expired);
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

                {
                    let blocks_db_rw = open_blocks_db_with_retry(true, &config, &ctx);
                    store_compacted_blocks(
                        compacted_blocks,
                        true,
                        &blocks_db_rw,
                        &Context::empty(),
                    );
                }

                // Early return
                if blocks.is_empty() {
                    continue;
                }

                try_info!(ctx, "Processing {} blocks", blocks.len());
                blocks = process_blocks(
                    &mut blocks,
                    &mut sequence_cursor,
                    &cache_l2,
                    &mut inscriptions_db_conn_rw,
                    &mut brc20_cache,
                    &mut brc20_db_conn_rw,
                    &post_processor,
                    &prometheus,
                    &config,
                    &ctx,
                );

                garbage_collect_nth_block += blocks.len();
                if garbage_collect_nth_block > garbage_collect_every_n_blocks {
                    try_info!(ctx, "Performing garbage collecting");

                    // Clear L2 cache on a regular basis
                    try_info!(ctx, "Clearing cache L2 ({} entries)", cache_l2.len());
                    cache_l2.clear();

                    // Recreate sqlite db connection on a regular basis
                    inscriptions_db_conn_rw =
                        open_ordinals_db_rw(&config.expected_cache_path(), &ctx).unwrap();
                    inscriptions_db_conn_rw.flush_prepared_statement_cache();
                    garbage_collect_nth_block = 0;
                }
            }
        })
        .expect("unable to spawn thread");

    PostProcessorController {
        commands_tx,
        events_rx,
        thread_handle: handle,
    }
}

pub fn process_blocks(
    next_blocks: &mut Vec<BitcoinBlockData>,
    sequence_cursor: &mut SequenceCursor,
    cache_l2: &Arc<DashMap<(u32, [u8; 8]), TransactionBytesCursor, BuildHasherDefault<FxHasher>>>,
    inscriptions_db_conn_rw: &mut Connection,
    brc20_cache: &mut Option<Brc20MemoryCache>,
    brc20_db_conn_rw: &mut Option<Connection>,
    post_processor: &Option<Sender<BitcoinBlockData>>,
    prometheus: &PrometheusMonitoring,
    config: &Config,
    ctx: &Context,
) -> Vec<BitcoinBlockData> {
    let mut cache_l1 = BTreeMap::new();
    let mut updated_blocks = vec![];

    for _cursor in 0..next_blocks.len() {
        let inscriptions_db_tx = inscriptions_db_conn_rw.transaction().unwrap();
        let brc20_db_tx = brc20_db_conn_rw.as_mut().map(|c| c.transaction().unwrap());

        let mut block = next_blocks.remove(0);

        // We check before hand if some data were pre-existing, before processing
        // Always discard if we have some existing content at this block height (inscription or transfers)
        let any_existing_activity = get_any_entry_in_ordinal_activities(
            &block.block_identifier.index,
            &inscriptions_db_tx,
            ctx,
        );

        // Invalidate and recompute cursor when crossing the jubilee height
        let jubilee_height =
            get_jubilee_block_height(&get_bitcoin_network(&block.metadata.network));
        if block.block_identifier.index == jubilee_height {
            sequence_cursor.reset();
        }

        let _ = process_block(
            &mut block,
            &next_blocks,
            sequence_cursor,
            &mut cache_l1,
            cache_l2,
            &inscriptions_db_tx,
            brc20_db_tx.as_ref(),
            brc20_cache.as_mut(),
            prometheus,
            config,
            ctx,
        );

        let inscriptions_revealed = get_inscriptions_revealed_in_block(&block)
            .iter()
            .map(|d| d.get_inscription_number().to_string())
            .collect::<Vec<String>>();

        let inscriptions_transferred = get_inscriptions_transferred_in_block(&block).len();

        try_info!(
            ctx,
            "Block #{} processed, revealed {} inscriptions [{}] and {inscriptions_transferred} transfers",
            block.block_identifier.index,
            inscriptions_revealed.len(),
            inscriptions_revealed.join(", ")
        );

        if any_existing_activity {
            try_error!(
                ctx,
                "Dropping updates for block #{}, activities present in database",
                block.block_identifier.index,
            );
            let _ = inscriptions_db_tx.rollback();
            let _ = brc20_db_tx.map(|t| t.rollback());
        } else {
            match inscriptions_db_tx.commit() {
                Ok(_) => {
                    if let Some(brc20_db_tx) = brc20_db_tx {
                        match brc20_db_tx.commit() {
                            Ok(_) => {}
                            Err(_) => {
                                // TODO: Synchronize rollbacks and commits between BRC-20 and inscription DBs.
                                todo!()
                            }
                        }
                    }
                }
                Err(e) => {
                    try_error!(
                        ctx,
                        "Unable to update changes in block #{}: {}",
                        block.block_identifier.index,
                        e.to_string()
                    );
                }
            }
        }

        if let Some(post_processor_tx) = post_processor {
            let _ = post_processor_tx.send(block.clone());
        }
        updated_blocks.push(block);
    }
    updated_blocks
}

pub fn process_block(
    block: &mut BitcoinBlockData,
    next_blocks: &Vec<BitcoinBlockData>,
    sequence_cursor: &mut SequenceCursor,
    cache_l1: &mut BTreeMap<(TransactionIdentifier, usize, u64), TraversalResult>,
    cache_l2: &Arc<DashMap<(u32, [u8; 8]), TransactionBytesCursor, BuildHasherDefault<FxHasher>>>,
    inscriptions_db_tx: &Transaction,
    brc20_db_tx: Option<&Transaction>,
    brc20_cache: Option<&mut Brc20MemoryCache>,
    prometheus: &PrometheusMonitoring,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    // Parsed BRC20 ops will be deposited here for this block.
    let mut brc20_operation_map = HashMap::new();
    parse_inscriptions_in_standardized_block(block, &mut brc20_operation_map, config, &ctx);

    let any_processable_transactions = parallelize_inscription_data_computations(
        &block,
        &next_blocks,
        cache_l1,
        cache_l2,
        inscriptions_db_tx,
        config,
        ctx,
    )?;

    let inner_ctx = if config.logs.ordinals_internals {
        ctx.clone()
    } else {
        Context::empty()
    };

    // Inscriptions
    if any_processable_transactions {
        let _ = augment_block_with_ordinals_inscriptions_data_and_write_to_db_tx(
            block,
            sequence_cursor,
            cache_l1,
            &inscriptions_db_tx,
            &inner_ctx,
        );
    }
    // Transfers
    let _ = augment_block_with_ordinals_transfer_data(block, inscriptions_db_tx, true, &inner_ctx);
    // BRC-20
    match (brc20_db_tx, brc20_cache) {
        (Some(brc20_db_tx), Some(brc20_cache)) => write_brc20_block_operations(
            block,
            &mut brc20_operation_map,
            brc20_cache,
            brc20_db_tx,
            &ctx,
        ),
        _ => {}
    }

    // Monitoring
    prometheus.metrics_block_indexed(block.block_identifier.index);
    prometheus.metrics_inscription_indexed(
        get_latest_indexed_inscription_number(inscriptions_db_tx, &inner_ctx).unwrap_or(0),
    );

    Ok(())
}

#[cfg(test)]
mod test {
    use std::{thread, time::Duration};

    use chainhook_sdk::{
        types::{
            bitcoin::TxOut, BitcoinBlockData, OrdinalInscriptionTransferDestination,
            OrdinalOperation,
        },
        utils::Context,
    };
    use crossbeam_channel::unbounded;

    use crate::{
        config::Config,
        core::{
            pipeline::PostProcessorCommand,
            test_builders::{TestBlockBuilder, TestTransactionBuilder, TestTxInBuilder},
        },
        db::{
            blocks::open_blocks_db_with_retry, cursor::BlockBytesCursor, drop_all_dbs,
            initialize_sqlite_dbs,
        },
        utils::monitoring::PrometheusMonitoring,
    };

    use super::start_inscription_indexing_processor;

    #[test]
    fn process_inscription_reveal_and_transfer_via_processor() {
        let ctx = Context::empty();
        let config = Config::test_default();
        {
            drop_all_dbs(&config);
            let _ = initialize_sqlite_dbs(&config, &ctx);
            let _ = open_blocks_db_with_retry(true, &config, &ctx);
        }
        let prometheus = PrometheusMonitoring::new();

        let (block_tx, block_rx) = unbounded::<BitcoinBlockData>();
        let controller =
            start_inscription_indexing_processor(&config, &ctx, Some(block_tx), &prometheus);

        // Block 0: A coinbase tx generating the inscription sat.
        let c0 = controller.commands_tx.clone();
        thread::spawn(move || {
            let block0 = TestBlockBuilder::new()
                .hash(
                    "0x00000000000000000001b228f9faca9e7d11fcecff9d463bd05546ff0aa4651a"
                        .to_string(),
                )
                .height(849999)
                .add_transaction(
                    TestTransactionBuilder::new()
                        .hash(
                            "0xa321c61c83563a377f82ef59301f2527079f6bda7c2d04f9f5954c873f42e8ac"
                                .to_string(),
                        )
                        .build(),
                )
                .build();
            thread::sleep(Duration::from_millis(50));
            let _ = c0.send(PostProcessorCommand::ProcessBlocks(
                vec![(
                    849999,
                    BlockBytesCursor::from_standardized_block(&block0).unwrap(),
                )],
                vec![block0],
            ));
        });
        let _ = block_rx.recv().unwrap();

        // Block 1: The actual inscription.
        let c1 = controller.commands_tx.clone();
        thread::spawn(move || {
            let block1 = TestBlockBuilder::new()
                .hash("0xb61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735".to_string())
                .height(850000)
                .add_transaction(TestTransactionBuilder::new().build())
                .add_transaction(
                    TestTransactionBuilder::new()
                        .hash("0xc62d436323e14cdcb91dd21cb7814fd1ac5b9ecb6e3cc6953b54c02a343f7ec9".to_string())
                        .add_input(
                            TestTxInBuilder::new()
                                .prev_out_block_height(849999)
                                .prev_out_tx_hash(
                                    "0xa321c61c83563a377f82ef59301f2527079f6bda7c2d04f9f5954c873f42e8ac"
                                        .to_string(),
                                )
                                .value(12_000)
                                .witness(vec![
                                    "0x6c00eb3c4d35fedd257051333b4ca81d1a25a37a9af4891f1fec2869edd56b14180eafbda8851d63138a724c9b15384bc5f0536de658bd294d426a36212e6f08".to_string(),
                                    "0x209e2849b90a2353691fccedd467215c88eec89a5d0dcf468e6cf37abed344d746ac0063036f7264010118746578742f706c61696e3b636861727365743d7574662d38004c5e7b200a20202270223a20226272632d3230222c0a2020226f70223a20226465706c6f79222c0a2020227469636b223a20226f726469222c0a2020226d6178223a20223231303030303030222c0a2020226c696d223a202231303030220a7d68".to_string(),
                                    "0xc19e2849b90a2353691fccedd467215c88eec89a5d0dcf468e6cf37abed344d746".to_string(),
                                ])
                                .build(),
                        )
                        .add_output(TxOut {
                            value: 10_000,
                            script_pubkey: "0x00145e5f0d045e441bf001584eaeca6cd84da04b1084".to_string(),
                        })
                        .build()
                )
                .build();
            thread::sleep(Duration::from_millis(50));
            let _ = c1.send(PostProcessorCommand::ProcessBlocks(
                vec![(
                    850000,
                    BlockBytesCursor::from_standardized_block(&block1).unwrap(),
                )],
                vec![block1],
            ));
        });
        let results1 = block_rx.recv().unwrap();
        let result_tx_1 = &results1.transactions[1];
        assert_eq!(result_tx_1.metadata.ordinal_operations.len(), 1);
        let OrdinalOperation::InscriptionRevealed(reveal) =
            &result_tx_1.metadata.ordinal_operations[0]
        else {
            unreachable!();
        };
        assert_eq!(
            reveal.inscription_id,
            "c62d436323e14cdcb91dd21cb7814fd1ac5b9ecb6e3cc6953b54c02a343f7ec9i0".to_string()
        );
        assert_eq!(reveal.inscription_number.jubilee, 0);
        assert_eq!(reveal.content_bytes, "0x7b200a20202270223a20226272632d3230222c0a2020226f70223a20226465706c6f79222c0a2020227469636b223a20226f726469222c0a2020226d6178223a20223231303030303030222c0a2020226c696d223a202231303030220a7d".to_string());
        assert_eq!(reveal.content_length, 94);
        assert_eq!(reveal.content_type, "text/plain;charset=utf-8".to_string());
        assert_eq!(
            reveal.inscriber_address,
            Some("bc1qte0s6pz7gsdlqq2cf6hv5mxcfksykyyyjkdfd5".to_string())
        );
        assert_eq!(reveal.ordinal_number, 1971874687500000);
        assert_eq!(reveal.ordinal_block_height, 849999);
        assert_eq!(
            reveal.satpoint_post_inscription,
            "c62d436323e14cdcb91dd21cb7814fd1ac5b9ecb6e3cc6953b54c02a343f7ec9:0:0".to_string()
        );

        // Block 2: Inscription transfer
        let c2 = controller.commands_tx.clone();
        thread::spawn(move || {
            let block2 = TestBlockBuilder::new()
                .hash("0x000000000000000000029854dcc8becfd64a352e1d2b1f1d3bb6f101a947af0e".to_string())
                .height(850001)
                .add_transaction(TestTransactionBuilder::new().build())
                .add_transaction(
                    TestTransactionBuilder::new()
                        .hash("0x1b65c7494c7d1200416a81e65e1dd6bee8d5d4276128458df43692dcb21f49f5".to_string())
                        .add_input(
                            TestTxInBuilder::new()
                                .prev_out_block_height(850000)
                                .prev_out_tx_hash(
                                    "0xc62d436323e14cdcb91dd21cb7814fd1ac5b9ecb6e3cc6953b54c02a343f7ec9"
                                        .to_string(),
                                )
                                .value(10_000)
                                .build(),
                        )
                        .add_output(TxOut {
                            value: 8000,
                            script_pubkey: "0x00145e5f0d045e441bf001584eaeca6cd84da04b1084".to_string(),
                        })
                        .build()
                )
                .build();
            thread::sleep(Duration::from_millis(50));
            let _ = c2.send(PostProcessorCommand::ProcessBlocks(
                vec![(
                    850001,
                    BlockBytesCursor::from_standardized_block(&block2).unwrap(),
                )],
                vec![block2],
            ));
        });
        let results2 = block_rx.recv().unwrap();
        let result_tx_2 = &results2.transactions[1];
        assert_eq!(result_tx_2.metadata.ordinal_operations.len(), 1);
        let OrdinalOperation::InscriptionTransferred(transfer) =
            &result_tx_2.metadata.ordinal_operations[0]
        else {
            unreachable!();
        };
        let OrdinalInscriptionTransferDestination::Transferred(destination) = &transfer.destination
        else {
            unreachable!();
        };
        assert_eq!(
            destination.to_string(),
            "bc1qte0s6pz7gsdlqq2cf6hv5mxcfksykyyyjkdfd5".to_string()
        );
        assert_eq!(transfer.ordinal_number, 1971874687500000);
        assert_eq!(
            transfer.satpoint_pre_transfer,
            "c62d436323e14cdcb91dd21cb7814fd1ac5b9ecb6e3cc6953b54c02a343f7ec9:0:0".to_string()
        );
        assert_eq!(
            transfer.satpoint_post_transfer,
            "1b65c7494c7d1200416a81e65e1dd6bee8d5d4276128458df43692dcb21f49f5:0:0".to_string()
        );
        assert_eq!(transfer.post_transfer_output_value, Some(8000));

        // Close channel.
        let _ = controller.commands_tx.send(PostProcessorCommand::Terminate);
    }
}
