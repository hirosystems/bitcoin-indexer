mod chain_config;
mod project_config;

pub use chain_config::{ChainConfig, ChainConfigFile};
use clarity_repl::repl;
pub use project_config::{ContractConfig, MainConfig, MainConfigFile, RequirementConfig};
use std::fs;
use std::path::{Path, PathBuf};
use tower_lsp::lsp_types::Url;

pub fn build_session_settings(
    clarinet_toml_path: &PathBuf,
    network_toml_file: &PathBuf,
) -> Result<(repl::SessionSettings, MainConfig), String> {
    let mut settings = repl::SessionSettings::default();

    let mut project_config = MainConfig::from_path(&clarinet_toml_path);
    let chain_config = ChainConfig::from_path(&network_toml_file);

    let mut deployer_address = None;
    let mut initial_deployer = None;

    for (name, account) in chain_config.accounts.iter() {
        let account = repl::settings::Account {
            name: name.clone(),
            balance: account.balance,
            address: account.address.clone(),
            mnemonic: account.mnemonic.clone(),
            derivation: account.derivation.clone(),
        };
        if name == "deployer" {
            initial_deployer = Some(account.clone());
            deployer_address = Some(account.address.clone());
        }
        settings.initial_accounts.push(account);
    }

    let mut root_path = clarinet_toml_path.clone();
    root_path.pop();

    for (name, config) in project_config.ordered_contracts().iter() {
        let mut contract_path = root_path.clone();
        contract_path.push(&config.path);

        let code = match fs::read_to_string(&contract_path) {
            Ok(code) => code,
            Err(err) => {
                return Err(format!(
                    "Error: unable to read {:?}: {}",
                    contract_path, err
                ))
            }
        };

        settings
            .initial_contracts
            .push(repl::settings::InitialContract {
                code: code,
                path: contract_path.to_str().unwrap().into(),
                name: Some(name.clone()),
                deployer: deployer_address.clone(),
            });
    }

    let links = match project_config.project.requirements.take() {
        Some(links) => links,
        None => vec![],
    };

    for link_config in links.iter() {
        settings.initial_links.push(repl::settings::InitialLink {
            contract_id: link_config.contract_id.clone(),
            stacks_node_addr: None,
            cache: None,
        });
    }

    settings.include_boot_contracts =
        vec!["pox".to_string(), "costs".to_string(), "bns".to_string()];
    settings.initial_deployer = initial_deployer;
    settings.analysis = project_config.project.analysis.clone();
    Ok((settings, project_config))
}
