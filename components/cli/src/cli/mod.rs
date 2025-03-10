use chainhook_sdk::try_info;
use chainhook_sdk::utils::Context;
use clap::Parser;
use commands::{Command, ConfigCommand, DatabaseCommand, IndexCommand, Protocol, ServiceCommand};
use config::generator::generate_toml_config;
use config::Config;
use hiro_system_kit;
use std::path::PathBuf;
use std::thread::sleep;
use std::time::Duration;
use std::{process, u64};

mod commands;

pub fn main() {
    let logger = hiro_system_kit::log::setup_logger();
    let _guard = hiro_system_kit::log::setup_global_logger(logger.clone());
    let ctx = Context {
        logger: Some(logger),
        tracer: false,
    };

    let opts: Protocol = match Protocol::try_parse() {
        Ok(opts) => opts,
        Err(e) => {
            println!("{}", e);
            process::exit(1);
        }
    };

    if let Err(e) = hiro_system_kit::nestable_block_on(handle_command(opts, &ctx)) {
        error!(ctx.expect_logger(), "{e}");
        std::thread::sleep(std::time::Duration::from_millis(500));
        process::exit(1);
    }
}

fn check_maintenance_mode(ctx: &Context) {
    let maintenance_enabled = std::env::var("ORDHOOK_MAINTENANCE").unwrap_or("0".into());
    if maintenance_enabled.eq("1") {
        try_info!(
            ctx,
            "Entering maintenance mode. Unset ORDHOOK_MAINTENANCE and reboot to resume operations"
        );
        sleep(Duration::from_secs(u64::MAX))
    }
}

fn confirm_rollback(current_chain_tip: u64, blocks_to_rollback: u32) -> Result<(), String> {
    println!("Index chain tip is at #{current_chain_tip}");
    println!(
        "{} blocks will be dropped. New index chain tip will be at #{}. Confirm? [Y/n]",
        blocks_to_rollback,
        current_chain_tip - blocks_to_rollback as u64
    );
    let mut buffer = String::new();
    std::io::stdin().read_line(&mut buffer).unwrap();
    if buffer.starts_with('n') {
        return Err("Deletion aborted".to_string());
    }
    Ok(())
}

async fn handle_command(opts: Protocol, ctx: &Context) -> Result<(), String> {
    match opts {
        Protocol::Ordinals(subcmd) => match subcmd {
            Command::Service(subcmd) => match subcmd {
                ServiceCommand::Start(cmd) => {
                    check_maintenance_mode(ctx);
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_ordinals_config()?;
                    ordhook::start_ordinals_indexer(true, &config, &ctx).await?
                }
            },
            Command::Index(index_command) => match index_command {
                IndexCommand::Sync(cmd) => {
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_ordinals_config()?;
                    ordhook::start_ordinals_indexer(false, &config, &ctx).await?
                }
                IndexCommand::Rollback(cmd) => {
                    // let config = Config::from_file_path(&cmd.config_path)?;
                    // config.assert_ordinals_config()?;

                    // let service = Service::new(&config, ctx);
                    // let chain_tip = service.get_index_chain_tip().await?;
                    // confirm_rollback(chain_tip, cmd.blocks)?;

                    // let service = Service::new(&config, ctx);
                    // let block_heights: Vec<u64> =
                    //     ((chain_tip - cmd.blocks as u64)..=chain_tip).collect();
                    // service.rollback(&block_heights).await?;
                    println!("{} blocks dropped", cmd.blocks);
                }
            },
            Command::Database(database_command) => match database_command {
                DatabaseCommand::Migrate(cmd) => {
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_ordinals_config()?;
                    ordhook::db::migrate_dbs(&config, ctx).await?;
                }
            },
        },
        Protocol::Runes(subcmd) => match subcmd {
            Command::Service(service_command) => match service_command {
                ServiceCommand::Start(cmd) => {
                    check_maintenance_mode(ctx);
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_runes_config()?;
                    return runes::service::start_service(&config, ctx).await;
                }
            },
            Command::Index(index_command) => match index_command {
                IndexCommand::Sync(cmd) => {
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_runes_config()?;
                    runes::service::catch_up_to_bitcoin_chain_tip(&config, ctx).await?;
                }
                IndexCommand::Rollback(cmd) => {
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_runes_config()?;
                    let chain_tip = runes::service::get_index_chain_tip(&config, ctx).await;
                    confirm_rollback(chain_tip, cmd.blocks)?;

                    let mut pg_client = runes::db::pg_connect(&config, false, &ctx).await;
                    runes::scan::bitcoin::drop_blocks(
                        chain_tip - cmd.blocks as u64,
                        chain_tip,
                        &mut pg_client,
                        &ctx,
                    )
                    .await;
                }
            },
            Command::Database(database_command) => match database_command {
                DatabaseCommand::Migrate(cmd) => {
                    let config = Config::from_file_path(&cmd.config_path)?;
                    config.assert_runes_config()?;
                    let _ = runes::db::pg_connect(&config, true, ctx).await;
                }
            },
        },
        Protocol::Config(subcmd) => match subcmd {
            ConfigCommand::New(cmd) => {
                use std::fs::File;
                use std::io::Write;
                let network = match (cmd.mainnet, cmd.testnet, cmd.regtest) {
                    (true, false, false) => "mainnet",
                    (false, true, false) => "testnet",
                    (false, false, true) => "regtest",
                    _ => return Err("Invalid network".into()),
                };
                let config_content = generate_toml_config(network);
                let mut file_path = PathBuf::new();
                file_path.push("Indexer.toml");
                let mut file = File::create(&file_path)
                    .map_err(|e| format!("unable to open file {}\n{}", file_path.display(), e))?;
                file.write_all(config_content.as_bytes())
                    .map_err(|e| format!("unable to write file {}\n{}", file_path.display(), e))?;
                println!("Created file Indexer.toml");
            }
        },
    }
    Ok(())
}
