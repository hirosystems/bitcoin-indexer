use ordinals_parser::RuneId;
use postgres::types::{PgBigIntU32, PgNumericU128, PgNumericU64};
use tokio_postgres::Row;

use super::db_ledger_operation::DbLedgerOperation;

/// A row in the `ledger` table.
#[derive(Debug, Clone)]
pub struct DbLedgerEntry {
    pub rune_id: String,
    pub block_hash: String,
    pub block_height: PgNumericU64,
    pub tx_index: PgBigIntU32,
    pub event_index: PgBigIntU32,
    pub tx_id: String,
    pub output: Option<PgBigIntU32>,
    pub address: Option<String>,
    pub receiver_address: Option<String>,
    pub amount: Option<PgNumericU128>,
    pub operation: DbLedgerOperation,
    pub timestamp: PgBigIntU32,
}

impl DbLedgerEntry {
    pub fn from_values(
        amount: Option<u128>,
        rune_id: RuneId,
        block_hash: &String,
        block_height: u64,
        tx_index: u32,
        event_index: u32,
        tx_id: &String,
        output: Option<u32>,
        address: Option<&String>,
        receiver_address: Option<&String>,
        operation: DbLedgerOperation,
        timestamp: u32,
    ) -> Self {
        DbLedgerEntry {
            rune_id: rune_id.to_string(),
            block_hash: block_hash[2..].to_string(),
            block_height: PgNumericU64(block_height),
            tx_index: PgBigIntU32(tx_index),
            event_index: PgBigIntU32(event_index),
            tx_id: tx_id[2..].to_string(),
            output: output.map(PgBigIntU32),
            address: address.cloned(),
            receiver_address: receiver_address.cloned(),
            amount: amount.map(PgNumericU128),
            operation,
            timestamp: PgBigIntU32(timestamp),
        }
    }

    pub fn from_pg_row(row: &Row) -> Self {
        DbLedgerEntry {
            rune_id: row.get("rune_id"),
            block_hash: row.get("block_hash"),
            block_height: row.get("block_height"),
            tx_index: row.get("tx_index"),
            event_index: row.get("event_index"),
            tx_id: row.get("tx_id"),
            output: row.get("output"),
            address: row.get("address"),
            receiver_address: row.get("receiver_address"),
            amount: row.get("amount"),
            operation: row.get("operation"),
            timestamp: row.get("timestamp"),
        }
    }
}
