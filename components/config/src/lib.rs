#[macro_use]
extern crate serde_derive;

pub mod toml;
pub mod generator;

mod config;
pub use config::*;