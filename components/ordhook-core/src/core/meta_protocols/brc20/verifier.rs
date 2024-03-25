use chainhook_sdk::types::{
    Brc20BalanceData, Brc20Operation, Brc20TokenDeployData, Brc20TransferData, OrdinalInscriptionRevealData, OrdinalInscriptionTransferData, OrdinalInscriptionTransferDestination
};
use chainhook_sdk::utils::Context;
use rusqlite::Transaction;

use super::db::get_unsent_token_transfer_with_sender;
use super::{
    db::{
        get_token, get_token_available_balance_for_address, get_token_minted_supply, token_exists,
    },
    parser::{amt_has_valid_decimals, ParsedBrc20Operation},
};

pub fn verify_brc20_operation(
    operation: &ParsedBrc20Operation,
    reveal: &OrdinalInscriptionRevealData,
    db_tx: &Transaction,
    ctx: &Context,
) -> Result<Brc20Operation, String> {
    let Some(inscriber_address) = reveal.inscriber_address.clone() else {
        return Err(format!("Invalid inscriber address"));
    };
    if inscriber_address.is_empty() {
        return Err(format!("Empty inscriber address"));
    }
    if reveal.inscription_number.classic < 0 {
        return Err(format!("Inscription is cursed"));
    }
    match operation {
        ParsedBrc20Operation::Deploy(data) => {
            if token_exists(&data, db_tx, ctx) {
                return Err(format!("Token {} already exists", &data.tick));
            }
            return Ok(Brc20Operation::TokenDeploy(Brc20TokenDeployData {
                tick: data.tick.clone(),
                max: data.max,
                lim: data.lim,
                dec: data.dec,
                address: inscriber_address,
                inscription_id: reveal.inscription_id.clone(),
            }));
        }
        ParsedBrc20Operation::Mint(data) => {
            let Some(token) = get_token(&data.tick, db_tx, ctx) else {
                return Err(format!(
                    "Token {} does not exist on mint attempt",
                    &data.tick
                ));
            };
            if data.float_amt() > token.lim {
                return Err(format!(
                    "Cannot mint more than {} tokens for {}, attempted to mint {}",
                    token.lim, token.tick, data.amt
                ));
            }
            if !amt_has_valid_decimals(&data.amt, token.dec) {
                return Err(format!(
                    "Invalid decimals in amt field for {} mint, attempting to mint {}",
                    token.tick, data.amt
                ));
            }
            let remaining_supply = token.max - get_token_minted_supply(&data.tick, db_tx, ctx);
            if remaining_supply == 0.0 {
                return Err(format!(
                    "No supply available for {} mint, attempted to mint {}, remaining {}",
                    token.tick, data.amt, remaining_supply
                ));
            }
            let real_mint_amt = data.float_amt().min(token.lim.min(remaining_supply));
            return Ok(Brc20Operation::TokenMint(Brc20BalanceData {
                tick: token.tick,
                amt: real_mint_amt,
                address: inscriber_address,
                inscription_id: reveal.inscription_id.clone(),
            }));
        }
        ParsedBrc20Operation::Transfer(data) => {
            let Some(token) = get_token(&data.tick, db_tx, ctx) else {
                return Err(format!(
                    "Token {} does not exist on transfer attempt",
                    &data.tick
                ));
            };
            if !amt_has_valid_decimals(&data.amt, token.dec) {
                return Err(format!(
                    "Invalid decimals in amt field for {} transfer, attempting to transfer {}",
                    token.tick, data.amt
                ));
            }
            let avail_balance = get_token_available_balance_for_address(
                &token.tick,
                &inscriber_address,
                db_tx,
                ctx,
            );
            if avail_balance < data.float_amt() {
                return Err(format!("Insufficient balance for {} transfer, attempting to transfer {}, only {} available", token.tick, data.amt, avail_balance));
            }
            return Ok(Brc20Operation::TokenTransfer(Brc20BalanceData {
                tick: token.tick,
                amt: data.float_amt(),
                address: inscriber_address,
                inscription_id: reveal.inscription_id.clone(),
            }));
        }
    };
}

