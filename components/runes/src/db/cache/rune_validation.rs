use std::str::FromStr;

use bitcoin::{Script, Transaction, Witness};
use bitcoind::{
    bitcoincore_rpc,
    utils::{
        bitcoind::{bitcoin_get_raw_transaction, bitcoind_get_block_height},
        Context,
    },
};
use config::BitcoindConfig;
use ordinals_parser::{Rune, Runestone};

fn unversioned_leaf_script_from_witness(witness: &Witness) -> Option<&Script> {
    #[allow(deprecated)]
    witness.tapscript()
}

pub fn is_reserved(rune: &Rune) -> bool {
    rune.0 >= Rune::RESERVED
}

pub async fn tx_commits_to_rune(
    config: &BitcoindConfig,
    ctx: &Context,
    tx: &Transaction,
    rune: &Rune,
    reveal_block_height: u32,
) -> Result<bool, Box<dyn std::error::Error>> {
    let commitment = rune.commitment();

    for input in &tx.input {
        // extracting a tapscript does not indicate that the input being spent
        // was actually a taproot output. this is checked below, when we load the
        // output's entry from the database
        let Some(tapscript) = unversioned_leaf_script_from_witness(&input.witness) else {
            continue;
        };

        for instruction in tapscript.instructions() {
            // ignore errors, since the extracted script may not be valid
            let Ok(instruction) = instruction else {
                break;
            };

            let Some(pushbytes) = instruction.push_bytes() else {
                continue;
            };

            if pushbytes.as_bytes() != commitment {
                continue;
            }

            let txid =
                bitcoincore_rpc::bitcoin::Txid::from_str(&input.previous_output.txid.to_string())
                    .unwrap();

            let Some(commit_tx_info) = bitcoin_get_raw_transaction(config, ctx, &txid) else {
                panic!(
                    "can't get input transaction: {}",
                    input.previous_output.txid
                );
            };

            let taproot = commit_tx_info.vout[input.previous_output.vout as usize]
                .script_pub_key
                .script()?
                .is_p2tr();

            if !taproot {
                continue;
            }

            let commit_tx_height =
                bitcoind_get_block_height(config, ctx, &commit_tx_info.blockhash.unwrap());

            let confirmations = reveal_block_height.checked_sub(commit_tx_height).unwrap() + 1;
            if confirmations >= u32::from(Runestone::COMMIT_CONFIRMATIONS) {
                return Ok(true);
            }
        }
    }

    Ok(false)
}
