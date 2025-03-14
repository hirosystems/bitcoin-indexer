use postgres::types::{PgBigIntU32, PgNumericU128, PgNumericU64};

#[derive(Debug, Clone)]
pub struct DbBalanceChange {
    pub rune_id: String,
    pub block_height: PgNumericU64,
    pub address: String,
    pub balance: PgNumericU128,
    pub total_operations: PgBigIntU32,
}

impl DbBalanceChange {
    pub fn from_operation(
        rune_id: String,
        block_height: PgNumericU64,
        address: String,
        balance: PgNumericU128,
    ) -> Self {
        DbBalanceChange {
            rune_id,
            block_height,
            address,
            balance,
            total_operations: PgBigIntU32(1),
        }
    }
}
