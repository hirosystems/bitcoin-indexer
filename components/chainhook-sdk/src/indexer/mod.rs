pub mod bitcoin;
pub mod fork_scratch_pad;

use crate::utils::{AbstractBlock, Context};

use chainhook_types::{BlockHeader, BlockIdentifier, BlockchainEvent};
use config::BitcoindConfig;
use hiro_system_kit::slog;

use std::collections::VecDeque;

use self::fork_scratch_pad::ForkScratchPad;

#[derive(Deserialize, Debug, Clone, Default)]
pub struct AssetClassCache {
    pub symbol: String,
    pub decimals: u8,
}

pub struct BitcoinChainContext {}

impl Default for BitcoinChainContext {
    fn default() -> Self {
        Self::new()
    }
}

impl BitcoinChainContext {
    pub fn new() -> BitcoinChainContext {
        BitcoinChainContext {}
    }
}

pub struct Indexer {
    pub config: BitcoindConfig,
    bitcoin_blocks_pool: ForkScratchPad,
    pub bitcoin_context: BitcoinChainContext,
}

impl Indexer {
    pub fn new(config: BitcoindConfig) -> Indexer {
        let bitcoin_blocks_pool = ForkScratchPad::new();
        let bitcoin_context = BitcoinChainContext::new();

        Indexer {
            config,
            bitcoin_blocks_pool,
            bitcoin_context,
        }
    }

