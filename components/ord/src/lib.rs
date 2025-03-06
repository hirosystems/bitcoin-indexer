#![allow(dead_code)]
#![allow(unused_variables)]

#[macro_use]
extern crate serde_derive;

type Result<T = (), E = anyhow::Error> = std::result::Result<T, E>;

pub mod chain;
pub mod charm;
pub mod decimal_sat;
pub mod degree;
pub mod envelope;
pub mod epoch;
pub mod height;
pub mod inscription;
pub mod inscription_id;
pub mod media;
pub mod rarity;
pub mod sat;
pub mod sat_point;
pub mod tag;

pub const SUBSIDY_HALVING_INTERVAL: u32 = 210_000;
pub const DIFFCHANGE_INTERVAL: u32 = 2016;
pub const CYCLE_EPOCHS: u32 = 6;
pub const COIN_VALUE: u64 = 100_000_000;
