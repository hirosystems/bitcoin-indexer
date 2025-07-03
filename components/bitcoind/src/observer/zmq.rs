use config::Config;
use zmq::Socket;

use crate::{
    indexer::{
        bitcoin::{
            build_http_client, cursor::BlockBytesCursor, download_and_parse_block_with_retry,
            standardize_bitcoin_block,
        },
        BlockProcessor, BlockProcessorCommand,
    },
    try_info, try_warn,
    types::BitcoinNetwork,
    utils::Context,
};

fn new_zmq_socket() -> Socket {
    let context = zmq::Context::new();
    let socket = context.socket(zmq::SUB).unwrap();
    assert!(socket.set_subscribe(b"hashblock").is_ok());
    assert!(socket.set_rcvhwm(0).is_ok());
    // We override the OS default behavior:
    assert!(socket.set_tcp_keepalive(1).is_ok());
    // The keepalive routine will wait for 5 minutes
    assert!(socket.set_tcp_keepalive_idle(300).is_ok());
    // And then resend it every 60 seconds
    assert!(socket.set_tcp_keepalive_intvl(60).is_ok());
    // 120 times
    assert!(socket.set_tcp_keepalive_cnt(120).is_ok());
    socket
}

pub async fn start_zeromq_pipeline(
    blocks_post_processor: &BlockProcessor,
    start_sequencing_blocks_at_height: u64,
    compress_blocks: bool,
    config: &Config,
    ctx: &Context,
) -> Result<(), String> {
    let http_client = build_http_client();
    let bitcoind_zmq_url = config.bitcoind.zmq_url.clone();
    let network = BitcoinNetwork::from_network(config.bitcoind.network);
    try_info!(
        ctx,
        "zmq: Waiting for ZMQ connection acknowledgment from bitcoind"
    );

    let mut socket = new_zmq_socket();
    assert!(socket.connect(&bitcoind_zmq_url).is_ok());
    try_info!(
        ctx,
        "zmq: Connected, waiting for ZMQ messages from bitcoind"
    );

    loop {
        let msg = match socket.recv_multipart(0) {
            Ok(msg) => msg,
            Err(e) => {
                try_warn!(ctx, "zmq: Unable to receive ZMQ message: {e}");
                socket = new_zmq_socket();
                assert!(socket.connect(&bitcoind_zmq_url).is_ok());
                continue;
            }
        };
        let (topic, data, _sequence) = (&msg[0], &msg[1], &msg[2]);

        if !topic.eq(b"hashblock") {
            try_warn!(
                ctx,
                "zmq: {} Topic not supported",
                String::from_utf8(topic.clone()).unwrap()
            );
            continue;
        }

        let block_hash = hex::encode(data);

        try_info!(ctx, "zmq: Bitcoin block hash announced {block_hash}");
        let raw_block_data = match download_and_parse_block_with_retry(
            &http_client,
            &block_hash,
            &config.bitcoind,
            ctx,
        )
        .await
        {
            Ok(block) => block,
            Err(e) => {
                try_warn!(ctx, "zmq: Unable to download block: {e}");
                continue;
            }
        };
        let block_height = raw_block_data.height as u64;
        let compacted_blocks = if compress_blocks {
            vec![(
                block_height,
                BlockBytesCursor::from_full_block(&raw_block_data)
                    .expect("unable to compress block"),
            )]
        } else {
            vec![]
        };
        let blocks = if block_height >= start_sequencing_blocks_at_height {
            let block = standardize_bitcoin_block(raw_block_data, &network, ctx)
                .expect("unable to deserialize block");
            vec![block]
        } else {
            vec![]
        };
        blocks_post_processor
            .commands_tx
            .send(BlockProcessorCommand::ProcessBlocks {
                compacted_blocks,
                blocks,
            })
            .map_err(|e| e.to_string())?;
    }
}
