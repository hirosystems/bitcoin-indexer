use std::collections::{HashMap, HashSet};

use bitcoin::{Address, Network, ScriptBuf};
use bitcoind::{
    try_debug, try_info,
    types::{
        BitcoinBlockData, BitcoinTransactionData, BlockIdentifier, OrdinalInscriptionTransferData,
        OrdinalInscriptionTransferDestination, OrdinalOperation,
    },
    utils::Context,
};
use deadpool_postgres::Transaction;

use super::inscription_sequencing::get_bitcoin_network;
use crate::{
    core::{compute_next_satpoint_data, SatPosition},
    db::ordinals_pg,
    utils::format_outpoint_to_watch,
};

pub const UNBOUND_INSCRIPTION_SATPOINT: &str =
    "0000000000000000000000000000000000000000000000000000000000000000:0";

#[derive(Clone, Debug, Ord, PartialOrd, PartialEq, Eq)]
pub struct WatchedSatpoint {
    pub ordinal_number: u64,
    pub offset: u64,
}

pub fn parse_output_and_offset_from_satpoint(
    satpoint: &String,
) -> Result<(String, Option<u64>), String> {
    let parts: Vec<&str> = satpoint.split(':').collect();
    let tx_id = parts
        .first()
        .ok_or("get_output_and_offset_from_satpoint: tx_id not found")?;
    let output = parts
        .get(1)
        .ok_or("get_output_and_offset_from_satpoint: output not found")?;
    let offset: Option<u64> = match parts.get(2) {
        Some(part) => Some(
            part.parse::<u64>()
                .map_err(|e| format!("parse_output_and_offset_from_satpoint: {e}"))?,
        ),
        None => None,
    };
    Ok((format!("{}:{}", tx_id, output), offset))
}

pub async fn augment_block_with_transfers(
    block: &mut BitcoinBlockData,
    db_tx: &Transaction<'_>,
    ctx: &Context,
) -> Result<(), String> {
    // Start timing the block processing
    try_info!(
        ctx,
        "Starting inscriptions indexing for block #{}...",
        block.block_identifier.index
    );
    let inscription_block_indexing_time = std::time::Instant::now();

    let network = get_bitcoin_network(&block.metadata.network);
    let mut block_transferred_satpoints = HashMap::new();
    for (tx_index, tx) in block.transactions.iter_mut().enumerate() {
        augment_transaction_with_ordinal_transfers(
            tx,
            tx_index,
            &mut block_transferred_satpoints,
            &block.block_identifier,
            &network,
            db_tx,
            ctx,
        )
        .await?;
    }

    // Count total reveals and transfers in the block
    let mut reveals_count = 0;
    let mut transfers_count = 0;
    for tx in &block.transactions {
        for op in &tx.metadata.ordinal_operations {
            match op {
                OrdinalOperation::InscriptionRevealed(_) => reveals_count += 1,
                OrdinalOperation::InscriptionTransferred(_) => transfers_count += 1,
            }
        }
    }

    // Calculate elapsed time
    let elapsed = inscription_block_indexing_time.elapsed();

    try_info!(
        ctx,
        "Found {} inscription reveals and {} inscription transfers at block #{} in {:.2?}",
        reveals_count,
        transfers_count,
        block.block_identifier.index,
        elapsed
    );

    Ok(())
}

pub fn compute_satpoint_post_transfer(
    tx: &BitcoinTransactionData,
    input_index: usize,
    relative_pointer_value: u64,
    network: &Network,
    ctx: &Context,
) -> (OrdinalInscriptionTransferDestination, String, Option<u64>) {
    let inputs: Vec<u64> = tx
        .metadata
        .inputs
        .iter()
        .map(|o| o.previous_output.value)
        .collect::<Vec<_>>();
    let outputs = tx
        .metadata
        .outputs
        .iter()
        .map(|o| o.value)
        .collect::<Vec<_>>();
    let post_transfer_data = compute_next_satpoint_data(
        input_index,
        &inputs,
        &outputs,
        relative_pointer_value,
        Some(ctx),
    );

    let (outpoint_post_transfer, offset_post_transfer, destination, post_transfer_output_value) =
        match post_transfer_data {
            SatPosition::Output((output_index, offset)) => {
                let outpoint = format_outpoint_to_watch(&tx.transaction_identifier, output_index);
                let script_pub_key_hex = tx.metadata.outputs[output_index].get_script_pubkey_hex();
                let updated_address = match ScriptBuf::from_hex(script_pub_key_hex) {
                    Ok(script) => match Address::from_script(&script, network) {
                        Ok(address) => {
                            OrdinalInscriptionTransferDestination::Transferred(address.to_string())
                        }
                        Err(e) => {
                            try_info!(
                                ctx,
                                "unable to retrieve address from {script_pub_key_hex}: {}",
                                e.to_string()
                            );
                            OrdinalInscriptionTransferDestination::Burnt(script.to_string())
                        }
                    },
                    Err(e) => {
                        try_info!(
                            ctx,
                            "unable to retrieve address from {script_pub_key_hex}: {}",
                            e.to_string()
                        );
                        OrdinalInscriptionTransferDestination::Burnt(script_pub_key_hex.to_string())
                    }
                };

                (
                    outpoint,
                    offset,
                    updated_address,
                    Some(tx.metadata.outputs[output_index].value),
                )
            }
            SatPosition::Fee(_) => {
                // Unbound inscription satpoints will be updated later with an unbound sequence number.
                (
                    UNBOUND_INSCRIPTION_SATPOINT.into(),
                    0,
                    OrdinalInscriptionTransferDestination::SpentInFees,
                    None,
                )
            }
        };
    let satpoint_post_transfer = format!("{}:{}", outpoint_post_transfer, offset_post_transfer);

    (
        destination,
        satpoint_post_transfer,
        post_transfer_output_value,
    )
}

