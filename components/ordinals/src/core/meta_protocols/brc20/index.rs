use std::collections::HashMap;

use bitcoind::{
    try_debug, try_info,
    types::{
        BitcoinBlockData, BlockIdentifier, Brc20BalanceData, Brc20Operation, Brc20TokenDeployData,
        Brc20TransferData, OrdinalInscriptionTransferData, OrdinalOperation, TransactionIdentifier,
    },
    utils::Context,
};
use deadpool_postgres::Transaction;

use super::{
    brc20_activation_height,
    cache::Brc20MemoryCache,
    parser::ParsedBrc20Operation,
    verifier::{verify_brc20_operation, verify_brc20_transfers, VerifiedBrc20Operation},
};
use crate::{
    core::meta_protocols::brc20::u128_amount_to_decimals_str,
    utils::monitoring::PrometheusMonitoring,
};

/// Index ordinal transfers in a single Bitcoin block looking for BRC-20 transfers.
async fn index_unverified_brc20_transfers(
    transfers: &Vec<(&TransactionIdentifier, &OrdinalInscriptionTransferData)>,
    block_identifier: &BlockIdentifier,
    timestamp: u32,
    brc20_cache: &mut Brc20MemoryCache,
    brc20_db_tx: &Transaction<'_>,
    ctx: &Context,
) -> Result<Vec<(usize, Brc20Operation)>, String> {
    if transfers.is_empty() {
        return Ok(vec![]);
    }
    let mut results = vec![];
    let mut verified_brc20_transfers =
        verify_brc20_transfers(transfers, brc20_cache, brc20_db_tx, ctx).await?;
    // Sort verified transfers by tx_index to make sure they are applied in the order they came through.
    verified_brc20_transfers.sort_by(|a, b| a.2.tx_index.cmp(&b.2.tx_index));

    for (inscription_id, data, transfer, tx_identifier) in verified_brc20_transfers.into_iter() {
        let Some(token) = brc20_cache.get_token(&data.tick, brc20_db_tx).await? else {
            unreachable!();
        };
        results.push((
            transfer.tx_index,
            Brc20Operation::TransferSend(Brc20TransferData {
                tick: data.tick.clone(),
                amt: u128_amount_to_decimals_str(data.amt, token.decimals.0),
                sender_address: data.sender_address.clone(),
                receiver_address: data.receiver_address.clone(),
                inscription_id,
            }),
        ));
        brc20_cache
            .insert_token_transfer_send(
                &data,
                &transfer,
                block_identifier,
                timestamp,
                &tx_identifier,
                transfer.tx_index as u64,
                brc20_db_tx,
            )
            .await?;
        try_debug!(
            ctx,
            "BRC-20 transfer_send {} {} ({} -> {}) at block {}",
            data.tick,
            data.amt,
            data.sender_address,
            data.receiver_address,
            block_identifier.index
        );
    }
    Ok(results)
}

