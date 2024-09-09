use chainhook_sdk::bitcoincore_rpc_json::bitcoin::Txid;
use chainhook_sdk::indexer::bitcoin::BitcoinTransactionFullBreakdown;
use chainhook_sdk::indexer::bitcoin::{standardize_bitcoin_block, BitcoinBlockFullBreakdown};
use chainhook_sdk::types::{
    BitcoinBlockData, BitcoinNetwork, BitcoinTransactionData, BlockIdentifier,
    OrdinalInscriptionCurseType, OrdinalInscriptionNumber, OrdinalInscriptionRevealData,
    OrdinalInscriptionTransferData, OrdinalOperation,
};
use chainhook_sdk::utils::Context;
use serde_json::json;
use std::collections::{BTreeMap, HashMap};
use std::str::FromStr;

use crate::core::meta_protocols::brc20::brc20_activation_height;
use crate::core::meta_protocols::brc20::parser::{parse_brc20_operation, ParsedBrc20Operation};
use crate::core::OrdhookConfig;
use crate::ord::envelope::{Envelope, ParsedEnvelope, RawEnvelope};
use crate::ord::inscription::Inscription;
use crate::ord::inscription_id::InscriptionId;
use crate::try_warn;
use {chainhook_sdk::bitcoincore_rpc::bitcoin::Witness, std::str};

pub fn parse_inscriptions_from_witness(
    input_index: usize,
    witness_bytes: Vec<Vec<u8>>,
    txid: &str,
) -> Option<Vec<(OrdinalInscriptionRevealData, Inscription)>> {
    let witness = Witness::from_slice(&witness_bytes);
    let tapscript = witness.tapscript()?;
    let envelopes: Vec<Envelope<Inscription>> = RawEnvelope::from_tapscript(tapscript, input_index)
        .ok()?
        .into_iter()
        .map(|e| ParsedEnvelope::from(e))
        .collect();
    let mut inscriptions = vec![];
    for envelope in envelopes.into_iter() {
        let curse_type = if envelope.payload.unrecognized_even_field {
            Some(OrdinalInscriptionCurseType::UnrecognizedEvenField)
        } else if envelope.payload.duplicate_field {
            Some(OrdinalInscriptionCurseType::DuplicateField)
        } else if envelope.payload.incomplete_field {
            Some(OrdinalInscriptionCurseType::IncompleteField)
        } else if envelope.input != 0 {
            Some(OrdinalInscriptionCurseType::NotInFirstInput)
        } else if envelope.offset != 0 {
            Some(OrdinalInscriptionCurseType::NotAtOffsetZero)
        } else if envelope.payload.pointer.is_some() {
            Some(OrdinalInscriptionCurseType::Pointer)
        } else if envelope.pushnum {
            Some(OrdinalInscriptionCurseType::Pushnum)
        } else if envelope.stutter {
            Some(OrdinalInscriptionCurseType::Stutter)
        } else {
            None
        };

        let inscription_id = InscriptionId {
            txid: Txid::from_str(txid).unwrap(),
            index: input_index as u32,
        };

        let no_content_bytes = vec![];
        let inscription_content_bytes = envelope.payload.body().take().unwrap_or(&no_content_bytes);
        let mut content_bytes = "0x".to_string();
        content_bytes.push_str(&hex::encode(&inscription_content_bytes));

        let parent = envelope.payload.parent().and_then(|i| Some(i.to_string()));
        let delegate = envelope
            .payload
            .delegate()
            .and_then(|i| Some(i.to_string()));
        let metaprotocol = envelope
            .payload
            .metaprotocol()
            .and_then(|p| Some(p.to_string()));
        let metadata = envelope.payload.metadata().and_then(|m| Some(json!(m)));

        let reveal_data = OrdinalInscriptionRevealData {
            content_type: envelope
                .payload
                .content_type()
                .unwrap_or("unknown")
                .to_string(),
            content_bytes,
            content_length: inscription_content_bytes.len(),
            inscription_id: inscription_id.to_string(),
            inscription_input_index: input_index,
            tx_index: 0,
            inscription_output_value: 0,
            inscription_pointer: envelope.payload.pointer(),
            inscription_fee: 0,
            inscription_number: OrdinalInscriptionNumber::zero(),
            inscriber_address: None,
            parent,
            delegate,
            metaprotocol,
            metadata,
            ordinal_number: 0,
            ordinal_block_height: 0,
            ordinal_offset: 0,
            transfers_pre_inscription: 0,
            satpoint_post_inscription: format!(""),
            curse_type,
        };
        inscriptions.push((reveal_data, envelope.payload));
    }
    Some(inscriptions)
}

