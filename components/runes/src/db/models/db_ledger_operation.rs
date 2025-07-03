use std::{error::Error, fmt};

use bytes::BytesMut;
use tokio_postgres::types::{to_sql_checked, FromSql, IsNull, ToSql, Type};

/// A value from the `ledger_operation` enum type.
#[derive(Debug, Clone, PartialEq)]
pub enum DbLedgerOperation {
    Etching,
    Mint,
    Burn,
    Send,
    Receive,
}

impl fmt::Display for DbLedgerOperation {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.as_str().to_uppercase())
    }
}

impl DbLedgerOperation {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Etching => "etching",
            Self::Mint => "mint",
            Self::Burn => "burn",
            Self::Send => "send",
            Self::Receive => "receive",
        }
    }
}

impl std::str::FromStr for DbLedgerOperation {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "etching" => Ok(DbLedgerOperation::Etching),
            "mint" => Ok(DbLedgerOperation::Mint),
            "burn" => Ok(DbLedgerOperation::Burn),
            "send" => Ok(DbLedgerOperation::Send),
            "receive" => Ok(DbLedgerOperation::Receive),
            _ => Err(()),
        }
    }
}

impl ToSql for DbLedgerOperation {
    fn to_sql(
        &self,
        _ty: &Type,
        out: &mut BytesMut,
    ) -> Result<IsNull, Box<dyn Error + Sync + Send>> {
        out.extend_from_slice(self.as_str().as_bytes());
        Ok(IsNull::No)
    }

    fn accepts(ty: &Type) -> bool {
        ty.name() == "ledger_operation"
    }

    to_sql_checked!();
}

impl<'a> FromSql<'a> for DbLedgerOperation {
    fn from_sql(
        _ty: &Type,
        raw: &'a [u8],
    ) -> Result<DbLedgerOperation, Box<dyn Error + Sync + Send>> {
        let s = std::str::from_utf8(raw)?;
        s.parse::<DbLedgerOperation>()
            .map_err(|_| "failed to parse enum variant".into())
    }

    fn accepts(ty: &Type) -> bool {
        ty.name() == "ledger_operation"
    }
}
