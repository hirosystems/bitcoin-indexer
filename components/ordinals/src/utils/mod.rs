pub mod monitoring;

use bitcoind::types::TransactionIdentifier;

pub fn format_inscription_id(
    transaction_identifier: &TransactionIdentifier,
    inscription_subindex: usize,
) -> String {
    format!(
        "{}i{}",
        transaction_identifier.get_hash_bytes_str(),
        inscription_subindex,
    )
}

pub fn format_outpoint_to_watch(
    transaction_identifier: &TransactionIdentifier,
    output_index: usize,
) -> String {
    format!(
        "{}:{}",
        transaction_identifier.get_hash_bytes_str(),
        output_index
    )
}