pub fn parse_inscriptions_from_standardized_tx(
    tx: &mut BitcoinTransactionData,
    block_identifier: &BlockIdentifier,
    network: &BitcoinNetwork,
    brc20_operation_map: &mut HashMap<String, ParsedBrc20Operation>,
    ordhook_config: &OrdhookConfig,
    ctx: &Context,
) -> Vec<OrdinalOperation> {
    let mut operations = vec![];
    for (input_index, input) in tx.metadata.inputs.iter().enumerate() {
        let witness_bytes: Vec<Vec<u8>> = input
            .witness
            .iter()
            .map(|w| hex::decode(&w[2..]).unwrap())
            .collect();

        if let Some(inscriptions) = parse_inscriptions_from_witness(
            input_index,
            witness_bytes,
            tx.transaction_identifier.get_hash_bytes_str(),
        ) {
            for (reveal, inscription) in inscriptions.into_iter() {
                if ordhook_config.meta_protocols.brc20
                    && block_identifier.index >= brc20_activation_height(&network)
                {
                    match parse_brc20_operation(&inscription) {
                        Ok(Some(op)) => {
                            brc20_operation_map.insert(reveal.inscription_id.clone(), op);
                        }
                        Ok(None) => {}
                        Err(e) => {
                            try_warn!(ctx, "Error parsing BRC-20 operation: {}", e);
                        }
                    };
                }
                operations.push(OrdinalOperation::InscriptionRevealed(reveal));
            }
        }
    }
    operations
}

pub fn parse_inscriptions_in_raw_tx(
    tx: &BitcoinTransactionFullBreakdown,
    _ctx: &Context,
) -> Vec<OrdinalOperation> {
    let mut operations = vec![];
    for (input_index, input) in tx.vin.iter().enumerate() {
        if let Some(ref witness_data) = input.txinwitness {
            let witness_bytes: Vec<Vec<u8>> = witness_data
                .iter()
                .map(|w| hex::decode(w).unwrap())
                .collect();

            if let Some(inscriptions) =
                parse_inscriptions_from_witness(input_index, witness_bytes, &tx.txid)
            {
                for (reveal, _inscription) in inscriptions.into_iter() {
                    operations.push(OrdinalOperation::InscriptionRevealed(reveal));
                }
            }
        }
    }
    operations
}

pub fn parse_inscriptions_and_standardize_block(
    raw_block: BitcoinBlockFullBreakdown,
    network: &BitcoinNetwork,
    ctx: &Context,
) -> Result<BitcoinBlockData, (String, bool)> {
    let mut ordinal_operations = BTreeMap::new();

    for tx in raw_block.tx.iter() {
        ordinal_operations.insert(tx.txid.to_string(), parse_inscriptions_in_raw_tx(&tx, ctx));
    }

    let mut block = standardize_bitcoin_block(raw_block, network, ctx)?;

    for tx in block.transactions.iter_mut() {
        if let Some(ordinal_operations) =
            ordinal_operations.remove(tx.transaction_identifier.get_hash_bytes_str())
        {
            tx.metadata.ordinal_operations = ordinal_operations;
        }
    }
    Ok(block)
}

pub fn parse_inscriptions_in_standardized_block(
    block: &mut BitcoinBlockData,
    brc20_operation_map: &mut HashMap<String, ParsedBrc20Operation>,
    ordhook_config: &OrdhookConfig,
    ctx: &Context,
) {
    for tx in block.transactions.iter_mut() {
        tx.metadata.ordinal_operations = parse_inscriptions_from_standardized_tx(
            tx,
            &block.block_identifier,
            &block.metadata.network,
            brc20_operation_map,
            ordhook_config,
            ctx,
        );
    }
}