pub async fn augment_transaction_with_ordinal_transfers(
    tx: &mut BitcoinTransactionData,
    tx_index: usize,
    block_transferred_satpoints: &mut HashMap<String, Vec<WatchedSatpoint>>,
    block_identifier: &BlockIdentifier,
    network: &Network,
    db_tx: &Transaction<'_>,
    ctx: &Context,
) -> Result<(), String> {
    // The transfers are inserted in storage after the inscriptions.
    // We have a unicity constraing, and can only have 1 ordinals per satpoint.
    let mut updated_sats = HashSet::new();
    for op in tx.metadata.ordinal_operations.iter() {
        if let OrdinalOperation::InscriptionRevealed(data) = op {
            updated_sats.insert(data.ordinal_number);
        }
    }

    // Load all sats that will be transferred with this transaction i.e. loop through all tx inputs and look for previous
    // satpoints we need to move.
    //
    // Since the DB state is currently at the end of the previous block, and there may be multiple transfers for the same sat in
    // this new block, we'll use a memory cache to keep all sats that have been transferred but have not yet been written into the
    // DB.
    let mut cached_satpoints = HashMap::new();
    let mut inputs_for_db_lookup = vec![];
    for (vin, input) in tx.metadata.inputs.iter().enumerate() {
        let output_key = format_outpoint_to_watch(
            &input.previous_output.txid,
            input.previous_output.vout as usize,
        );
        // Look in memory cache, or save for a batched DB lookup later.
        if let Some(watched_satpoints) = block_transferred_satpoints.remove(&output_key) {
            cached_satpoints.insert(vin, watched_satpoints);
        } else {
            inputs_for_db_lookup.push((vin, output_key));
        }
    }
    let mut input_satpoints =
        ordinals_pg::get_inscribed_satpoints_at_tx_inputs(&inputs_for_db_lookup, db_tx).await?;
    input_satpoints.extend(cached_satpoints);

    // Process all transfers across all inputs.
    for (input_index, input) in tx.metadata.inputs.iter().enumerate() {
        let Some(entries) = input_satpoints.get(&input_index) else {
            continue;
        };
        for watched_satpoint in entries.iter() {
            if updated_sats.contains(&watched_satpoint.ordinal_number) {
                continue;
            }
            let satpoint_pre_transfer = format!(
                "{}:{}",
                format_outpoint_to_watch(
                    &input.previous_output.txid,
                    input.previous_output.vout as usize,
                ),
                watched_satpoint.offset
            );

            let (destination, satpoint_post_transfer, post_transfer_output_value) =
                compute_satpoint_post_transfer(
                    &*tx,
                    input_index,
                    watched_satpoint.offset,
                    network,
                    ctx,
                );

            let transfer_data = OrdinalInscriptionTransferData {
                ordinal_number: watched_satpoint.ordinal_number,
                destination,
                tx_index,
                satpoint_pre_transfer: satpoint_pre_transfer.clone(),
                satpoint_post_transfer: satpoint_post_transfer.clone(),
                post_transfer_output_value,
            };
            // Keep an in-memory copy of this watchpoint at its new tx output for later retrieval.
            let (output, _) = parse_output_and_offset_from_satpoint(&satpoint_post_transfer)?;
            let entry = block_transferred_satpoints.entry(output).or_default();
            entry.push(watched_satpoint.clone());

            try_debug!(
                ctx,
                "Inscription transfer detected on Satoshi {} ({} -> {}) at block #{}",
                transfer_data.ordinal_number,
                satpoint_pre_transfer,
                satpoint_post_transfer,
                block_identifier.index
            );
            tx.metadata
                .ordinal_operations
                .push(OrdinalOperation::InscriptionTransferred(transfer_data));
        }
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use bitcoin::Network;
    use bitcoind::{
        types::{
            OrdinalInscriptionNumber, OrdinalInscriptionRevealData, OrdinalInscriptionTransferData,
            OrdinalInscriptionTransferDestination, OrdinalOperation,
        },
        utils::Context,
    };
    use postgres::{pg_begin, pg_pool_client};

    use super::compute_satpoint_post_transfer;
    use crate::{
        core::{
            protocol::satoshi_tracking::augment_block_with_transfers,
            test_builders::{
                TestBlockBuilder, TestTransactionBuilder, TestTxInBuilder, TestTxOutBuilder,
            },
        },
        db::{ordinals_pg, pg_reset_db, pg_test_connection, pg_test_connection_pool},
    };

    #[tokio::test]
    async fn tracks_chained_satoshi_transfers_in_block() -> Result<(), String> {
        let ordinal_number: u64 = 283888212016616;
        let inscription_id =
            "cbc9fcf9373cbae36f4868d73a0ad78bbdc58af7c813e6319163e101a8cac8adi1245".to_string();
        let block_height_1: u64 = 874387;
        let block_height_2: u64 = 875364;

        let ctx = Context::empty();
        let mut pg_client = pg_test_connection().await;
        ordinals_pg::migrate(&mut pg_client).await?;
        let result = {
            let mut ord_client = pg_pool_client(&pg_test_connection_pool()).await?;
            let client = pg_begin(&mut ord_client).await?;

            // 1. Insert inscription in a previous block first
            let block = TestBlockBuilder::new()
                .height(block_height_1)
                .hash("0x000000000000000000021668d82e096a1aad3934b5a6f8f707ad29ade2505580".into())
                .add_transaction(
                    TestTransactionBuilder::new()
                        .hash(
                            "0xcbc9fcf9373cbae36f4868d73a0ad78bbdc58af7c813e6319163e101a8cac8ad"
                                .into(),
                        )
                        .add_ordinal_operation(
                            OrdinalOperation::InscriptionRevealed(
                                OrdinalInscriptionRevealData {
                                    content_bytes: "0x".into(),
                                    content_type: "".into(),
                                    content_length: 0,
                                    inscription_number: OrdinalInscriptionNumber { classic: 79754112, jubilee: 79754112 },
                                    inscription_fee: 1161069,
                                    inscription_output_value: 546,
                                    inscription_id,
                                    inscription_input_index: 0,
                                    inscription_pointer: Some(0),
                                    inscriber_address: Some("bc1p3qus9j7ucg0c4s2pf7k70nlpkk7r3ddt4u2ek54wn6nuwkzm9twqfenmjm".into()),
                                    delegate: None,
                                    metaprotocol: None,
                                    metadata: None,
                                    parents: vec![],
                                    ordinal_number,
                                    ordinal_block_height: 56777,
                                    ordinal_offset: 0,
                                    tx_index: 0,
                                    transfers_pre_inscription: 0,
                                    satpoint_post_inscription: "cbc9fcf9373cbae36f4868d73a0ad78bbdc58af7c813e6319163e101a8cac8ad:0:0".into(),
                                    curse_type: None,
                                    charms: 0,
                                    unbound_sequence: None,
                                },
                            ),
                        )
                        .build(),
                )
                .build();
            ordinals_pg::insert_block(&block, &client).await?;

            // 2. Simulate a new block which transfers that same inscription back and forth across 2 transactions
            let mut block = TestBlockBuilder::new()
                .height(block_height_2)
                .hash("0x00000000000000000001efc5fba69f0ebd5645a18258ec3cf109ca3636327242".into())
                .add_transaction(TestTransactionBuilder::new().build())
                .add_transaction(
                    TestTransactionBuilder::new()
                        .hash(
                            "0x30a5a4861a28436a229a6a08872057bd3970382955e6be8fb7f0fde31c3424bd"
                                .into(),
                        )
                        .add_input(
                            TestTxInBuilder::new()
                                .prev_out_block_height(block_height_1)
                                .prev_out_tx_hash("0xcbc9fcf9373cbae36f4868d73a0ad78bbdc58af7c813e6319163e101a8cac8ad".into())
                                .value(546)
                                .build()
                        )
                        .add_output(
                            TestTxOutBuilder::new()
                                .value(546)
                                .script_pubkey("0x51200944f1eef1a8f34ef4d0b58286a51115878abddbec2a3d3d8c581b71ff1c4bbc".into())
                                .build()
                        )
                        .build(),
                )
                .add_transaction(
                    TestTransactionBuilder::new()
                        .hash(
                            "0x0029b328fee7ab916ba98c194f21a084a4a781170610644de518dd0733c0d5d2"
                                .into(),
                        )
                        .add_input(
                            TestTxInBuilder::new()
                                .prev_out_block_height(block_height_2)
                                .prev_out_tx_hash("0x30a5a4861a28436a229a6a08872057bd3970382955e6be8fb7f0fde31c3424bd".into())
                                .value(546)
                                .build()
                        )
                        .add_output(
                            TestTxOutBuilder::new()
                                .value(546)
                                .script_pubkey("0x5120883902cbdcc21f8ac1414fade7cfe1b5bc38b5abaf159b52ae9ea7c7585b2adc".into())
                                .build()
                        )
                        .build()
                )
                .build();
            augment_block_with_transfers(&mut block, &client, &ctx).await?;

            // 3. Make sure the correct transfers were produced
            assert_eq!(
                &block.transactions[1].metadata.ordinal_operations[0],
                &OrdinalOperation::InscriptionTransferred(OrdinalInscriptionTransferData {
                    ordinal_number,
                    destination: OrdinalInscriptionTransferDestination::Transferred(
                        "bc1pp9z0rmh34re5aaxskkpgdfg3zkrc40wmas4r60vvtqdhrlcufw7qmgufuz".into()
                    ),
                    satpoint_pre_transfer:
                        "cbc9fcf9373cbae36f4868d73a0ad78bbdc58af7c813e6319163e101a8cac8ad:0:0"
                            .into(),
                    satpoint_post_transfer:
                        "30a5a4861a28436a229a6a08872057bd3970382955e6be8fb7f0fde31c3424bd:0:0"
                            .into(),
                    post_transfer_output_value: Some(546),
                    tx_index: 1,
                })
            );
            assert_eq!(
                &block.transactions[2].metadata.ordinal_operations[0],
                &OrdinalOperation::InscriptionTransferred(OrdinalInscriptionTransferData {
                    ordinal_number,
                    destination: OrdinalInscriptionTransferDestination::Transferred(
                        "bc1p3qus9j7ucg0c4s2pf7k70nlpkk7r3ddt4u2ek54wn6nuwkzm9twqfenmjm".into()
                    ),
                    satpoint_pre_transfer:
                        "30a5a4861a28436a229a6a08872057bd3970382955e6be8fb7f0fde31c3424bd:0:0"
                            .into(),
                    satpoint_post_transfer:
                        "0029b328fee7ab916ba98c194f21a084a4a781170610644de518dd0733c0d5d2:0:0"
                            .into(),
                    post_transfer_output_value: Some(546),
                    tx_index: 2,
                })
            );

            Ok(())
        };
        pg_reset_db(&mut pg_client).await?;
        result
    }

    #[test]
    fn computes_satpoint_spent_as_fee() {
        let ctx = Context::empty();
        let tx = &TestTransactionBuilder::new()
            .add_input(TestTxInBuilder::new().value(10_000).build())
            .add_output(TestTxOutBuilder::new().value(2_000).build())
            .build();

        // This 5000 offset will make it go to fees.
        let (destination, satpoint, value) =
            compute_satpoint_post_transfer(tx, 0, 5_000, &Network::Bitcoin, &ctx);

        assert_eq!(
            destination,
            OrdinalInscriptionTransferDestination::SpentInFees
        );
        assert_eq!(
            satpoint,
            "0000000000000000000000000000000000000000000000000000000000000000:0:0"
        );
        assert_eq!(value, None);
    }

    #[test]
    fn computes_satpoint_for_op_return() {
        let ctx = Context::empty();
        let tx = &TestTransactionBuilder::new()
            .add_input(TestTxInBuilder::new().value(10_000).build())
            .add_output(
                TestTxOutBuilder::new()
                .value(9_000)
                // OP_RETURN
                .script_pubkey("0x6a24aa21a9edd3ce297baa3ee8fd96ecd7613f2743552e2f91ed4864540cf059835ff5b35cff".to_string())
                .build()
            )
            .build();

        let (destination, satpoint, value) =
            compute_satpoint_post_transfer(tx, 0, 5_000, &Network::Bitcoin, &ctx);

        assert_eq!(
            destination,
            OrdinalInscriptionTransferDestination::Burnt("OP_RETURN OP_PUSHBYTES_36 aa21a9edd3ce297baa3ee8fd96ecd7613f2743552e2f91ed4864540cf059835ff5b35cff".to_string())
        );
        assert_eq!(
            satpoint,
            "b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735:0:5000".to_string()
        );
        assert_eq!(value, Some(9000));
    }
}
