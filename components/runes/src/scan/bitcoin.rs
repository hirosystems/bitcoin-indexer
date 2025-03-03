use chainhook_sdk::{
    indexer::bitcoin::{
        build_http_client, download_and_parse_block_with_retry, retrieve_block_hash_with_retry,
        standardize_bitcoin_block,
    },
    utils::{bitcoind::bitcoind_get_block_height, BlockHeights, Context},
};
use chainhook_types::BitcoinNetwork;
use config::Config;
use tokio_postgres::Client;

use crate::{
    db::{
        cache::index_cache::IndexCache,
        index::{index_block, roll_back_block},
    },
    try_info,
};

pub async fn drop_blocks(start_block: u64, end_block: u64, pg_client: &mut Client, ctx: &Context) {
    for block in start_block..=end_block {
        roll_back_block(pg_client, block, ctx).await;
    }
}

pub async fn scan_blocks(
    blocks: Vec<u64>,
    config: &Config,
    pg_client: &mut Client,
    index_cache: &mut IndexCache,
    ctx: &Context,
) -> Result<(), String> {
    let block_heights_to_scan_res = BlockHeights::Blocks(blocks).get_sorted_entries();
    let mut block_heights_to_scan =
        block_heights_to_scan_res.map_err(|_e| format!("Block start / end block spec invalid"))?;

    try_info!(
        ctx,
        "Scanning {} Bitcoin blocks",
        block_heights_to_scan.len()
    );
    let bitcoin_config = config.bitcoind.clone();
    let mut number_of_blocks_scanned = 0;
    let http_client = build_http_client();

    while let Some(current_block_height) = block_heights_to_scan.pop_front() {
        number_of_blocks_scanned += 1;

        let block_hash = retrieve_block_hash_with_retry(
            &http_client,
            &current_block_height,
            &bitcoin_config,
            ctx,
        )
        .await?;
        let raw_block =
            download_and_parse_block_with_retry(&http_client, &block_hash, &bitcoin_config, ctx)
                .await?;
        let mut block = standardize_bitcoin_block(
            raw_block,
            &BitcoinNetwork::from_network(bitcoin_config.network),
            ctx,
        )
        .unwrap();

        index_block(pg_client, index_cache, &mut block, ctx).await;

        if block_heights_to_scan.is_empty() {
            let bitcoind_tip = bitcoind_get_block_height(&config.bitcoind, ctx);
            let new_tip = match block_heights_to_scan.back() {
                Some(end_block) => {
                    if *end_block > bitcoind_tip {
                        bitcoind_tip
                    } else {
                        *end_block
                    }
                }
                None => bitcoind_tip,
            };
            for entry in (current_block_height + 1)..new_tip {
                block_heights_to_scan.push_back(entry);
            }
        }
    }
    try_info!(ctx, "{number_of_blocks_scanned} blocks scanned");

    Ok(())
}