pub fn verify_brc20_transfer(
    transfer: &OrdinalInscriptionTransferData,
    db_tx: &Transaction,
    ctx: &Context,
) -> Result<Brc20TransferData, String> {
    let Some(balance_delta) =
        get_unsent_token_transfer_with_sender(transfer.ordinal_number, db_tx, ctx)
    else {
        return Err(format!(
            "No BRC-20 transfer in ordinal {} or transfer already sent",
            transfer.ordinal_number
        ));
    };
    match &transfer.destination {
        OrdinalInscriptionTransferDestination::Transferred(receiver_address) => {
            return Ok(Brc20TransferData {
                tick: balance_delta.tick.clone(),
                amt: balance_delta.amt,
                sender_address: balance_delta.address,
                receiver_address: receiver_address.to_string(),
            });
        }
        OrdinalInscriptionTransferDestination::SpentInFees => {
            return Ok(Brc20TransferData {
                tick: balance_delta.tick.clone(),
                amt: balance_delta.amt,
                sender_address: balance_delta.address.clone(),
                receiver_address: balance_delta.address.clone(), // Return to sender
            });
        }
        OrdinalInscriptionTransferDestination::Burnt(_) => {
            return Ok(Brc20TransferData {
                tick: balance_delta.tick.clone(),
                amt: balance_delta.amt,
                sender_address: balance_delta.address.clone(),
                receiver_address: "".to_string(),
            });
        }
    };
}

#[cfg(test)]
mod test {
    use chainhook_sdk::{
        types::{
            BlockIdentifier, Brc20BalanceData, Brc20Operation, Brc20TokenDeployData, Brc20TransferData, OrdinalInscriptionNumber, OrdinalInscriptionRevealData, OrdinalInscriptionTransferData, OrdinalInscriptionTransferDestination
        },
        utils::Context,
    };
    use test_case::test_case;

    use crate::core::meta_protocols::brc20::{
        db::{
            initialize_brc20_db, insert_token, insert_token_mint, insert_token_transfer,
            insert_token_transfer_send,
        },
        parser::{ParsedBrc20BalanceData, ParsedBrc20Operation, ParsedBrc20TokenDeployData},
    };

    use super::{verify_brc20_operation, verify_brc20_transfer};

    struct Brc20RevealBuilder {
        inscription_number: OrdinalInscriptionNumber,
        inscriber_address: Option<String>,
        inscription_id: String,
        ordinal_number: u64,
    }

    impl Brc20RevealBuilder {
        fn new() -> Self {
            Brc20RevealBuilder {
                inscription_number: OrdinalInscriptionNumber {
                    classic: 0,
                    jubilee: 0,
                },
                inscriber_address: Some("324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string()),
                inscription_id:
                    "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
                ordinal_number: 0,
            }
        }

        fn inscription_number(mut self, val: i64) -> Self {
            self.inscription_number = OrdinalInscriptionNumber {
                classic: val,
                jubilee: val,
            };
            self
        }

        fn inscriber_address(mut self, val: Option<String>) -> Self {
            self.inscriber_address = val;
            self
        }

        fn inscription_id(mut self, val: &str) -> Self {
            self.inscription_id = val.to_string();
            self
        }

        fn ordinal_number(mut self, val: u64) -> Self {
            self.ordinal_number = val;
            self
        }

        fn build(self) -> OrdinalInscriptionRevealData {
            OrdinalInscriptionRevealData {
                content_bytes: "".to_string(),
                content_type: "text/plain".to_string(),
                content_length: 10,
                inscription_number: self.inscription_number,
                inscription_fee: 100,
                inscription_output_value: 10000,
                inscription_id: self.inscription_id,
                inscription_input_index: 0,
                inscription_pointer: None,
                inscriber_address: self.inscriber_address,
                delegate: None,
                metaprotocol: None,
                metadata: None,
                parent: None,
                ordinal_number: self.ordinal_number,
                ordinal_block_height: 767430,
                ordinal_offset: 0,
                tx_index: 0,
                transfers_pre_inscription: 0,
                satpoint_post_inscription:
                    "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcdd:0:0"
                        .to_string(),
                curse_type: None,
            }
        }
    }

    struct Brc20TransferBuilder {
        ordinal_number: u64,
        destination: OrdinalInscriptionTransferDestination,
    }