pub fn get_inscriptions_revealed_in_block(
    block: &BitcoinBlockData,
) -> Vec<&OrdinalInscriptionRevealData> {
    let mut ops = vec![];
    for tx in block.transactions.iter() {
        for op in tx.metadata.ordinal_operations.iter() {
            if let OrdinalOperation::InscriptionRevealed(op) = op {
                ops.push(op);
            }
        }
    }
    ops
}

pub fn get_inscriptions_transferred_in_block(
    block: &BitcoinBlockData,
) -> Vec<&OrdinalInscriptionTransferData> {
    let mut ops = vec![];
    for tx in block.transactions.iter() {
        for op in tx.metadata.ordinal_operations.iter() {
            if let OrdinalOperation::InscriptionTransferred(op) = op {
                ops.push(op);
            }
        }
    }
    ops
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use chainhook_sdk::{
        types::{BitcoinBlockData, BitcoinNetwork, OrdinalOperation},
        utils::Context,
    };

    use test_case::test_case;

    use crate::{
        config::Config,
        utils::test_helpers::{
            new_test_block, new_test_raw_block, new_test_reveal_raw_tx, new_test_reveal_tx, new_test_reveal_tx_with_operation, new_test_transfer_tx_with_operation
        },
    };

    use super::{
        get_inscriptions_revealed_in_block, get_inscriptions_transferred_in_block,
        parse_inscriptions_and_standardize_block, parse_inscriptions_in_standardized_block,
    };

    #[test_case(&new_test_block(vec![]) => 0; "with empty block")]
    #[test_case(&new_test_block(vec![new_test_reveal_tx_with_operation()]) => 1; "with reveal transaction")]
    #[test_case(&new_test_block(vec![new_test_transfer_tx_with_operation()]) => 0; "with transfer transaction")]
    fn gets_reveals_in_block(block: &BitcoinBlockData) -> usize {
        get_inscriptions_revealed_in_block(block).len()
    }

    #[test_case(&new_test_block(vec![]) => 0; "with empty block")]
    #[test_case(&new_test_block(vec![new_test_reveal_tx_with_operation()]) => 0; "with reveal transaction")]
    #[test_case(&new_test_block(vec![new_test_transfer_tx_with_operation()]) => 1; "with transfer transaction")]
    fn gets_transfers_in_block(block: &BitcoinBlockData) -> usize {
        get_inscriptions_transferred_in_block(block).len()
    }

    #[test]
    fn parses_inscriptions_in_block() {
        let mut block = new_test_block(vec![new_test_reveal_tx()]);
        let ctx = Context::empty();
        let mut config = Config::mainnet_default();
        config.storage.working_dir = "tmp".to_string();
        parse_inscriptions_in_standardized_block(
            &mut block,
            &mut HashMap::new(),
            &config.get_ordhook_config(),
            &ctx,
        );
        let OrdinalOperation::InscriptionRevealed(reveal) =
            &block.transactions[0].metadata.ordinal_operations[0]
        else {
            panic!();
        };
        assert_eq!(
            reveal.inscription_id,
            "b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735i0".to_string()
        );
        assert_eq!(reveal.content_bytes, "0x7b200a20202270223a20226272632d3230222c0a2020226f70223a20226465706c6f79222c0a2020227469636b223a20226f726469222c0a2020226d6178223a20223231303030303030222c0a2020226c696d223a202231303030220a7d".to_string());
        assert_eq!(reveal.content_length, 94);
    }

    #[test]
    fn parses_inscriptions_in_raw_block() {
        let raw_block = new_test_raw_block(vec![new_test_reveal_raw_tx()]);
        let block = parse_inscriptions_and_standardize_block(
            raw_block,
            &BitcoinNetwork::Mainnet,
            &Context::empty(),
        ).unwrap();
        let OrdinalOperation::InscriptionRevealed(reveal) =
            &block.transactions[0].metadata.ordinal_operations[0]
        else {
            panic!();
        };
        assert_eq!(
            reveal.inscription_id,
            "b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735i0".to_string()
        );
        assert_eq!(reveal.content_bytes, "0x7b200a20202270223a20226272632d3230222c0a2020226f70223a20226465706c6f79222c0a2020227469636b223a20226f726469222c0a2020226d6178223a20223231303030303030222c0a2020226c696d223a202231303030220a7d".to_string());
        assert_eq!(reveal.content_length, 94);
    }
}
