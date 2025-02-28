use chainhook_postgres::types::{PgNumericU128, PgNumericU64};

/// An update to a rune that affects its total counts.
#[derive(Debug, Clone)]
pub struct DbSupplyChange {
    pub rune_id: String,
    pub block_height: PgNumericU64,
    pub minted: PgNumericU128,
    pub total_mints: PgNumericU128,
    pub burned: PgNumericU128,
    pub total_burns: PgNumericU128,
    pub total_operations: PgNumericU128,
}

impl DbSupplyChange {
    pub fn from_mint(id: String, block_height: PgNumericU64, amount: PgNumericU128) -> Self {
        DbSupplyChange {
            rune_id: id,
            block_height,
            minted: amount,
            total_mints: PgNumericU128(1),
            burned: PgNumericU128(0),
            total_burns: PgNumericU128(0),
            total_operations: PgNumericU128(1),
        }
    }

    pub fn from_burn(id: String, block_height: PgNumericU64, amount: PgNumericU128) -> Self {
        DbSupplyChange {
            rune_id: id,
            block_height,
            minted: PgNumericU128(0),
            total_mints: PgNumericU128(0),
            burned: amount,
            total_burns: PgNumericU128(1),
            total_operations: PgNumericU128(1),
        }
    }

    pub fn from_operation(id: String, block_height: PgNumericU64) -> Self {
        DbSupplyChange {
            rune_id: id,
            block_height,
            minted: PgNumericU128(0),
            total_mints: PgNumericU128(0),
            burned: PgNumericU128(0),
            total_burns: PgNumericU128(0),
            total_operations: PgNumericU128(1),
        }
    }
}
