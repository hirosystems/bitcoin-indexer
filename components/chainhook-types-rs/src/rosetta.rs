use crate::bitcoin::{TxIn, TxOut};
use crate::ordinals::OrdinalOperation;
use crate::Brc20Operation;
use bitcoin::Network;
use schemars::JsonSchema;
use std::cmp::Ordering;
use std::fmt::Display;
use std::hash::{Hash, Hasher};

/// BlockIdentifier uniquely identifies a block in a particular network.
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct BlockIdentifier {
    /// Also known as the block height.
    pub index: u64,
    pub hash: String,
}

impl BlockIdentifier {
    pub fn get_hash_bytes_str(&self) -> &str {
        &self.hash[2..]
    }

    pub fn get_hash_bytes(&self) -> Vec<u8> {
        hex::decode(&self.get_hash_bytes_str()).unwrap()
    }
}

impl Display for BlockIdentifier {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(
            f,
            "Block #{} ({}...{})",
            self.index,
            &self.hash.as_str()[0..6],
            &self.hash.as_str()[62..]
        )
    }
}

impl Hash for BlockIdentifier {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.hash.hash(state);
    }
}

impl Ord for BlockIdentifier {
    fn cmp(&self, other: &Self) -> Ordering {
        (other.index, &other.hash).cmp(&(self.index, &self.hash))
    }
}

impl PartialOrd for BlockIdentifier {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(other.cmp(self))
    }
}

impl PartialEq for BlockIdentifier {
    fn eq(&self, other: &Self) -> bool {
        self.hash == other.hash
    }
}

impl Eq for BlockIdentifier {}

/// BitcoinBlock contain an array of Transactions that occurred at a particular
/// BlockIdentifier. A hard requirement for blocks returned by Rosetta
/// implementations is that they MUST be _inalterable_: once a client has
/// requested and received a block identified by a specific BlockIndentifier,
/// all future calls for that same BlockIdentifier must return the same block
/// contents.
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct BitcoinBlockData {
    pub block_identifier: BlockIdentifier,
    pub parent_block_identifier: BlockIdentifier,
    /// The timestamp of the block in milliseconds since the Unix Epoch. The
    /// timestamp is stored in milliseconds because some blockchains produce
    /// blocks more often than once a second.
    pub timestamp: u32,
    pub transactions: Vec<BitcoinTransactionData>,
    pub metadata: BitcoinBlockMetadata,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct BitcoinBlockMetadata {
    pub network: BitcoinNetwork,
}

/// The timestamp of the block in milliseconds since the Unix Epoch. The
/// timestamp is stored in milliseconds because some blockchains produce blocks
/// more often than once a second.
#[derive(Debug, Clone, PartialEq, PartialOrd, Deserialize, Serialize)]
pub struct Timestamp(i64);

/// Transactions contain an array of Operations that are attributable to the
/// same TransactionIdentifier.
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct BitcoinTransactionData {
    pub transaction_identifier: TransactionIdentifier,
    pub operations: Vec<Operation>,
    /// Transactions that are related to other transactions should include the
    /// transaction_identifier of these transactions in the metadata.
    pub metadata: BitcoinTransactionMetadata,
}

/// Extra data for Transaction
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct BitcoinTransactionMetadata {
    pub inputs: Vec<TxIn>,
    pub outputs: Vec<TxOut>,
    pub ordinal_operations: Vec<OrdinalOperation>,
    pub brc20_operation: Option<Brc20Operation>,
    pub proof: Option<String>,
    pub fee: u64,
    pub index: u32,
}

/// The transaction_identifier uniquely identifies a transaction in a particular
/// network and block or in the mempool.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize, Hash, PartialOrd, Ord)]
pub struct TransactionIdentifier {
    /// Any transactions that are attributable only to a block (ex: a block
    /// event) should use the hash of the block as the identifier.
    pub hash: String,
}

impl TransactionIdentifier {
    pub fn new(txid: &str) -> Self {
        let lowercased_txid = txid.to_lowercase();
        Self {
            hash: match lowercased_txid.starts_with("0x") {
                true => lowercased_txid,
                false => format!("0x{}", lowercased_txid),
            },
        }
    }

    pub fn get_hash_bytes_str(&self) -> &str {
        &self.hash[2..]
    }

    pub fn get_hash_bytes(&self) -> Vec<u8> {
        hex::decode(&self.get_hash_bytes_str()).unwrap()
    }

    pub fn get_8_hash_bytes(&self) -> [u8; 8] {
        let bytes = self.get_hash_bytes();
        [
            bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        ]
    }
}

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, strum::EnumIter, strum::IntoStaticStr,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OperationType {
    Credit,
    Debit,
    Lock,
}

#[derive(Debug, Clone, Default, PartialEq, Deserialize, Serialize)]
pub struct OperationMetadata {
    /// Has to be specified for ADD_KEY, REMOVE_KEY, and STAKE operations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_key: Option<PublicKey>,
    // TODO(lgalabru): ???
    //#[serde(skip_serializing_if = "Option::is_none")]
    // pub access_key: Option<TODO>,
    /// Has to be specified for DEPLOY_CONTRACT operation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    /// Has to be specified for FUNCTION_CALL operation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method_name: Option<String>,
    /// Has to be specified for FUNCTION_CALL operation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<String>,
}

/// PublicKey contains a public key byte array for a particular CurveType
/// encoded in hex. Note that there is no PrivateKey struct as this is NEVER the
/// concern of an implementation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PublicKey {
    /// Hex-encoded public key bytes in the format specified by the CurveType.
    pub hex_bytes: Option<String>,
    pub curve_type: CurveType,
}