    pub fn handle_bitcoin_header(
        &mut self,
        header: BlockHeader,
        ctx: &Context,
    ) -> Result<Option<BlockchainEvent>, String> {
        self.bitcoin_blocks_pool.process_header(header, ctx)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChainSegment {
    pub block_ids: VecDeque<BlockIdentifier>,
}

#[derive(Clone, Debug)]
pub enum ChainSegmentIncompatibility {
    OutdatedBlock,
    OutdatedSegment,
    BlockCollision,
    ParentBlockUnknown,
    AlreadyPresent,
    Unknown,
    BlockNotFound,
}

#[derive(Debug)]
pub struct ChainSegmentDivergence {
    block_ids_to_apply: Vec<BlockIdentifier>,
    block_ids_to_rollback: Vec<BlockIdentifier>,
}

impl Default for ChainSegment {
    fn default() -> Self {
        Self::new()
    }
}

impl ChainSegment {
    pub fn new() -> ChainSegment {
        let block_ids = VecDeque::new();
        ChainSegment { block_ids }
    }

    fn is_empty(&self) -> bool {
        self.block_ids.is_empty()
    }

    fn is_block_id_newer_than_segment(&self, block_identifier: &BlockIdentifier) -> bool {
        if let Some(tip) = self.block_ids.front() {
            return block_identifier.index > (tip.index + 1);
        }
        false
    }

    fn get_relative_index(&self, block_identifier: &BlockIdentifier) -> usize {
        if let Some(tip) = self.block_ids.front() {
            let segment_index = tip.index.saturating_sub(block_identifier.index);
            return segment_index.try_into().unwrap();
        }
        0
    }

    fn can_append_block(
        &self,
        block: &dyn AbstractBlock,
        ctx: &Context,
    ) -> Result<(), ChainSegmentIncompatibility> {
        if self.is_block_id_newer_than_segment(block.get_identifier()) {
            // Chain segment looks outdated, we should just prune it?
            return Err(ChainSegmentIncompatibility::OutdatedSegment);
        }
        let tip = match self.block_ids.front() {
            Some(tip) => tip,
            None => return Ok(()),
        };
        ctx.try_log(|logger| {
            slog::info!(logger, "Comparing {} with {}", tip, block.get_identifier())
        });
        if tip.index == block.get_parent_identifier().index {
            match tip.hash == block.get_parent_identifier().hash {
                true => return Ok(()),
                false => return Err(ChainSegmentIncompatibility::ParentBlockUnknown),
            }
        }
        if let Some(colliding_block) = self.get_block_id(block.get_identifier(), ctx) {
            match colliding_block.eq(block.get_identifier()) {
                true => return Err(ChainSegmentIncompatibility::AlreadyPresent),
                false => return Err(ChainSegmentIncompatibility::BlockCollision),
            }
        }
        Err(ChainSegmentIncompatibility::Unknown)
    }

    fn get_block_id(&self, block_id: &BlockIdentifier, _ctx: &Context) -> Option<&BlockIdentifier> {
        match self.block_ids.get(self.get_relative_index(block_id)) {
            Some(res) => Some(res),
            None => None,
        }
    }

    pub fn append_block_identifier(&mut self, block_identifier: &BlockIdentifier) {
        self.block_ids.push_front(block_identifier.clone());
    }

    pub fn prune_confirmed_blocks(&mut self, cut_off: &BlockIdentifier) -> Vec<BlockIdentifier> {
        let mut keep = vec![];
        let mut prune = vec![];

        for block_id in self.block_ids.drain(..) {
            if block_id.index >= cut_off.index {
                keep.push(block_id);
            } else {
                prune.push(block_id);
            }
        }
        for block_id in keep.into_iter() {
            self.block_ids.push_back(block_id);
        }
        prune
    }

    pub fn get_tip(&self) -> &BlockIdentifier {
        self.block_ids.front().unwrap()
    }

    pub fn get_length(&self) -> u64 {
        self.block_ids.len().try_into().unwrap()
    }

    pub fn keep_blocks_from_oldest_to_block_identifier(
        &mut self,
        block_identifier: &BlockIdentifier,
    ) -> (bool, bool) {
        let mut mutated = false;
        loop {
            match self.block_ids.pop_front() {
                Some(tip) => {
                    if tip.eq(block_identifier) {
                        self.block_ids.push_front(tip);
                        break (true, mutated);
                    }
                }
                _ => break (false, mutated),
            }
            mutated = true;
        }
    }

    fn try_identify_divergence(
        &self,
        other_segment: &ChainSegment,
        allow_reset: bool,
        ctx: &Context,
    ) -> Result<ChainSegmentDivergence, ChainSegmentIncompatibility> {
        let mut common_root = None;
        let mut block_ids_to_rollback = vec![];
        let mut block_ids_to_apply = vec![];
        for cursor_segment_1 in other_segment.block_ids.iter() {
            block_ids_to_apply.clear();
            for cursor_segment_2 in self.block_ids.iter() {
                if cursor_segment_2.eq(cursor_segment_1) {
                    common_root = Some(cursor_segment_2.clone());
                    break;
                }
                block_ids_to_apply.push(cursor_segment_2.clone());
            }
            if common_root.is_some() {
                break;
            }
            block_ids_to_rollback.push(cursor_segment_1.clone());
        }
        ctx.try_log(|logger| {
            slog::debug!(logger, "Blocks to rollback: {:?}", block_ids_to_rollback)
        });
        ctx.try_log(|logger| slog::debug!(logger, "Blocks to apply: {:?}", block_ids_to_apply));
        block_ids_to_apply.reverse();
        match common_root.take() {
            Some(_common_root) => Ok(ChainSegmentDivergence {
                block_ids_to_rollback,
                block_ids_to_apply,
            }),
            None if allow_reset => Ok(ChainSegmentDivergence {
                block_ids_to_rollback,
                block_ids_to_apply,
            }),
            None => Err(ChainSegmentIncompatibility::Unknown),
        }
    }

    fn try_append_block(
        &mut self,
        block: &dyn AbstractBlock,
        ctx: &Context,
    ) -> (bool, Option<ChainSegment>) {
        let mut block_appended = false;
        let mut fork = None;
        ctx.try_log(|logger| {
            slog::info!(
                logger,
                "Trying to append {} to {}",
                block.get_identifier(),
                self
            )
        });
        match self.can_append_block(block, ctx) {
            Ok(()) => {
                self.append_block_identifier(block.get_identifier());
                block_appended = true;
            }
            Err(incompatibility) => {
                ctx.try_log(|logger| {
                    slog::warn!(logger, "Will have to fork: {:?}", incompatibility)
                });
                match incompatibility {
                    ChainSegmentIncompatibility::BlockCollision => {
                        let mut new_fork = self.clone();
                        let (parent_found, _) = new_fork
                            .keep_blocks_from_oldest_to_block_identifier(
                                block.get_parent_identifier(),
                            );
                        if parent_found {
                            ctx.try_log(|logger| slog::info!(logger, "Success"));
                            new_fork.append_block_identifier(block.get_identifier());
                            fork = Some(new_fork);
                            block_appended = true;
                        }
                    }
                    ChainSegmentIncompatibility::OutdatedSegment => {
                        // TODO(lgalabru): test depth
                        // fork_ids_to_prune.push(fork_id);
                    }
                    ChainSegmentIncompatibility::ParentBlockUnknown => {}
                    ChainSegmentIncompatibility::OutdatedBlock => {}
                    ChainSegmentIncompatibility::Unknown => {}
                    ChainSegmentIncompatibility::AlreadyPresent => {}
                    ChainSegmentIncompatibility::BlockNotFound => {}
                }
            }
        }
        (block_appended, fork)
    }
}

impl std::fmt::Display for ChainSegment {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(
            f,
            "Fork [{}], height = {}",
            self.block_ids
                .iter()
                .map(|b| format!("{}", b))
                .collect::<Vec<_>>()
                .join(", "),
            self.get_length()
        )
    }
}

#[cfg(test)]
pub mod tests;