    impl Brc20TransferBuilder {
        fn new() -> Self {
            Brc20TransferBuilder {
                ordinal_number: 0,
                destination: OrdinalInscriptionTransferDestination::Transferred(
                    "bc1pls75sfwullhygkmqap344f5cqf97qz95lvle6fvddm0tpz2l5ffslgq3m0".to_string(),
                ),
            }
        }

        fn ordinal_number(mut self, val: u64) -> Self {
            self.ordinal_number = val;
            self
        }

        fn destination(mut self, val: OrdinalInscriptionTransferDestination) -> Self {
            self.destination = val;
            self
        }

        fn build(self) -> OrdinalInscriptionTransferData {
            OrdinalInscriptionTransferData {
                ordinal_number: self.ordinal_number,
                destination: self.destination,
                satpoint_pre_transfer: "".to_string(),
                satpoint_post_transfer: "".to_string(),
                post_transfer_output_value: Some(500),
                tx_index: 0,
            }
        }
    }

    fn get_test_ctx() -> Context {
        let logger = hiro_system_kit::log::setup_logger();
        let _guard = hiro_system_kit::log::setup_global_logger(logger.clone());
        Context {
            logger: Some(logger),
            tracer: false,
        }
    }

    #[test_case(
        ParsedBrc20Operation::Deploy(ParsedBrc20TokenDeployData {
            tick: "pepe".to_string(),
            max: 21000000.0,
            lim: 1000.0,
            dec: 18,
        }),
        Brc20RevealBuilder::new().inscriber_address(None).build()
        => Err("Invalid inscriber address".to_string()); "with invalid address"
    )]
    #[test_case(
        ParsedBrc20Operation::Deploy(ParsedBrc20TokenDeployData {
            tick: "pepe".to_string(),
            max: 21000000.0,
            lim: 1000.0,
            dec: 18,
        }),
        Brc20RevealBuilder::new().inscriber_address(Some("".to_string())).build()
        => Err("Empty inscriber address".to_string()); "with empty address"
    )]
    #[test_case(
        ParsedBrc20Operation::Deploy(ParsedBrc20TokenDeployData {
            tick: "pepe".to_string(),
            max: 21000000.0,
            lim: 1000.0,
            dec: 18,
        }),
        Brc20RevealBuilder::new().inscription_number(-1).build()
        => Err("Inscription is cursed".to_string()); "with cursed inscription"
    )]
    #[test_case(
        ParsedBrc20Operation::Deploy(ParsedBrc20TokenDeployData {
            tick: "pepe".to_string(),
            max: 21000000.0,
            lim: 1000.0,
            dec: 18,
        }),
        Brc20RevealBuilder::new().build()
        => Ok(
            Brc20Operation::TokenDeploy(Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string()
            })
        ); "with deploy"
    )]
    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new().build()
        => Err("Token pepe does not exist on mint attempt".to_string());
        "with mint non existing token"
    )]
    #[test_case(
        ParsedBrc20Operation::Transfer(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new().build()
        => Err("Token pepe does not exist on transfer attempt".to_string());
        "with transfer non existing token"
    )]
    fn test_brc20_verify_for_empty_db(
        op: ParsedBrc20Operation,
        reveal: OrdinalInscriptionRevealData,
    ) -> Result<Brc20Operation, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        verify_brc20_operation(&op, &reveal, &tx, &ctx)
    }

    #[test_case(
        ParsedBrc20Operation::Deploy(ParsedBrc20TokenDeployData {
            tick: "pepe".to_string(),
            max: 21000000.0,
            lim: 1000.0,
            dec: 18,
        }),
        Brc20RevealBuilder::new().inscription_number(1).build()
        => Err("Token pepe already exists".to_string()); "with deploy existing token"
    )]
    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(1).build()
        => Ok(Brc20Operation::TokenMint(Brc20BalanceData {
            tick: "pepe".to_string(),
            amt: 1000.0,
            address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
        })); "with mint"
    )]
    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "10000.0".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(1).build()
        => Err("Cannot mint more than 1000 tokens for pepe, attempted to mint 10000.0".to_string());
        "with mint over lim"
    )]
    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "100.000000000000000000000".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(1).build()
        => Err("Invalid decimals in amt field for pepe mint, attempting to mint 100.000000000000000000000".to_string());
        "with mint invalid decimals"
    )]
    #[test_case(
        ParsedBrc20Operation::Transfer(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "100.0".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(1).build()
        => Err("Insufficient balance for pepe transfer, attempting to transfer 100.0, only 0 available".to_string());
        "with transfer on zero balance"
    )]
    #[test_case(
        ParsedBrc20Operation::Transfer(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "100.000000000000000000000".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(1).build()
        => Err("Invalid decimals in amt field for pepe transfer, attempting to transfer 100.000000000000000000000".to_string());
        "with transfer invalid decimals"
    )]
    fn test_brc20_verify_for_existing_token(
        op: ParsedBrc20Operation,
        reveal: OrdinalInscriptionRevealData,
    ) -> Result<Brc20Operation, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        insert_token(
            &Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string()

            },
            &Brc20RevealBuilder::new().inscription_number(0).build(),
            &BlockIdentifier {
                index: 835727,
                hash: "00000000000000000002d8ba402150b259ddb2b30a1d32ab4a881d4653bceb5b"
                    .to_string(),
            },
            &tx,
            &ctx,
        );
        verify_brc20_operation(&op, &reveal, &tx, &ctx)
    }

    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(2).build()
        => Err("No supply available for pepe mint, attempted to mint 1000.0, remaining 0".to_string());
        "with mint on no more supply"
    )]
    fn test_brc20_verify_for_minted_out_token(
        op: ParsedBrc20Operation,
        reveal: OrdinalInscriptionRevealData,
    ) -> Result<Brc20Operation, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        let block = BlockIdentifier {
            index: 835727,
            hash: "00000000000000000002d8ba402150b259ddb2b30a1d32ab4a881d4653bceb5b".to_string(),
        };
        insert_token(
            &Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
            },
            &Brc20RevealBuilder::new().inscription_number(0).build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_mint(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 21000000.0, // For testing
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
            },
            &Brc20RevealBuilder::new().inscription_number(1).build(),
            &block,
            &tx,
            &ctx,
        );
        verify_brc20_operation(&op, &reveal, &tx, &ctx)
    }

    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new().inscription_number(2).build()
        => Ok(Brc20Operation::TokenMint(Brc20BalanceData {
            tick: "pepe".to_string(),
            amt: 500.0,
            address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
        })); "with mint on low supply"
    )]
    fn test_brc20_verify_for_almost_minted_out_token(
        op: ParsedBrc20Operation,
        reveal: OrdinalInscriptionRevealData,
    ) -> Result<Brc20Operation, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        let block = BlockIdentifier {
            index: 835727,
            hash: "00000000000000000002d8ba402150b259ddb2b30a1d32ab4a881d4653bceb5b".to_string(),
        };
        insert_token(
            &Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
            },
            &Brc20RevealBuilder::new().inscription_number(0).build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_mint(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 21000000.0 - 500.0, // For testing
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
            },
            &Brc20RevealBuilder::new().inscription_number(1).build(),
            &block,
            &tx,
            &ctx,
        );
        verify_brc20_operation(&op, &reveal, &tx, &ctx)
    }

    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new()
            .inscription_number(3)
            .inscription_id("04b29b646f6389154e4fa0f0761472c27b9f13a482c715d9976edc474c258bc7i0")
            .build()
        => Ok(Brc20Operation::TokenMint(Brc20BalanceData {
            tick: "pepe".to_string(),
            amt: 1000.0,
            address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
        })); "with mint on existing balance address 1"
    )]
    #[test_case(
        ParsedBrc20Operation::Mint(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "1000.0".to_string(),
        }),
        Brc20RevealBuilder::new()
            .inscription_number(3)
            .inscription_id("04b29b646f6389154e4fa0f0761472c27b9f13a482c715d9976edc474c258bc7i0")
            .inscriber_address(Some("19aeyQe8hGDoA1MHmmh2oM5Bbgrs9Jx7yZ".to_string()))
            .build()
        => Ok(Brc20Operation::TokenMint(Brc20BalanceData {
            tick: "pepe".to_string(),
            amt: 1000.0,
            address: "19aeyQe8hGDoA1MHmmh2oM5Bbgrs9Jx7yZ".to_string(),
            inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
        })); "with mint on existing balance address 2"
    )]
    #[test_case(
        ParsedBrc20Operation::Transfer(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "500.0".to_string(),
        }),
        Brc20RevealBuilder::new()
            .inscription_number(3)
            .inscription_id("04b29b646f6389154e4fa0f0761472c27b9f13a482c715d9976edc474c258bc7i0")
            .build()
        => Ok(Brc20Operation::TokenTransfer(Brc20BalanceData {
            tick: "pepe".to_string(),
            amt: 500.0,
            address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            inscription_id: "9bb2314d666ae0b1db8161cb373fcc1381681f71445c4e0335aa80ea9c37fcddi0".to_string(),
        })); "with transfer"
    )]
    #[test_case(
        ParsedBrc20Operation::Transfer(ParsedBrc20BalanceData {
            tick: "pepe".to_string(),
            amt: "5000.0".to_string(),
        }),
        Brc20RevealBuilder::new()
            .inscription_number(3)
            .inscription_id("04b29b646f6389154e4fa0f0761472c27b9f13a482c715d9976edc474c258bc7i0")
            .build()
        => Err("Insufficient balance for pepe transfer, attempting to transfer 5000.0, only 1000 available".to_string());
        "with transfer insufficient balance"
    )]
    fn test_brc20_verify_for_token_with_mints(
        op: ParsedBrc20Operation,
        reveal: OrdinalInscriptionRevealData,
    ) -> Result<Brc20Operation, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        let block = BlockIdentifier {
            index: 835727,
            hash: "00000000000000000002d8ba402150b259ddb2b30a1d32ab4a881d4653bceb5b".to_string(),
        };
        insert_token(
            &Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "e45957c419f130cd5c88cdac3eb1caf2d118aee20c17b15b74a611be395a065di0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(0)
                .inscription_id(
                    "e45957c419f130cd5c88cdac3eb1caf2d118aee20c17b15b74a611be395a065di0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        // Mint from 2 addresses
        insert_token_mint(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 1000.0,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "269d46f148733ce86153e3ec0e0a3c78780e9b07e90a07e11753f0e934a60724i0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(1)
                .inscription_id(
                    "269d46f148733ce86153e3ec0e0a3c78780e9b07e90a07e11753f0e934a60724i0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_mint(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 1000.0,
                address: "19aeyQe8hGDoA1MHmmh2oM5Bbgrs9Jx7yZ".to_string(),
                inscription_id: "704b85a939c34ec9dbbf79c0ffc69ba09566d732dbf1af2c04de65b0697aa1f8i0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(2)
                .inscription_id(
                    "704b85a939c34ec9dbbf79c0ffc69ba09566d732dbf1af2c04de65b0697aa1f8i0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        verify_brc20_operation(&op, &reveal, &tx, &ctx)
    }

    #[test_case(
        Brc20TransferBuilder::new().ordinal_number(5000).build()
        => Ok(Brc20TransferData {
            tick: "pepe".to_string(),
            amt: 500.0,
            sender_address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            receiver_address: "bc1pls75sfwullhygkmqap344f5cqf97qz95lvle6fvddm0tpz2l5ffslgq3m0".to_string(),
        });
        "with transfer"
    )]
    #[test_case(
        Brc20TransferBuilder::new()
            .ordinal_number(5000)
            .destination(OrdinalInscriptionTransferDestination::SpentInFees)
            .build()
        => Ok(Brc20TransferData {
            tick: "pepe".to_string(),
            amt: 500.0,
            sender_address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            receiver_address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string()
        });
        "with transfer spent as fee"
    )]
    #[test_case(
        Brc20TransferBuilder::new()
            .ordinal_number(5000)
            .destination(OrdinalInscriptionTransferDestination::Burnt("test".to_string()))
            .build()
        => Ok(Brc20TransferData {
            tick: "pepe".to_string(),
            amt: 500.0,
            sender_address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
            receiver_address: "".to_string()
        });
        "with transfer burnt"
    )]
    #[test_case(
        Brc20TransferBuilder::new().ordinal_number(200).build()
        => Err("No BRC-20 transfer in ordinal 200 or transfer already sent".to_string());
        "with transfer non existent"
    )]
    fn test_brc20_verify_transfer_for_token_with_mint_and_transfer(
        transfer: OrdinalInscriptionTransferData,
    ) -> Result<Brc20TransferData, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        let block = BlockIdentifier {
            index: 835727,
            hash: "00000000000000000002d8ba402150b259ddb2b30a1d32ab4a881d4653bceb5b".to_string(),
        };
        insert_token(
            &Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "e45957c419f130cd5c88cdac3eb1caf2d118aee20c17b15b74a611be395a065di0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(0)
                .inscription_id(
                    "e45957c419f130cd5c88cdac3eb1caf2d118aee20c17b15b74a611be395a065di0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_mint(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 1000.0,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "269d46f148733ce86153e3ec0e0a3c78780e9b07e90a07e11753f0e934a60724i0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(1)
                .inscription_id(
                    "269d46f148733ce86153e3ec0e0a3c78780e9b07e90a07e11753f0e934a60724i0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_transfer(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 500.0,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "704b85a939c34ec9dbbf79c0ffc69ba09566d732dbf1af2c04de65b0697aa1f8i0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(2)
                .ordinal_number(5000)
                .inscription_id(
                    "704b85a939c34ec9dbbf79c0ffc69ba09566d732dbf1af2c04de65b0697aa1f8i0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        verify_brc20_transfer(&transfer, &tx, &ctx)
    }

    #[test_case(
        Brc20TransferBuilder::new().ordinal_number(5000).build()
        => Err("No BRC-20 transfer in ordinal 5000 or transfer already sent".to_string());
        "with transfer already sent"
    )]
    fn test_brc20_verify_transfer_for_token_with_mint_transfer_and_send(
        transfer: OrdinalInscriptionTransferData,
    ) -> Result<Brc20TransferData, String> {
        let ctx = get_test_ctx();
        let mut conn = initialize_brc20_db(None, &ctx);
        let tx = conn.transaction().unwrap();
        let block = BlockIdentifier {
            index: 835727,
            hash: "00000000000000000002d8ba402150b259ddb2b30a1d32ab4a881d4653bceb5b".to_string(),
        };
        insert_token(
            &Brc20TokenDeployData {
                tick: "pepe".to_string(),
                max: 21000000.0,
                lim: 1000.0,
                dec: 18,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "e45957c419f130cd5c88cdac3eb1caf2d118aee20c17b15b74a611be395a065di0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(0)
                .inscription_id(
                    "e45957c419f130cd5c88cdac3eb1caf2d118aee20c17b15b74a611be395a065di0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_mint(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 1000.0,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "269d46f148733ce86153e3ec0e0a3c78780e9b07e90a07e11753f0e934a60724i0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(1)
                .inscription_id(
                    "269d46f148733ce86153e3ec0e0a3c78780e9b07e90a07e11753f0e934a60724i0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_transfer(
            &Brc20BalanceData {
                tick: "pepe".to_string(),
                amt: 500.0,
                address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                inscription_id: "704b85a939c34ec9dbbf79c0ffc69ba09566d732dbf1af2c04de65b0697aa1f8i0".to_string(),
            },
            &Brc20RevealBuilder::new()
                .inscription_number(2)
                .ordinal_number(5000)
                .inscription_id(
                    "704b85a939c34ec9dbbf79c0ffc69ba09566d732dbf1af2c04de65b0697aa1f8i0",
                )
                .build(),
            &block,
            &tx,
            &ctx,
        );
        insert_token_transfer_send(
            &Brc20TransferData {
                tick: "pepe".to_string(),
                amt: 500.0,
                sender_address: "324A7GHA2azecbVBAFy4pzEhcPT1GjbUAp".to_string(),
                receiver_address: "bc1pls75sfwullhygkmqap344f5cqf97qz95lvle6fvddm0tpz2l5ffslgq3m0"
                    .to_string(),
            },
            &Brc20TransferBuilder::new().ordinal_number(5000).build(),
            &block,
            &tx,
            &ctx,
        );
        verify_brc20_transfer(&transfer, &tx, &ctx)
    }
}
