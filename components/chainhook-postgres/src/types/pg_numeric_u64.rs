use std::{cmp::Ordering, error::Error};

use bytes::BytesMut;
use num_traits::ToPrimitive;
use tokio_postgres::types::{to_sql_checked, FromSql, IsNull, ToSql, Type};

use super::pg_numeric_u128::{pg_numeric_bytes_to_u128, u128_into_pg_numeric_bytes};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PgNumericU64(pub u64);

impl ToSql for PgNumericU64 {
    fn to_sql(
        &self,
        _ty: &Type,
        out: &mut BytesMut,
    ) -> Result<IsNull, Box<dyn Error + Sync + Send>> {
        u128_into_pg_numeric_bytes(self.0 as u128, out);
        Ok(IsNull::No)
    }

    fn accepts(ty: &Type) -> bool {
        ty.name() == "numeric"
    }

    to_sql_checked!();
}

impl<'a> FromSql<'a> for PgNumericU64 {
    fn from_sql(_ty: &Type, raw: &'a [u8]) -> Result<PgNumericU64, Box<dyn Error + Sync + Send>> {
        let result = pg_numeric_bytes_to_u128(raw);
        Ok(PgNumericU64(result.to_u64().unwrap()))
    }

    fn accepts(ty: &Type) -> bool {
        ty.name() == "numeric"
    }
}

impl PartialOrd for PgNumericU64 {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.0.cmp(&other.0))
    }
}

impl Ord for PgNumericU64 {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}

#[cfg(test)]
mod test {
    use test_case::test_case;

    use super::PgNumericU64;
    use crate::pg_test_client;

    #[test_case(18446744073709551615; "u64 max")]
    #[test_case(800000000000; "with trailing zeros")]
    #[test_case(0; "zero")]
    #[tokio::test]
    async fn test_u64_to_postgres(val: u64) {
        let mut client = pg_test_client().await;
        let value = PgNumericU64(val);
        let tx = client.transaction().await.unwrap();
        let _ = tx.query("CREATE TABLE test (value NUMERIC)", &[]).await;
        let _ = tx
            .query("INSERT INTO test (value) VALUES ($1)", &[&value])
            .await;
        let row = tx.query_one("SELECT value FROM test", &[]).await.unwrap();
        let res: PgNumericU64 = row.get("value");
        let _ = tx.rollback().await;
        assert_eq!(res.0, value.0);
    }
}
