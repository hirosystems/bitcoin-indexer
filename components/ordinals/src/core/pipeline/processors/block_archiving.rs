use bitcoind::{try_error, try_info, utils::Context};
use rocksdb::DB;

use crate::db::blocks::insert_entry_in_blocks;

pub fn store_compacted_blocks(
    mut compacted_blocks: Vec<(u64, Vec<u8>)>,
    update_tip: bool,
    blocks_db_rw: &DB,
    ctx: &Context,
) {
    compacted_blocks.sort_by(|(a, _), (b, _)| a.cmp(b));

    for (block_height, compacted_block) in compacted_blocks.into_iter() {
        insert_entry_in_blocks(
            block_height as u32,
            &compacted_block,
            update_tip,
            blocks_db_rw,
            ctx,
        );
        try_info!(ctx, "Block #{block_height} saved to disk");
    }

    if let Err(e) = blocks_db_rw.flush() {
        try_error!(ctx, "{}", e.to_string());
    }
}
