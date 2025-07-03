use std::{collections::HashMap, str, str::FromStr};

use bitcoin::{hash_types::Txid, Witness};
use bitcoind::{
    try_warn,
    types::{
        BitcoinBlockData, BitcoinNetwork, BitcoinTransactionData, BlockIdentifier,
        OrdinalInscriptionCurseType, OrdinalInscriptionNumber, OrdinalInscriptionRevealData,
        OrdinalOperation,
    },
    utils::Context,
};
use config::Config;
use ord::{
    envelope::{Envelope, ParsedEnvelope},
    inscription::Inscription,
    inscription_id::InscriptionId,
};
use serde_json::json;

use crate::core::meta_protocols::brc20::{
    brc20_activation_height,
    parser::{parse_brc20_operation, ParsedBrc20Operation},
};

pub fn parse_inscriptions_from_witness(
    input_index: usize,
    witness_bytes: Vec<Vec<u8>>,
    txid: &str,
) -> Option<Vec<(OrdinalInscriptionRevealData, Inscription)>> {
    let witness = Witness::from_slice(&witness_bytes);
    let tapscript = witness.tapscript()?;
    let envelopes: Vec<Envelope<Inscription>> = Envelope::from_tapscript(tapscript, input_index)
        .ok()?
        .into_iter()
        .map(ParsedEnvelope::from)
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
        let inscription_content_bytes = envelope.payload.body().unwrap_or(&no_content_bytes);
        let mut content_bytes = "0x".to_string();
        content_bytes.push_str(&hex::encode(inscription_content_bytes));

        let parents = envelope
            .payload
            .parents()
            .iter()
            .map(|i| i.to_string())
            .collect();
        let delegate = envelope.payload.delegate().map(|i| i.to_string());
        let metaprotocol = envelope.payload.metaprotocol().map(|p| p.to_string());
        let metadata = envelope.payload.metadata().map(|m| json!(m));

        // Most of these fields will be calculated later when we know for certain which satoshi contains this inscription.
        let reveal_data = OrdinalInscriptionRevealData {
            content_type: envelope.payload.content_type().unwrap_or("").to_string(),
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
            parents,
            delegate,
            metaprotocol,
            metadata,
            ordinal_number: 0,
            ordinal_block_height: 0,
            ordinal_offset: 0,
            transfers_pre_inscription: 0,
            satpoint_post_inscription: String::new(),
            curse_type,
            charms: 0,
            unbound_sequence: None,
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
    config: &Config,
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
                if let Some(brc20) = config.ordinals_brc20_config() {
                    if brc20.enabled && block_identifier.index >= brc20_activation_height(network) {
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
                }
                operations.push(OrdinalOperation::InscriptionRevealed(reveal));
            }
        }
    }
    operations
}

pub fn parse_inscriptions_in_standardized_block(
    block: &mut BitcoinBlockData,
    brc20_operation_map: &mut HashMap<String, ParsedBrc20Operation>,
    config: &Config,
    ctx: &Context,
) {
    for tx in block.transactions.iter_mut() {
        tx.metadata.ordinal_operations = parse_inscriptions_from_standardized_tx(
            tx,
            &block.block_identifier,
            &block.metadata.network,
            brc20_operation_map,
            config,
            ctx,
        );
    }
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use bitcoind::{types::OrdinalOperation, utils::Context};
    use config::Config;

    use super::parse_inscriptions_in_standardized_block;
    use crate::core::test_builders::{TestBlockBuilder, TestTransactionBuilder, TestTxInBuilder};

    #[test]
    fn parses_inscriptions_in_block() {
        let ctx = Context::empty();
        let config = Config::test_default();
        let mut block = TestBlockBuilder::new()
            .add_transaction(
                TestTransactionBuilder::new()
                    .add_input(
                        TestTxInBuilder::new()
                            .witness(vec![
                                "0x6c00eb3c4d35fedd257051333b4ca81d1a25a37a9af4891f1fec2869edd56b14180eafbda8851d63138a724c9b15384bc5f0536de658bd294d426a36212e6f08".to_string(),
                                "0x209e2849b90a2353691fccedd467215c88eec89a5d0dcf468e6cf37abed344d746ac0063036f7264010118746578742f706c61696e3b636861727365743d7574662d38004c5e7b200a20202270223a20226272632d3230222c0a2020226f70223a20226465706c6f79222c0a2020227469636b223a20226f726469222c0a2020226d6178223a20223231303030303030222c0a2020226c696d223a202231303030220a7d68".to_string(),
                                "0xc19e2849b90a2353691fccedd467215c88eec89a5d0dcf468e6cf37abed344d746".to_string(),
                            ])
                            .build()
                    )
                    .build(),
            )
            .build();
        parse_inscriptions_in_standardized_block(&mut block, &mut HashMap::new(), &config, &ctx);
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
