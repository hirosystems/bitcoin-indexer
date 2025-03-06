extern crate serde;

#[macro_use]
extern crate serde_derive;

pub mod bitcoin;
mod ordinals;
mod processors;
mod rosetta;

pub use ordinals::*;
pub use processors::*;
pub use rosetta::*;

#[derive(Clone, Debug)]
pub enum Chain {
    Bitcoin,
}
