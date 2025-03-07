use std::{cmp::Ordering, sync::mpsc::channel};

use chainhook_sdk::{
    observer::{start_event_observer, BitcoinBlockDataCached, ObserverEvent, ObserverSidecar},
    utils::{bitcoind::bitcoind_get_block_height, Context},
};
use chainhook_types::BlockIdentifier;
use config::Config;
use crossbeam_channel::select;

use crate::{
    db::{
        cache::index_cache::IndexCache,
        index::{get_rune_genesis_block_height, index_block, roll_back_block},
        pg_connect, pg_get_block_height,
    },
    scan::bitcoin::scan_blocks,
    try_error, try_info,
};

pub async fn get_index_chain_tip(config: &Config, ctx: &Context) -> u64 {
    let mut pg_client = pg_connect(config, true, ctx).await;
    pg_get_block_height(&mut pg_client, ctx)
        .await
        .unwrap_or(get_rune_genesis_block_height(config.bitcoind.network) - 1)
}

pub async fn catch_up_to_bitcoin_chain_tip(config: &Config, ctx: &Context) -> Result<(), String> {
    let mut pg_client = pg_connect(config, true, ctx).await;
    let mut index_cache = IndexCache::new(config, &mut pg_client, ctx).await;
    loop {
        let chain_tip = pg_get_block_height(&mut pg_client, ctx)
            .await
            .unwrap_or(get_rune_genesis_block_height(config.bitcoind.network) - 1);
        let bitcoind_chain_tip = bitcoind_get_block_height(&config.bitcoind, ctx);
        match bitcoind_chain_tip.cmp(&chain_tip) {
            Ordering::Less => {
                try_info!(
                    ctx,
                    "Waiting for bitcoind to reach height {}, currently at {}",
                    chain_tip,
                    bitcoind_chain_tip
                );
                std::thread::sleep(std::time::Duration::from_secs(10));
            }
            Ordering::Greater => {
                try_info!(
                    ctx,
                    "Block height is behind bitcoind, scanning block range {} to {}",
                    chain_tip + 1,
                    bitcoind_chain_tip
                );
                scan_blocks(
                    ((chain_tip + 1)..=bitcoind_chain_tip).collect(),
                    config,
                    &mut pg_client,
                    &mut index_cache,
                    ctx,
                )
                .await?;
            }
            Ordering::Equal => {
                try_info!(ctx, "Caught up to bitcoind chain tip at {}", chain_tip);
                break;
            }
        }
    }
    Ok(())
}

pub async fn start_service(config: &Config, ctx: &Context) -> Result<(), String> {
    catch_up_to_bitcoin_chain_tip(config, ctx).await?;

    // Start chainhook event observer, we're at chain tip.
    let (observer_cmd_tx, observer_cmd_rx) = channel();
    let (observer_event_tx, observer_event_rx) = crossbeam_channel::unbounded();
    let observer_sidecar = set_up_observer_sidecar_runloop(config, ctx)
        .await
        .expect("unable to set up observer sidecar");
    let event_observer_config = config.bitcoind.clone();
    let context = ctx.clone();
    let observer_cmd_tx_moved = observer_cmd_tx.clone();

    let _ = std::thread::spawn(move || {
        start_event_observer(
            event_observer_config,
            observer_cmd_tx_moved,
            observer_cmd_rx,
            Some(observer_event_tx),
            Some(observer_sidecar),
            context,
        )
        .expect("unable to start Stacks chain observer");
    });
    try_info!(ctx, "Listening for new blocks via Chainhook SDK");

    loop {
        let event = match observer_event_rx.recv() {
            Ok(cmd) => cmd,
            Err(e) => {
                try_error!(ctx, "Error: broken channel {}", e.to_string());
                break;
            }
        };
        if let ObserverEvent::Terminate = event {
            try_info!(ctx, "Received termination event from Chainhook SDK");
            break;
        }
    }
    Ok(())
}

pub async fn set_up_observer_sidecar_runloop(
    config: &Config,
    ctx: &Context,
) -> Result<ObserverSidecar, String> {
    // Sidecar will be receiving blocks to mutate
    let (block_mutator_in_tx, block_mutator_in_rx) = crossbeam_channel::unbounded();
    // Sidecar will be sending mutated blocks back to chainhook-sdk
    let (block_mutator_out_tx, block_mutator_out_rx) = crossbeam_channel::unbounded();
    // HandleBlock
    let (chain_event_notifier_tx, chain_event_notifier_rx) = crossbeam_channel::unbounded();
    let observer_sidecar = ObserverSidecar {
        bitcoin_blocks_mutator: Some((block_mutator_in_tx, block_mutator_out_rx)),
        bitcoin_chain_event_notifier: Some(chain_event_notifier_tx),
    };
    let ctx = ctx.clone();
    let config = config.clone();

    let _ = hiro_system_kit::thread_named("Observer Sidecar Runloop").spawn(move || {
        hiro_system_kit::nestable_block_on(async {
            let mut index_cache =
                IndexCache::new(&config, &mut pg_connect(&config, false, &ctx).await, &ctx).await;
            loop {
                select! {
                    recv(block_mutator_in_rx) -> msg => {
                        if let Ok((mut blocks_to_mutate, blocks_ids_to_rollback)) = msg {
                            chainhook_sidecar_mutate_blocks(
                                &mut index_cache,
                                &mut blocks_to_mutate,
                                &blocks_ids_to_rollback,
                                &config,
                                &ctx,
                            ).await;
                            let _ = block_mutator_out_tx.send(blocks_to_mutate);
                        }
                    }
                    recv(chain_event_notifier_rx) -> msg => {
                        if let Ok(_command) = msg {
                            // We don't need to do anything here because we already indexed the block during the mutation above.
                        }
                    }
                }
            }
        });
    });

    Ok(observer_sidecar)
}

pub async fn chainhook_sidecar_mutate_blocks(
    index_cache: &mut IndexCache,
    blocks_to_mutate: &mut [BitcoinBlockDataCached],
    block_ids_to_rollback: &[BlockIdentifier],
    config: &Config,
    ctx: &Context,
) {
    try_info!(ctx, "Received mutate blocks message from Chainhook SDK");
    let mut pg_client = pg_connect(config, false, ctx).await;
    for block_id in block_ids_to_rollback.iter() {
        roll_back_block(&mut pg_client, block_id.index, ctx).await;
    }
    for cache in blocks_to_mutate.iter_mut() {
        if !cache.processed_by_sidecar {
            index_block(&mut pg_client, index_cache, &mut cache.block, ctx).await;
            cache.processed_by_sidecar = true;
        }
    }
}
