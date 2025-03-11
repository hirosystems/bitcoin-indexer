#[macro_use]
extern crate serde_derive;

pub mod generator;
pub mod toml;

mod config;
pub use config::*;
