use clap::{Parser, Subcommand};

/// Index Bitcoin meta-protocols like Ordinals, BRC-20, and Runes
#[derive(Parser, Debug)]
#[clap(name = "bitcoin-indexer", author, version, about, long_about = None)]
pub enum Protocol {
    /// Ordinals index commands
    #[clap(subcommand)]
    Ordinals(Command),
    /// Runes index commands
    #[clap(subcommand)]
    Runes(Command),
    /// Configuration file commands
    #[clap(subcommand)]
    Config(ConfigCommand),
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
pub enum Command {
    /// Stream and index Bitcoin blocks
    #[clap(subcommand)]
    Service(ServiceCommand),
    /// Perform maintenance operations on local index
    #[clap(subcommand)]
    Index(IndexCommand),
    /// Database operations
    #[clap(subcommand)]
    Database(DatabaseCommand),
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
pub enum DatabaseCommand {
    /// Migrates database
    #[clap(name = "migrate", bin_name = "migrate")]
    Migrate(MigrateDatabaseCommand),
}

#[derive(Parser, PartialEq, Clone, Debug)]
pub struct MigrateDatabaseCommand {
    #[clap(long = "config-path")]
    pub config_path: String,
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
#[clap(bin_name = "config", aliases = &["config"])]
pub enum ConfigCommand {
    /// Generate new config
    #[clap(name = "new", bin_name = "new", aliases = &["generate"])]
    New(NewConfigCommand),
}

#[derive(Parser, PartialEq, Clone, Debug)]
pub struct NewConfigCommand {
    /// Target Regtest network
    #[clap(
        long = "regtest",
        conflicts_with = "testnet",
        conflicts_with = "mainnet"
    )]
    pub regtest: bool,
    /// Target Testnet network
    #[clap(
        long = "testnet",
        conflicts_with = "regtest",
        conflicts_with = "mainnet"
    )]
    pub testnet: bool,
    /// Target Mainnet network
    #[clap(
        long = "mainnet",
        conflicts_with = "testnet",
        conflicts_with = "regtest"
    )]
    pub mainnet: bool,
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
pub enum ServiceCommand {
    /// Start service
    #[clap(name = "start", bin_name = "start")]
    Start(ServiceStartCommand),
}

#[derive(Parser, PartialEq, Clone, Debug)]
pub struct ServiceStartCommand {
    #[clap(long = "config-path")]
    pub config_path: String,
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
pub enum IndexCommand {
    /// Sync index to latest bitcoin block
    #[clap(name = "sync", bin_name = "sync")]
    Sync(SyncIndexCommand),
    /// Rollback index blocks
    #[clap(name = "rollback", bin_name = "drop")]
    Rollback(RollbackIndexCommand),
}

#[derive(Parser, PartialEq, Clone, Debug)]
pub struct SyncIndexCommand {
    #[clap(long = "config-path")]
    pub config_path: String,
}

#[derive(Parser, PartialEq, Clone, Debug)]
pub struct RollbackIndexCommand {
    /// Number of blocks to rollback from index tip
    pub blocks: u32,
    #[clap(long = "config-path")]
    pub config_path: String,
}