/// Indexes BRC-20 operations in a single Bitcoin block. Also writes indexed data to DB.
pub async fn index_block_and_insert_brc20_operations(
    block: &mut BitcoinBlockData,
    brc20_operation_map: &mut HashMap<String, ParsedBrc20Operation>,
    brc20_cache: &mut Brc20MemoryCache,
    brc20_db_tx: &Transaction<'_>,
    ctx: &Context,
    monitoring: &PrometheusMonitoring,
) -> Result<(), String> {
    if block.block_identifier.index < brc20_activation_height(&block.metadata.network) {
        return Ok(());
    }
    let block_height = block.block_identifier.index;
    try_info!(ctx, "Starting BRC-20 indexing for block #{block_height}...");
    let stopwatch = std::time::Instant::now();

    // Ordinal transfers may be BRC-20 transfers. We group them into a vector to minimize round trips to the db when analyzing
    // them. We will always insert them correctly in between new BRC-20 operations.
    let mut unverified_ordinal_transfers = vec![];
    let mut verified_brc20_transfers = vec![];

    // Track counts of each operation type
    let mut deploy_count: u64 = 0;
    let mut mint_count: u64 = 0;
    let mut transfer_count: u64 = 0;
    let mut transfer_send_count: u64 = 0;

    // Check every transaction in the block. Look for BRC-20 operations.
    for (tx_index, tx) in block.transactions.iter_mut().enumerate() {
        for op in tx.metadata.ordinal_operations.iter() {
            match op {
                OrdinalOperation::InscriptionRevealed(reveal) => {
                    let Some(parsed_brc20_operation) =
                        brc20_operation_map.get(&reveal.inscription_id)
                    else {
                        brc20_cache.ignore_inscription(reveal.ordinal_number);
                        continue;
                    };
                    // First, verify any pending transfers as they may affect balances for the next operation.
                    let mut brc20_transfers = index_unverified_brc20_transfers(
                        &unverified_ordinal_transfers,
                        &block.block_identifier,
                        block.timestamp,
                        brc20_cache,
                        brc20_db_tx,
                        ctx,
                    )
                    .await?;
                    transfer_send_count += brc20_transfers.len() as u64;
                    verified_brc20_transfers.append(&mut brc20_transfers);
                    unverified_ordinal_transfers.clear();
                    // Then continue with the new operation.
                    let Some(operation) = verify_brc20_operation(
                        parsed_brc20_operation,
                        reveal,
                        &block.block_identifier,
                        &block.metadata.network,
                        brc20_cache,
                        brc20_db_tx,
                        ctx,
                    )
                    .await?
                    else {
                        brc20_cache.ignore_inscription(reveal.ordinal_number);
                        continue;
                    };
                    match operation {
                        VerifiedBrc20Operation::TokenDeploy(token) => {
                            deploy_count += 1;
                            tx.metadata.brc20_operation =
                                Some(Brc20Operation::Deploy(Brc20TokenDeployData {
                                    tick: token.tick.clone(),
                                    max: u128_amount_to_decimals_str(token.max, token.dec),
                                    lim: u128_amount_to_decimals_str(token.lim, token.dec),
                                    dec: token.dec.to_string(),
                                    address: token.address.clone(),
                                    inscription_id: reveal.inscription_id.clone(),
                                    self_mint: token.self_mint,
                                }));
                            brc20_cache.insert_token_deploy(
                                &token,
                                reveal,
                                &block.block_identifier,
                                block.timestamp,
                                &tx.transaction_identifier,
                                tx_index as u64,
                            )?;
                            try_debug!(
                                ctx,
                                "BRC-20 deploy {tick} ({address}) at block {block_height}",
                                tick = &token.tick,
                                address = &token.address
                            );
                        }
                        VerifiedBrc20Operation::TokenMint(balance) => {
                            mint_count += 1;
                            let Some(token) =
                                brc20_cache.get_token(&balance.tick, brc20_db_tx).await?
                            else {
                                unreachable!();
                            };
                            tx.metadata.brc20_operation =
                                Some(Brc20Operation::Mint(Brc20BalanceData {
                                    tick: balance.tick.clone(),
                                    amt: u128_amount_to_decimals_str(balance.amt, token.decimals.0),
                                    address: balance.address.clone(),
                                    inscription_id: reveal.inscription_id.clone(),
                                }));
                            brc20_cache
                                .insert_token_mint(
                                    &balance,
                                    reveal,
                                    &block.block_identifier,
                                    block.timestamp,
                                    &tx.transaction_identifier,
                                    tx_index as u64,
                                    brc20_db_tx,
                                )
                                .await?;
                            try_debug!(
                                ctx,
                                "BRC-20 mint {tick} {amount} ({address}) at block {block_height}",
                                tick = &balance.tick,
                                amount = balance.amt,
                                address = &balance.address
                            );
                        }
                        VerifiedBrc20Operation::TokenTransfer(balance) => {
                            transfer_count += 1;
                            let Some(token) =
                                brc20_cache.get_token(&balance.tick, brc20_db_tx).await?
                            else {
                                unreachable!();
                            };
                            tx.metadata.brc20_operation =
                                Some(Brc20Operation::Transfer(Brc20BalanceData {
                                    tick: balance.tick.clone(),
                                    amt: u128_amount_to_decimals_str(balance.amt, token.decimals.0),
                                    address: balance.address.clone(),
                                    inscription_id: reveal.inscription_id.clone(),
                                }));
                            brc20_cache
                                .insert_token_transfer(
                                    &balance,
                                    reveal,
                                    &block.block_identifier,
                                    block.timestamp,
                                    &tx.transaction_identifier,
                                    tx_index as u64,
                                    brc20_db_tx,
                                )
                                .await?;
                            try_debug!(
                                ctx,
                                "BRC-20 transfer {tick} {amount} ({address}) at block {block_height}",
                                tick = &balance.tick,
                                amount = balance.amt,
                                address = &balance.address
                            );
                        }
                        VerifiedBrc20Operation::TokenTransferSend(_) => {
                            unreachable!(
                                "BRC-20 token transfer send should never be generated on reveal"
                            )
                        }
                    }
                }
                OrdinalOperation::InscriptionTransferred(transfer) => {
                    unverified_ordinal_transfers.push((&tx.transaction_identifier, transfer));
                }
            }
        }
    }
    // Verify any dangling ordinal transfers and augment these results back to the block.
    let mut final_transfers = index_unverified_brc20_transfers(
        &unverified_ordinal_transfers,
        &block.block_identifier,
        block.timestamp,
        brc20_cache,
        brc20_db_tx,
        ctx,
    )
    .await?;
    transfer_send_count += final_transfers.len() as u64;
    verified_brc20_transfers.append(&mut final_transfers);
    for (tx_index, verified_transfer) in verified_brc20_transfers.into_iter() {
        block
            .transactions
            .get_mut(tx_index)
            .unwrap()
            .metadata
            .brc20_operation = Some(verified_transfer);
    }
    // Write all changes to DB.
    brc20_cache.db_cache.flush(brc20_db_tx).await?;

    // Log completion of BRC-20 indexing with metrics
    let elapsed = stopwatch.elapsed();

    monitoring.metrics_record_brc20_deploy_per_block(deploy_count);
    monitoring.metrics_record_brc20_mint_per_block(mint_count);
    monitoring.metrics_record_brc20_transfer_per_block(transfer_count);
    monitoring.metrics_record_brc20_transfer_send_per_block(transfer_send_count);

    monitoring.metrics_record_brc20_deploy_total(deploy_count);
    monitoring.metrics_record_brc20_mint_total(mint_count);
    monitoring.metrics_record_brc20_transfer_total(transfer_count);
    monitoring.metrics_record_brc20_transfer_send_total(transfer_send_count);

    try_info!(
        ctx,
        "Completed BRC-20 indexing for block #{block_height}: found {deploy_count} deploys, {mint_count} mints, {transfer_count} transfers, and {transfer_send_count} transfer_sends in {elapsed:.0}s",
        elapsed = elapsed.as_secs_f32()
    );

    Ok(())
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use bitcoind::types::{
        Brc20BalanceData, Brc20Operation, Brc20TokenDeployData, Brc20TransferData,
        OrdinalInscriptionTransferDestination, OrdinalOperation,
    };
    use postgres::{pg_begin, pg_pool_client};

    use crate::{
        core::{
            meta_protocols::brc20::{
                brc20_pg,
                cache::Brc20MemoryCache,
                index::index_block_and_insert_brc20_operations,
                parser::{
                    ParsedBrc20BalanceData, ParsedBrc20Operation, ParsedBrc20TokenDeployData,
                },
                test_utils::{get_test_ctx, Brc20RevealBuilder, Brc20TransferBuilder},
            },
            test_builders::{TestBlockBuilder, TestTransactionBuilder},
        },
        db::{pg_reset_db, pg_test_connection, pg_test_connection_pool},
        utils::monitoring::PrometheusMonitoring,
    };

    #[tokio::test]
    async fn test_full_block_indexing() -> Result<(), String> {
        let ctx = get_test_ctx();
        let mut pg_client = pg_test_connection().await;
        let _ = brc20_pg::migrate(&mut pg_client).await;
        let result = {
            let mut brc20_client = pg_pool_client(&pg_test_connection_pool()).await?;
            let client = pg_begin(&mut brc20_client).await?;

            // Deploy a token, mint and transfer some balance.
            let mut operation_map: HashMap<String, ParsedBrc20Operation> = HashMap::new();
            operation_map.insert(
                "01d6876703d25747bf5767f3d830548ebe09ffcade91d49e558eb9b6fd2d6d56i0".to_string(),
                ParsedBrc20Operation::Deploy(ParsedBrc20TokenDeployData {
                    tick: "pepe".to_string(),
                    display_tick: "pepe".to_string(),
                    max: "100".to_string(),
                    lim: "1".to_string(),
                    dec: "0".to_string(),
                    self_mint: false,
                }),
            );
            operation_map.insert(
                "2e72578e1259b7dab363cb422ae1979ea329ffc0978c4a7552af907238db354ci0".to_string(),
                ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
                    tick: "pepe".to_string(),
                    amt: "1".to_string(),
                }),
            );
            operation_map.insert(
                "a8494261df7d4980af988dfc0241bb7ec95051afdbb86e3bea9c3ab055e898f3i0".to_string(),
                ParsedBrc20Operation::Transfer(ParsedBrc20BalanceData {
                    tick: "pepe".to_string(),
                    amt: "1".to_string(),
                }),
            );

            let mut block = TestBlockBuilder::new()
                .hash(
                    "00000000000000000000a646fc25f31be344cab3e6e31ec26010c40173ad4bd3".to_string(),
                )
                .height(818000)
                .add_transaction(
                    TestTransactionBuilder::new()
                        .add_ordinal_operation(OrdinalOperation::InscriptionRevealed(
                            Brc20RevealBuilder::new()
                                .inscription_number(0)
                                .ordinal_number(100)
                                .inscription_id("01d6876703d25747bf5767f3d830548ebe09ffcade91d49e558eb9b6fd2d6d56i0")
                                .inscriber_address(Some("19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string()))
                                .build(),
                        ))
                        .build(),
                )
                .add_transaction(
                    TestTransactionBuilder::new()
                        .add_ordinal_operation(OrdinalOperation::InscriptionRevealed(
                            Brc20RevealBuilder::new()
                                .inscription_number(1)
                                .ordinal_number(200)
                                .inscription_id("2e72578e1259b7dab363cb422ae1979ea329ffc0978c4a7552af907238db354ci0")
                                .inscriber_address(Some("19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string()))
                                .build(),
                        ))
                        .build(),
                )
                .add_transaction(
                    TestTransactionBuilder::new()
                        .add_ordinal_operation(OrdinalOperation::InscriptionRevealed(
                            Brc20RevealBuilder::new()
                                .inscription_number(2)
                                .ordinal_number(300)
                                .inscription_id("a8494261df7d4980af988dfc0241bb7ec95051afdbb86e3bea9c3ab055e898f3i0")
                                .inscriber_address(Some("19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string()))
                                .build(),
                        ))
                        .build(),
                )
                .add_transaction(
                    TestTransactionBuilder::new()
                        .add_ordinal_operation(OrdinalOperation::InscriptionTransferred(
                            Brc20TransferBuilder::new()
                                .tx_index(3)
                                .ordinal_number(300)
                                .destination(
                                    OrdinalInscriptionTransferDestination::Transferred("3Ezed1AvfdnXFTMZqhMdhdq9hBMTqfx8Yz".to_string()
                                ))
                                .build()
                        ))
                        .build(),
                )
                .build();
            let mut cache = Brc20MemoryCache::new(10);
            let monitoring = PrometheusMonitoring::new();

            let result = index_block_and_insert_brc20_operations(
                &mut block,
                &mut operation_map,
                &mut cache,
                &client,
                &ctx,
                &monitoring,
            )
            .await;

            assert_eq!(
                block
                    .transactions
                    .get(0)
                    .unwrap()
                    .metadata
                    .brc20_operation
                    .as_ref()
                    .unwrap(),
                &Brc20Operation::Deploy(Brc20TokenDeployData {
                    tick: "pepe".to_string(),
                    max: "100".to_string(),
                    lim: "1".to_string(),
                    dec: "0".to_string(),
                    self_mint: false,
                    address: "19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string(),
                    inscription_id:
                        "01d6876703d25747bf5767f3d830548ebe09ffcade91d49e558eb9b6fd2d6d56i0"
                            .to_string(),
                })
            );
            assert_eq!(
                block
                    .transactions
                    .get(1)
                    .unwrap()
                    .metadata
                    .brc20_operation
                    .as_ref()
                    .unwrap(),
                &Brc20Operation::Mint(Brc20BalanceData {
                    tick: "pepe".to_string(),
                    amt: "1".to_string(),
                    address: "19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string(),
                    inscription_id:
                        "2e72578e1259b7dab363cb422ae1979ea329ffc0978c4a7552af907238db354ci0"
                            .to_string()
                })
            );
            assert_eq!(
                block
                    .transactions
                    .get(2)
                    .unwrap()
                    .metadata
                    .brc20_operation
                    .as_ref()
                    .unwrap(),
                &Brc20Operation::Transfer(Brc20BalanceData {
                    tick: "pepe".to_string(),
                    amt: "1".to_string(),
                    address: "19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string(),
                    inscription_id:
                        "a8494261df7d4980af988dfc0241bb7ec95051afdbb86e3bea9c3ab055e898f3i0"
                            .to_string()
                })
            );
            assert_eq!(
                block
                    .transactions
                    .get(3)
                    .unwrap()
                    .metadata
                    .brc20_operation
                    .as_ref()
                    .unwrap(),
                &Brc20Operation::TransferSend(Brc20TransferData {
                    tick: "pepe".to_string(),
                    amt: "1".to_string(),
                    sender_address: "19PFYXeUuArA3vRDHh2zz8tupAYNFqjBCP".to_string(),
                    receiver_address: "3Ezed1AvfdnXFTMZqhMdhdq9hBMTqfx8Yz".to_string(),
                    inscription_id:
                        "a8494261df7d4980af988dfc0241bb7ec95051afdbb86e3bea9c3ab055e898f3i0"
                            .to_string()
                })
            );

            result
        };
        pg_reset_db(&mut pg_client).await?;
        result
    }
}
