use postgres::types::{PgBigIntU32, PgNumericU128, PgNumericU64, PgSmallIntU8};
use ordinals::{Etching, Rune, RuneId, SpacedRune};
use tokio_postgres::Row;

use crate::db::cache::transaction_location::TransactionLocation;

/// A row in the `runes` table.
#[derive(Debug, Clone)]
pub struct DbRune {
    pub id: String,
    pub number: PgBigIntU32,
    pub name: String,
    pub spaced_name: String,
    pub block_hash: String,
    pub block_height: PgNumericU64,
    pub tx_index: PgBigIntU32,
    pub tx_id: String,
    pub divisibility: PgSmallIntU8,
    pub premine: PgNumericU128,
    pub symbol: String,
    pub terms_amount: Option<PgNumericU128>,
    pub terms_cap: Option<PgNumericU128>,
    pub terms_height_start: Option<PgNumericU64>,
    pub terms_height_end: Option<PgNumericU64>,
    pub terms_offset_start: Option<PgNumericU64>,
    pub terms_offset_end: Option<PgNumericU64>,
    pub turbo: bool,
    pub cenotaph: bool,
    pub timestamp: PgBigIntU32,
}

impl DbRune {
    pub fn from_etching(etching: &Etching, number: u32, location: &TransactionLocation) -> Self {
        let rune = etching
            .rune
            .unwrap_or(Rune::reserved(location.block_height, location.tx_index));
        let spaced_name = if let Some(spacers) = etching.spacers {
            let spaced_rune = SpacedRune::new(rune, spacers);
            spaced_rune.to_string()
        } else {
            rune.to_string()
        };
        let name = rune.to_string();
        let mut terms_amount = None;
        let mut terms_cap = None;
        let mut terms_height_start = None;
        let mut terms_height_end = None;
        let mut terms_offset_start = None;
        let mut terms_offset_end = None;
        if let Some(terms) = etching.terms {
            terms_amount = terms.amount.map(PgNumericU128);
            terms_cap = terms.cap.map(PgNumericU128);
            terms_height_start = terms.height.0.map(PgNumericU64);
            terms_height_end = terms.height.1.map(PgNumericU64);
            terms_offset_start = terms.offset.0.map(PgNumericU64);
            terms_offset_end = terms.offset.1.map(PgNumericU64);
        }
        DbRune {
            id: format!("{}:{}", location.block_height, location.tx_index),
            number: PgBigIntU32(number),
            name,
            spaced_name,
            block_hash: location.block_hash[2..].to_string(),
            block_height: PgNumericU64(location.block_height),
            tx_index: PgBigIntU32(location.tx_index),
            tx_id: location.tx_id[2..].to_string(),
            divisibility: etching
                .divisibility
                .map(PgSmallIntU8)
                .unwrap_or(PgSmallIntU8(0)),
            premine: etching
                .premine
                .map(PgNumericU128)
                .unwrap_or(PgNumericU128(0)),
            symbol: etching
                .symbol
                .map(|i| i.to_string().replace('\0', ""))
                .unwrap_or("¤".to_string()),
            terms_amount,
            terms_cap,
            terms_height_start,
            terms_height_end,
            terms_offset_start,
            terms_offset_end,
            turbo: etching.turbo,
            cenotaph: false,
            timestamp: PgBigIntU32(location.timestamp),
        }
    }

    pub fn from_cenotaph_etching(rune: &Rune, number: u32, location: &TransactionLocation) -> Self {
        DbRune {
            id: format!("{}:{}", location.block_height, location.tx_index),
            name: rune.to_string(),
            spaced_name: rune.to_string(),
            number: PgBigIntU32(number),
            block_hash: location.block_hash[2..].to_string(),
            block_height: PgNumericU64(location.block_height),
            tx_index: PgBigIntU32(location.tx_index),
            tx_id: location.tx_id[2..].to_string(),
            divisibility: PgSmallIntU8(0),
            premine: PgNumericU128(0),
            symbol: "".to_string(),
            terms_amount: None,
            terms_cap: None,
            terms_height_start: None,
            terms_height_end: None,
            terms_offset_start: None,
            terms_offset_end: None,
            turbo: false,
            cenotaph: true,
            timestamp: PgBigIntU32(location.timestamp),
        }
    }

