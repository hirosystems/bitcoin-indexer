pub mod helpers;
use crate::types::{BitcoinBlockData, BlockchainEvent};

use super::fork_scratch_pad::ForkScratchPad;
use crate::utils::{AbstractBlock, Context};

pub type BlockchainEventExpectation = Box<dyn Fn(Option<BlockchainEvent>)>;

pub fn process_bitcoin_blocks_and_check_expectations(
    steps: Vec<(BitcoinBlockData, BlockchainEventExpectation)>,
) {
    let mut blocks_processor = ForkScratchPad::new();
    for (block, check_chain_event_expectations) in steps.into_iter() {
        let chain_event = blocks_processor
            .process_header(block.get_header(), &Context::empty())
            .unwrap();
        check_chain_event_expectations(chain_event);
    }
}
