use bitcoind::types::{
    BlockIdentifier, OrdinalInscriptionCurseType, OrdinalInscriptionRevealData,
    TransactionIdentifier,
};
use postgres::{
    types::{PgBigIntU32, PgNumericU64},
    FromPgRow,
};
use tokio_postgres::Row;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DbInscription {
    pub inscription_id: String,
    pub ordinal_number: PgNumericU64,
    pub number: i64,
    pub classic_number: i64,
    pub block_height: PgNumericU64,
    pub block_hash: String,
    pub tx_id: String,
    pub tx_index: PgBigIntU32,
    pub address: Option<String>,
    pub mime_type: String,
    pub content_type: String,
    pub content_length: PgBigIntU32,
    pub content: Vec<u8>,
    pub fee: PgNumericU64,
    pub curse_type: Option<String>,
    pub recursive: bool,
    pub input_index: PgBigIntU32,
    pub pointer: Option<PgNumericU64>,
    pub metadata: Option<String>,
    pub metaprotocol: Option<String>,
    pub delegate: Option<String>,
    pub timestamp: PgBigIntU32,
    pub charms: PgBigIntU32,
    pub unbound_sequence: Option<i64>,
}

impl DbInscription {
    pub fn from_reveal(
        reveal: &OrdinalInscriptionRevealData,
        block_identifier: &BlockIdentifier,
        tx_identifier: &TransactionIdentifier,
        tx_index: usize,
        timestamp: u32,
    ) -> Self {
        // Remove null bytes from `content_type`
        let mut content_type_bytes = reveal.content_type.clone().into_bytes();
        content_type_bytes.retain(|&x| x != 0);
        let content_type = String::from_utf8(content_type_bytes).unwrap();
        DbInscription {
            inscription_id: reveal.inscription_id.clone(),
            ordinal_number: PgNumericU64(reveal.ordinal_number),
            number: reveal.inscription_number.jubilee,
            classic_number: reveal.inscription_number.classic,
            block_height: PgNumericU64(block_identifier.index),
            block_hash: block_identifier.hash[2..].to_string(),
            tx_id: tx_identifier.hash[2..].to_string(),
            tx_index: PgBigIntU32(tx_index as u32),
            address: reveal.inscriber_address.clone(),
            mime_type: content_type.split(';').nth(0).unwrap().to_string(),
            content_type,
            content_length: PgBigIntU32(reveal.content_length as u32),
            content: hex::decode(&reveal.content_bytes[2..]).unwrap(),
            fee: PgNumericU64(reveal.inscription_fee),
            curse_type: reveal.curse_type.as_ref().map(|c| match c {
                OrdinalInscriptionCurseType::DuplicateField => "duplicate_field".to_string(),
                OrdinalInscriptionCurseType::IncompleteField => "incomplete_field".to_string(),
                OrdinalInscriptionCurseType::NotAtOffsetZero => "not_at_offset_zero".to_string(),
                OrdinalInscriptionCurseType::NotInFirstInput => "not_in_first_input".to_string(),
                OrdinalInscriptionCurseType::Pointer => "pointer".to_string(),
                OrdinalInscriptionCurseType::Pushnum => "pushnum".to_string(),
                OrdinalInscriptionCurseType::Reinscription => "reinscription".to_string(),
                OrdinalInscriptionCurseType::Stutter => "stutter".to_string(),
                OrdinalInscriptionCurseType::UnrecognizedEvenField => {
                    "unrecognized_field".to_string()
                }
                OrdinalInscriptionCurseType::Generic => "generic".to_string(),
            }),
            recursive: false, // This will be determined later
            input_index: PgBigIntU32(reveal.inscription_input_index as u32),
            pointer: reveal.inscription_pointer.map(PgNumericU64),
            metadata: reveal.metadata.as_ref().map(|m| m.to_string()),
            metaprotocol: reveal.metaprotocol.clone(),
            delegate: reveal.delegate.clone(),
            timestamp: PgBigIntU32(timestamp),
            charms: PgBigIntU32(reveal.charms as u32),
            unbound_sequence: reveal.unbound_sequence,
        }
    }
}

impl FromPgRow for DbInscription {
    fn from_pg_row(row: &Row) -> Self {
        DbInscription {
            inscription_id: row.get("inscription_id"),
            ordinal_number: row.get("ordinal_number"),
            number: row.get("number"),
            classic_number: row.get("classic_number"),
            block_height: row.get("block_height"),
            block_hash: row.get("block_hash"),
            tx_id: row.get("tx_id"),
            tx_index: row.get("tx_index"),
            address: row.get("address"),
            mime_type: row.get("mime_type"),
            content_type: row.get("content_type"),
            content_length: row.get("content_length"),
            content: row.get("content"),
            fee: row.get("fee"),
            curse_type: row.get("curse_type"),
            recursive: row.get("recursive"),
            input_index: row.get("input_index"),
            pointer: row.get("pointer"),
            metadata: row.get("metadata"),
            metaprotocol: row.get("metaprotocol"),
            delegate: row.get("delegate"),
            timestamp: row.get("timestamp"),
            charms: row.get("charms"),
            unbound_sequence: row.get("unbound_sequence"),
        }
    }
}
