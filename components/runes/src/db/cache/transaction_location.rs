use std::fmt;

use bitcoin::Network;
use ordinals_parser::RuneId;

#[derive(Debug, Clone)]
pub struct TransactionLocation {
    pub network: Network,
    pub block_hash: String,
    pub block_height: u64,
    pub timestamp: u32,
    pub tx_index: u32,
    pub tx_id: String,
}

impl TransactionLocation {
    pub fn rune_id(&self) -> RuneId {
        RuneId {
            block: self.block_height,
            tx: self.tx_index,
        }
    }
}

impl fmt::Display for TransactionLocation {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "tx: {} ({}) @{}",
            self.tx_id, self.tx_index, self.block_height
        )
    }
}

#[cfg(test)]
impl TransactionLocation {
    pub fn dummy() -> Self {
        TransactionLocation {
            network: Network::Bitcoin,
            block_hash: "0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5"
                .to_string(),
            block_height: 840000,
            timestamp: 1713571767,
            tx_index: 0,
            tx_id: "2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e".to_string(),
        }
    }

    pub fn block_height(&mut self, val: u64) -> &Self {
        self.block_height = val;
        self
    }
}