/// CurveType is the type of cryptographic curve associated with a PublicKey.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CurveType {
    /// `y (255-bits) || x-sign-bit (1-bit)` - `32 bytes` (<https://ed25519.cr.yp.to/ed25519-20110926.pdf>)
    Edwards25519,
    /// SEC compressed - `33 bytes` (<https://secg.org/sec1-v2.pdf#subsubsection.2.3.3>)
    Secp256k1,
}

/// Operations contain all balance-changing information within a transaction.
/// They are always one-sided (only affect 1 AccountIdentifier) and can
/// succeed or fail independently from a Transaction.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Operation {
    pub operation_identifier: OperationIdentifier,

    /// Restrict referenced related_operations to identifier indexes < the
    /// current operation_identifier.index. This ensures there exists a clear
    /// DAG-structure of relations. Since operations are one-sided, one could
    /// imagine relating operations in a single transfer or linking operations
    /// in a call tree.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub related_operations: Option<Vec<OperationIdentifier>>,

    /// The network-specific type of the operation. Ensure that any type that
    /// can be returned here is also specified in the NetworkStatus. This can
    /// be very useful to downstream consumers that parse all block data.
    #[serde(rename = "type")]
    pub type_: OperationType,

    /// The network-specific status of the operation. Status is not defined on
    /// the transaction object because blockchains with smart contracts may have
    /// transactions that partially apply. Blockchains with atomic transactions
    /// (all operations succeed or all operations fail) will have the same
    /// status for each operation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<OperationStatusKind>,

    pub account: AccountIdentifier,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<Amount>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<OperationMetadata>,
}

/// The operation_identifier uniquely identifies an operation within a
/// transaction.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OperationIdentifier {
    /// The operation index is used to ensure each operation has a unique
    /// identifier within a transaction. This index is only relative to the
    /// transaction and NOT GLOBAL. The operations in each transaction should
    /// start from index 0. To clarify, there may not be any notion of an
    /// operation index in the blockchain being described.
    pub index: u32,

    /// Some blockchains specify an operation index that is essential for
    /// client use. For example, Bitcoin uses a network_index to identify
    /// which UTXO was used in a transaction.  network_index should not be
    /// populated if there is no notion of an operation index in a blockchain
    /// (typically most account-based blockchains).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_index: Option<i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, strum::EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OperationStatusKind {
    Success,
}

/// The account_identifier uniquely identifies an account within a network. All
/// fields in the account_identifier are utilized to determine this uniqueness
/// (including the metadata field, if populated).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub struct AccountIdentifier {
    /// The address may be a cryptographic public key (or some encoding of it)
    /// or a provided username.
    pub address: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_account: Option<SubAccountIdentifier>,
    /* Rosetta Spec also optionally provides:
     *
     * /// Blockchains that utilize a username model (where the address is not a
     * /// derivative of a cryptographic public key) should specify the public
     * /// key(s) owned by the address in metadata.
     * #[serde(skip_serializing_if = "Option::is_none")]
     * pub metadata: Option<serde_json::Value>, */
}

/// An account may have state specific to a contract address (ERC-20 token)
/// and/or a stake (delegated balance). The sub_account_identifier should
/// specify which state (if applicable) an account instantiation refers to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub struct SubAccountIdentifier {
    /// The SubAccount address may be a cryptographic value or some other
    /// identifier (ex: bonded) that uniquely specifies a SubAccount.
    pub address: SubAccount,
    /* Rosetta Spec also optionally provides:
     *
     * /// If the SubAccount address is not sufficient to uniquely specify a
     * /// SubAccount, any other identifying information can be stored here.  It is
     * /// important to note that two SubAccounts with identical addresses but
     * /// differing metadata will not be considered equal by clients.
     * #[serde(skip_serializing_if = "Option::is_none")]
     * pub metadata: Option<serde_json::Value>, */
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubAccount {
    LiquidBalanceForStorage,
    Locked,
}

