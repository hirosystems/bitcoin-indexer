use base58::FromBase58;
use bitcoincore_rpc::bitcoin::blockdata::{opcodes, script::Builder as BitcoinScriptBuilder};

use crate::types::{
    bitcoin::{OutPoint, TxIn, TxOut},
    BitcoinTransactionData, BitcoinTransactionMetadata, TransactionIdentifier,
};

pub fn generate_test_tx_bitcoin_p2pkh_transfer(
    txid: u64,
    _sender: &str,
    recipient: &str,
    amount: u64,
) -> BitcoinTransactionData {
    let mut hash = vec![
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    hash.append(&mut txid.to_be_bytes().to_vec());

    // Preparing metadata
    let pubkey_hash = recipient
        .from_base58()
        .expect("Unable to get bytes from btc address");
    let slice = [
        pubkey_hash[1],
        pubkey_hash[2],
        pubkey_hash[3],
        pubkey_hash[4],
        pubkey_hash[5],
        pubkey_hash[6],
        pubkey_hash[7],
        pubkey_hash[8],
        pubkey_hash[9],
        pubkey_hash[10],
        pubkey_hash[11],
        pubkey_hash[12],
        pubkey_hash[13],
        pubkey_hash[14],
        pubkey_hash[15],
        pubkey_hash[16],
        pubkey_hash[17],
        pubkey_hash[18],
        pubkey_hash[19],
        pubkey_hash[20],
    ];
    let script = BitcoinScriptBuilder::new()
        .push_opcode(opcodes::all::OP_DUP)
        .push_opcode(opcodes::all::OP_HASH160)
        .push_slice(slice)
        .push_opcode(opcodes::all::OP_EQUALVERIFY)
        .push_opcode(opcodes::all::OP_CHECKSIG)
        .into_script();
    let outputs = vec![TxOut {
        value: amount,
        script_pubkey: format!("0x{}", hex::encode(script.as_bytes())),
    }];

    BitcoinTransactionData {
        transaction_identifier: TransactionIdentifier {
            hash: format!("0x{}", hex::encode(&hash[..])),
        },
        operations: vec![],
        metadata: BitcoinTransactionMetadata {
            inputs: vec![],
            outputs,
            ordinal_operations: vec![],
            brc20_operation: None,
            proof: None,
            fee: 0,
            index: 0,
        },
    }
}

pub fn generate_test_tx_runes_etch_invalid() -> BitcoinTransactionData {
    // Real transaction hash from the provided tx
    let hash = hex::decode("77ef042e7f21b5be529bbb6175082a5fd23455523b3554647d69623f5e736721")
        .expect("Invalid hash");

    // Input from the real transaction
    let input = TxIn {
        previous_output: OutPoint {
            txid: TransactionIdentifier { hash: ("9eef461fb1c29a14b072c31e12802e15e754922b9dee1bb4eb2c8234c3c877c8".to_string()) },
            vout: 0,
            value: 1833,
            block_height: 874948,
        },
        script_sig: "".to_string(),
        sequence: 4294967293,
        witness: vec![
            "adbfed3b70dfb3907f1b481ab9065383bd7d871695b59adabb7d4e6e478d28fb3a789abf5dd1398d1dcd66dbb1abf29e027e0aeb5885b91d6f41f3b4f63162fe".to_string(),
            "2048d89af33044a9ca1356b33f702e7d6b24729dc5af989458166df17d9196a2b3ac0063036f7264010118746578742f706c61696e3b636861727365743d7574662d38010200010d0a51639dce06c02d18180200104557475257454742534752574547464268".to_string(),
            "c048d89af33044a9ca1356b33f702e7d6b24729dc5af989458166df17d9196a2b3".to_string(),
        ],
    };

    // Outputs from the real transaction
    let outputs = vec![
        TxOut {
            value: 0,
            script_pubkey: "0x6a5d1e020704d1c6f5f4ec80f09698b008010203880806c0843d0a6408e8071601"
                .to_string(),
        },
        TxOut {
            value: 546,
            script_pubkey: "0x0014267e8b1829ba64346ae83dfe32aead14fd339f3d".to_string(),
        },
    ];

    BitcoinTransactionData {
        transaction_identifier: TransactionIdentifier {
            hash: format!("0x{}", hex::encode(&hash)),
        },
        operations: vec![],
        metadata: BitcoinTransactionMetadata {
            inputs: vec![input],
            outputs,
            ordinal_operations: vec![],
            brc20_operation: None,
            proof: None,
            fee: 1287,
            index: 0,
        },
    }
}

pub fn generate_test_tx_runes_etch_valid() -> BitcoinTransactionData {
    // Real transaction hash from the provided tx
    let hash = hex::decode("13a0ea6d76b710a1a9cdf2d8ce37c53feaaf985386f14ba3e65c544833c00a47")
        .expect("Invalid hash");

    // Input from the real transaction
    let input = TxIn {
        previous_output: OutPoint {
            txid: TransactionIdentifier { hash: ("4ecb81b622075b0285f6789614e75ab6ead36cfbcb909e6176510aee33b73705".to_string()) },
            vout: 0,
            value: 1833,
            block_height: 874972,
        },
        script_sig: "".to_string(),
        sequence: 4294967293,
        witness: vec![
            "0f79d055e4ac27887e86a804130c1ef1d29e5c21435626fbd7b1319cbf18832fdd30837e8ba5089650faed99d0b88ab165f3321156ca9ee2a3d2af73ecac0c40".to_string(),
            "2048d89af33044a9ca1356b33f702e7d6b24729dc5af989458166df17d9196a2b3ac0063036f72645d0a51639dce06c02d181802010118746578742f706c61696e3b636861727365743d7574662d3800104557475257454742534752574547464268".to_string(),
            "c048d89af33044a9ca1356b33f702e7d6b24729dc5af989458166df17d9196a2b3".to_string(),
        ],
    };

    // Outputs from the real transaction
    let outputs = vec![
        TxOut {
            value: 546,
            script_pubkey: "0x0014a33fd0cd58d75671accf6cc2522cd275c088148f".to_string(),
        },
        TxOut {
            value: 546,
            script_pubkey: "0x0014a33fd0cd58d75671accf6cc2522cd275c088148f".to_string(),
        },
        TxOut {
            value: 0,
            script_pubkey:
                "0x6a5d20020704d1c6f5f4ec80f09698b0080102038808052406904e0a904e08e8071601"
                    .to_string(),
        },
    ];

    BitcoinTransactionData {
        transaction_identifier: TransactionIdentifier {
            hash: format!("0x{}", hex::encode(&hash)),
        },
        operations: vec![],
        metadata: BitcoinTransactionMetadata {
            inputs: vec![input],
            outputs,
            ordinal_operations: vec![],
            brc20_operation: None,
            proof: None,
            fee: 741,
            index: 1,
        },
    }
}
