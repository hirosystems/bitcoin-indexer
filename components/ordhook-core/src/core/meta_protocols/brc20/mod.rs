use chainhook_sdk::types::BitcoinNetwork;

pub mod db;
pub mod parser;
pub mod verifier;
pub mod cache;
pub mod test_utils;

pub fn brc20_activation_height(network: &BitcoinNetwork) -> u64 {
    match network {
        BitcoinNetwork::Mainnet => 779832,
        BitcoinNetwork::Regtest => todo!(),
        BitcoinNetwork::Testnet => todo!(),
        BitcoinNetwork::Signet => todo!(),
    }
}

pub fn brc20_self_mint_activation_height(network: &BitcoinNetwork) -> u64 {
    match network {
        BitcoinNetwork::Mainnet => 837090,
        BitcoinNetwork::Regtest => todo!(),
        BitcoinNetwork::Testnet => todo!(),
        BitcoinNetwork::Signet => todo!(),
    }
}