/// Amount is some Value of a Currency. It is considered invalid to specify a
/// Value without a Currency.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Amount {
    /// Value of the transaction in atomic units represented as an
    /// arbitrary-sized signed integer.  For example, 1 BTC would be represented
    /// by a value of 100000000.
    pub value: u128,

    pub currency: Currency,
    /* Rosetta Spec also optionally provides:
     *
     * #[serde(skip_serializing_if = "Option::is_none")]
     * pub metadata: Option<serde_json::Value>, */
}

/// Currency is composed of a canonical Symbol and Decimals. This Decimals value
/// is used to convert an Amount.Value from atomic units (Satoshis) to standard
/// units (Bitcoins).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Currency {
    /// Canonical symbol associated with a currency.
    pub symbol: String,

    /// Number of decimal places in the standard unit representation of the
    /// amount.  For example, BTC has 8 decimals. Note that it is not possible
    /// to represent the value of some currency in atomic units that is not base
    /// 10.
    pub decimals: u32,

    /// Any additional information related to the currency itself.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<CurrencyMetadata>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CurrencyStandard {
    Sip09,
    Sip10,
    None,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurrencyMetadata {
    pub asset_class_identifier: String,
    pub asset_identifier: Option<String>,
    pub standard: CurrencyStandard,
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum BlockchainEvent {
    BlockchainUpdatedWithHeaders(BlockchainUpdatedWithHeaders),
    BlockchainUpdatedWithReorg(BlockchainUpdatedWithReorg),
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BlockchainUpdatedWithHeaders {
    pub new_headers: Vec<BlockHeader>,
    pub confirmed_headers: Vec<BlockHeader>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BlockchainUpdatedWithReorg {
    pub headers_to_rollback: Vec<BlockHeader>,
    pub headers_to_apply: Vec<BlockHeader>,
    pub confirmed_headers: Vec<BlockHeader>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BlockHeader {
    pub block_identifier: BlockIdentifier,
    pub parent_block_identifier: BlockIdentifier,
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum BitcoinChainEvent {
    ChainUpdatedWithBlocks(BitcoinChainUpdatedWithBlocksData),
    ChainUpdatedWithReorg(BitcoinChainUpdatedWithReorgData),
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BitcoinChainUpdatedWithBlocksData {
    pub new_blocks: Vec<BitcoinBlockData>,
    pub confirmed_blocks: Vec<BitcoinBlockData>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BitcoinChainUpdatedWithReorgData {
    pub blocks_to_rollback: Vec<BitcoinBlockData>,
    pub blocks_to_apply: Vec<BitcoinBlockData>,
    pub confirmed_blocks: Vec<BitcoinBlockData>,
}

#[allow(dead_code)]
#[derive(
    Debug, PartialEq, Eq, Clone, PartialOrd, Ord, Hash, Serialize, Deserialize, JsonSchema,
)]
#[serde(rename_all = "snake_case")]
pub enum BitcoinNetwork {
    Regtest,
    Testnet,
    Signet,
    Mainnet,
}

impl std::fmt::Display for BitcoinNetwork {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
impl BitcoinNetwork {
    pub fn from_str(network: &str) -> Result<BitcoinNetwork, String> {
        let value = match network {
            "regtest" => BitcoinNetwork::Regtest,
            "testnet" => BitcoinNetwork::Testnet,
            "mainnet" => BitcoinNetwork::Mainnet,
            "signet" => BitcoinNetwork::Signet,
            _ => {
                return Err(format!(
                    "network '{}' unsupported (mainnet, testnet, regtest, signet)",
                    network
                ))
            }
        };
        Ok(value)
    }

    pub fn as_str(&self) -> &str {
        match self {
            BitcoinNetwork::Regtest => "regtest",
            BitcoinNetwork::Testnet => "testnet",
            BitcoinNetwork::Mainnet => "mainnet",
            BitcoinNetwork::Signet => "signet",
        }
    }

    pub fn from_network(network: Network) -> BitcoinNetwork {
        match network {
            Network::Bitcoin => BitcoinNetwork::Mainnet,
            Network::Testnet => BitcoinNetwork::Testnet,
            Network::Testnet4 => BitcoinNetwork::Testnet,
            Network::Signet => BitcoinNetwork::Signet,
            Network::Regtest => BitcoinNetwork::Regtest,
            _ => unreachable!(),
        }
    }
}