    pub fn from_pg_row(row: &Row) -> Self {
        DbRune {
            id: row.get("id"),
            number: row.get("number"),
            name: row.get("name"),
            spaced_name: row.get("spaced_name"),
            block_hash: row.get("block_hash"),
            block_height: row.get("block_height"),
            tx_index: row.get("tx_index"),
            tx_id: row.get("tx_id"),
            divisibility: row.get("divisibility"),
            premine: row.get("premine"),
            symbol: row.get("symbol"),
            terms_amount: row.get("terms_amount"),
            terms_cap: row.get("terms_cap"),
            terms_height_start: row.get("terms_height_start"),
            terms_height_end: row.get("terms_height_end"),
            terms_offset_start: row.get("terms_offset_start"),
            terms_offset_end: row.get("terms_offset_end"),
            turbo: row.get("turbo"),
            cenotaph: row.get("cenotaph"),
            timestamp: row.get("timestamp"),
        }
    }

    pub fn rune_id(&self) -> RuneId {
        RuneId {
            block: self.block_height.0,
            tx: self.tx_index.0,
        }
    }
}

#[cfg(test)]
impl DbRune {
    pub fn factory() -> Self {
        DbRune {
            id: "840000:1".to_string(),
            number: PgBigIntU32(1),
            name: "ZZZZZFEHUZZZZZ".to_string(),
            spaced_name: "Z•Z•Z•Z•Z•FEHU•Z•Z•Z•Z•Z".to_string(),
            block_hash: "0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5"
                .to_string(),
            block_height: PgNumericU64(840000),
            tx_index: PgBigIntU32(1),
            tx_id: "2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e".to_string(),
            divisibility: PgSmallIntU8(2),
            premine: PgNumericU128(11000000000),
            symbol: "ᚠ".to_string(),
            terms_amount: Some(PgNumericU128(100)),
            terms_cap: Some(PgNumericU128(1111111)),
            terms_height_start: None,
            terms_height_end: None,
            terms_offset_start: None,
            terms_offset_end: None,
            turbo: true,
            cenotaph: false,
            timestamp: PgBigIntU32(1713571767),
        }
    }

    pub fn terms_height_start(&mut self, val: Option<PgNumericU64>) -> &Self {
        self.terms_height_start = val;
        self
    }

    pub fn terms_height_end(&mut self, val: Option<PgNumericU64>) -> &Self {
        self.terms_height_end = val;
        self
    }

    pub fn terms_offset_start(&mut self, val: Option<PgNumericU64>) -> &Self {
        self.terms_offset_start = val;
        self
    }

    pub fn terms_offset_end(&mut self, val: Option<PgNumericU64>) -> &Self {
        self.terms_offset_end = val;
        self
    }

    pub fn terms_cap(&mut self, val: Option<PgNumericU128>) -> &Self {
        self.terms_cap = val;
        self
    }
}

#[cfg(test)]
mod test {
    use std::str::FromStr;

    use ordinals::{Etching, SpacedRune, Terms};

    use super::DbRune;
    use crate::db::cache::transaction_location::TransactionLocation;

    #[test]
    fn test_from_etching() {
        let rune = SpacedRune::from_str("UNCOMMON•GOODS").unwrap();
        let db_rune = DbRune::from_etching(
            &Etching {
                divisibility: Some(0),
                premine: Some(0),
                rune: Some(rune.rune),
                spacers: Some(rune.spacers),
                symbol: Some('⧉'),
                terms: Some(Terms {
                    amount: Some(1),
                    cap: Some(u128::max_value()),
                    height: (Some(840000), Some(1050000)),
                    offset: (None, None),
                }),
                turbo: false,
            },
            0,
            &TransactionLocation {
                network: bitcoin::Network::Bitcoin,
                block_hash: "00000000000000000000d2845e9e48d356e89fd3b2e1f3da668ffc04c7dfe298"
                    .to_string(),
                block_height: 1,
                tx_index: 0,
                tx_id: "14e87956a6bb0f50df1515e85f1dcc4625a7e2ebeb08ab6db7d9211c7cf64fa3"
                    .to_string(),
                timestamp: 0,
            },
        );
        assert!(db_rune.name == "UNCOMMONGOODS");
        assert!(db_rune.spaced_name == "UNCOMMON•GOODS");
    }
}
