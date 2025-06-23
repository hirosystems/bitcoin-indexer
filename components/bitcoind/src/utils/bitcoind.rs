use std::{thread::sleep, time::Duration};

use bitcoincore_rpc::{
    bitcoin::{BlockHash, Txid},
    Auth, Client, RpcApi,
};
use bitcoincore_rpc_json::GetRawTransactionResult;
use config::BitcoindConfig;

use crate::{try_error, try_info, types::BlockIdentifier, utils::Context};

fn bitcoind_get_client(config: &BitcoindConfig, ctx: &Context) -> Client {
    loop {
        let auth = Auth::UserPass(config.rpc_username.clone(), config.rpc_password.clone());
        match Client::new(&config.rpc_url, auth) {
            Ok(con) => {
                return con;
            }
            Err(e) => {
                try_error!(ctx, "bitcoind: Unable to get client: {}", e.to_string());
                sleep(Duration::from_secs(1));
            }
        }
    }
}

/// Retrieves the chain tip from bitcoind.
pub fn bitcoind_get_chain_tip(config: &BitcoindConfig, ctx: &Context) -> BlockIdentifier {
    let bitcoin_rpc = bitcoind_get_client(config, ctx);
    loop {
        match bitcoin_rpc.get_blockchain_info() {
            Ok(result) => {
                return BlockIdentifier {
                    index: result.blocks,
                    hash: format!("0x{}", result.best_block_hash),
                };
            }
            Err(e) => {
                try_error!(
                    ctx,
                    "bitcoind: Unable to get block height: {}",
                    e.to_string()
                );
                sleep(Duration::from_secs(1));
            }
        };
    }
}

pub fn bitcoind_get_block_height(
    config: &BitcoindConfig,
    ctx: &Context,
    blockhash: &BlockHash,
) -> u32 {
    let bitcoin_rpc = bitcoind_get_client(config, ctx);
    loop {
        match bitcoin_rpc.get_block_header_info(blockhash) {
            Ok(result) => {
                return result.height.try_into().unwrap();
            }
            Err(e) => {
                try_error!(
                    ctx,
                    "bitcoind: Unable to get block header info: {}",
                    e.to_string()
                );
                sleep(Duration::from_secs(1));
            }
        };
    }
}

pub fn bitcoin_get_raw_transaction(
    config: &BitcoindConfig,
    ctx: &Context,
    txid: &Txid,
) -> Option<GetRawTransactionResult> {
    let bitcoin_rpc = bitcoind_get_client(config, ctx);
    // TODO: add test
    let mut tries = 0;
    loop {
        match bitcoin_rpc.get_raw_transaction_info(txid, None) {
            Ok(result) => {
                return Some(result);
            }
            Err(e) => {
                tries += 1;
                if tries > 10 {
                    return None;
                }
                try_error!(
                    ctx,
                    "bitcoind: Unable to get block height: {}",
                    e.to_string()
                );
                sleep(Duration::from_secs(1));
            }
        };
    }
}

/// Checks if bitcoind is still synchronizing blocks and waits until it's finished if that is the case.
pub fn bitcoind_wait_for_chain_tip(config: &BitcoindConfig, ctx: &Context) -> BlockIdentifier {
    let bitcoin_rpc = bitcoind_get_client(config, ctx);
    let mut confirmations = 0;
    loop {
        match bitcoin_rpc.get_blockchain_info() {
            Ok(result) => {
                if !result.initial_block_download && result.blocks == result.headers {
                    confirmations += 1;
                    // Wait for 10 confirmations before declaring node is at chain tip, just in case it's still connecting to
                    // peers.
                    if confirmations == 10 {
                        try_info!(ctx, "bitcoind: Chain tip reached");
                        return BlockIdentifier {
                            index: result.blocks,
                            hash: format!("0x{}", result.best_block_hash),
                        };
                    }
                    try_info!(ctx, "bitcoind: Verifying chain tip");
                } else {
                    confirmations = 0;
                    try_info!(
                        ctx,
                        "bitcoind: Node has not reached chain tip, trying again"
                    );
                }
            }
            Err(e) => {
                try_error!(
                    ctx,
                    "bitcoind: Unable to check for chain tip: {}",
                    e.to_string()
                );
            }
        };
        sleep(Duration::from_secs(1));
    }
}
