use bitcoin::Network;
use bitcoind::types::OrdinalInscriptionNumber;
use deadpool_postgres::GenericClient;

use super::inscription_sequencing;
use crate::db::ordinals_pg;

/// Helper caching inscription sequence cursor
///
/// When attributing an inscription number to a new inscription, retrieving the next inscription number to use (both for
/// blessed and cursed sequence) is an expensive operation, challenging to optimize from a SQL point of view.
/// This structure is wrapping the expensive SQL query and helping us keeping track of the next inscription number to
/// use.
pub struct SequenceCursor {
    pos_cursor: Option<i64>,
    neg_cursor: Option<i64>,
    jubilee_cursor: Option<i64>,
    unbound_cursor: Option<i64>,
    current_block_height: u64,
}

impl Default for SequenceCursor {
    fn default() -> Self {
        Self::new()
    }
}

impl SequenceCursor {
    pub fn new() -> Self {
        SequenceCursor {
            jubilee_cursor: None,
            pos_cursor: None,
            neg_cursor: None,
            unbound_cursor: None,
            current_block_height: 0,
        }
    }

    pub fn reset(&mut self) {
        self.pos_cursor = None;
        self.neg_cursor = None;
        self.jubilee_cursor = None;
        self.unbound_cursor = None;
        self.current_block_height = 0;
    }

    pub async fn pick_next<T: GenericClient>(
        &mut self,
        cursed: bool,
        block_height: u64,
        network: &Network,
        client: &T,
    ) -> Result<OrdinalInscriptionNumber, String> {
        if block_height < self.current_block_height {
            self.reset();
        }
        self.current_block_height = block_height;

        let classic = match cursed {
            true => self.pick_next_neg_classic(client).await?,
            false => self.pick_next_pos_classic(client).await?,
        };

        let jubilee = if block_height >= inscription_sequencing::get_jubilee_block_height(network) {
            self.pick_next_jubilee_number(client).await?
        } else {
            classic
        };
        Ok(OrdinalInscriptionNumber { classic, jubilee })
    }

    pub async fn increment<T: GenericClient>(
        &mut self,
        cursed: bool,
        client: &T,
    ) -> Result<(), String> {
        self.increment_jubilee_number(client).await?;
        if cursed {
            self.increment_neg_classic(client).await?;
        } else {
            self.increment_pos_classic(client).await?;
        };
        Ok(())
    }

    pub async fn increment_unbound<T: GenericClient>(&mut self, client: &T) -> Result<i64, String> {
        let next = self.pick_next_unbound(client).await?;
        self.unbound_cursor = Some(next);
        Ok(next)
    }

    async fn pick_next_pos_classic<T: GenericClient>(&mut self, client: &T) -> Result<i64, String> {
        match self.pos_cursor {
            None => {
                match ordinals_pg::get_highest_blessed_classic_inscription_number(client).await? {
                    Some(inscription_number) => {
                        self.pos_cursor = Some(inscription_number);
                        Ok(inscription_number + 1)
                    }
                    _ => Ok(0),
                }
            }
            Some(value) => Ok(value + 1),
        }
    }

    async fn pick_next_jubilee_number<T: GenericClient>(
        &mut self,
        client: &T,
    ) -> Result<i64, String> {
        match self.jubilee_cursor {
            None => match ordinals_pg::get_highest_inscription_number(client).await? {
                Some(inscription_number) => {
                    self.jubilee_cursor = Some(inscription_number);
                    Ok(inscription_number + 1)
                }
                _ => Ok(0),
            },
            Some(value) => Ok(value + 1),
        }
    }

    async fn pick_next_neg_classic<T: GenericClient>(&mut self, client: &T) -> Result<i64, String> {
        match self.neg_cursor {
            None => {
                match ordinals_pg::get_lowest_cursed_classic_inscription_number(client).await? {
                    Some(inscription_number) => {
                        self.neg_cursor = Some(inscription_number);
                        Ok(inscription_number - 1)
                    }
                    _ => Ok(-1),
                }
            }
            Some(value) => Ok(value - 1),
        }
    }

    async fn pick_next_unbound<T: GenericClient>(&mut self, client: &T) -> Result<i64, String> {
        match self.unbound_cursor {
            None => match ordinals_pg::get_highest_unbound_inscription_sequence(client).await? {
                Some(unbound_sequence) => {
                    self.unbound_cursor = Some(unbound_sequence);
                    Ok(unbound_sequence + 1)
                }
                _ => Ok(0),
            },
            Some(value) => Ok(value + 1),
        }
    }

    async fn increment_neg_classic<T: GenericClient>(&mut self, client: &T) -> Result<(), String> {
        self.neg_cursor = Some(self.pick_next_neg_classic(client).await?);
        Ok(())
    }

    async fn increment_pos_classic<T: GenericClient>(&mut self, client: &T) -> Result<(), String> {
        self.pos_cursor = Some(self.pick_next_pos_classic(client).await?);
        Ok(())
    }

    async fn increment_jubilee_number<T: GenericClient>(
        &mut self,
        client: &T,
    ) -> Result<(), String> {
        self.jubilee_cursor = Some(self.pick_next_jubilee_number(client).await?);
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use bitcoin::Network;
    use bitcoind::types::OrdinalOperation;
    use postgres::{pg_begin, pg_pool_client};
    use test_case::test_case;

    use super::SequenceCursor;
    use crate::{
        core::test_builders::{TestBlockBuilder, TestTransactionBuilder},
        db::{
            ordinals_pg::{self, insert_block},
            pg_reset_db, pg_test_connection, pg_test_connection_pool,
        },
    };

    #[test_case((780000, false) => Ok((2, 2)); "with blessed pre jubilee")]
    #[test_case((780000, true) => Ok((-2, -2)); "with cursed pre jubilee")]
    #[test_case((850000, false) => Ok((2, 2)); "with blessed post jubilee")]
    #[test_case((850000, true) => Ok((-2, 2)); "with cursed post jubilee")]
    #[tokio::test]
    async fn picks_next_number((block_height, cursed): (u64, bool)) -> Result<(i64, i64), String> {
        let mut pg_client = pg_test_connection().await;
        ordinals_pg::migrate(&mut pg_client).await?;
        let result = {
            let mut ord_client = pg_pool_client(&pg_test_connection_pool()).await?;
            let client = pg_begin(&mut ord_client).await?;

            let mut block = TestBlockBuilder::new()
                .transactions(vec![TestTransactionBuilder::new_with_operation().build()])
                .build();
            block.block_identifier.index = block_height;
            insert_block(&block, &client).await?;

            // Pick next twice so we can test all cases.
            let mut cursor = SequenceCursor::new();
            let _ = cursor
                .pick_next(
                    cursed,
                    block.block_identifier.index + 1,
                    &Network::Bitcoin,
                    &client,
                )
                .await?;
            cursor.increment(cursed, &client).await?;

            block.block_identifier.index = block.block_identifier.index + 1;
            insert_block(&block, &client).await?;
            let next = cursor
                .pick_next(
                    cursed,
                    block.block_identifier.index + 1,
                    &Network::Bitcoin,
                    &client,
                )
                .await?;

            (next.classic, next.jubilee)
        };
        pg_reset_db(&mut pg_client).await?;
        Ok(result)
    }

    #[test_case(None => Ok(0); "without sequence")]
    #[test_case(Some(21) => Ok(22); "with current sequence")]
    #[tokio::test]
    async fn picks_next_unbound_sequence(curr_sequence: Option<i64>) -> Result<i64, String> {
        let mut pg_client = pg_test_connection().await;
        ordinals_pg::migrate(&mut pg_client).await?;
        let result = {
            let mut ord_client = pg_pool_client(&pg_test_connection_pool()).await?;
            let client = pg_begin(&mut ord_client).await?;

            let mut tx = TestTransactionBuilder::new_with_operation().build();
            if let OrdinalOperation::InscriptionRevealed(data) =
                &mut tx.metadata.ordinal_operations[0]
            {
                data.unbound_sequence = curr_sequence;
            };
            let block = TestBlockBuilder::new().transactions(vec![tx]).build();
            insert_block(&block, &client).await?;

            let mut cursor = SequenceCursor::new();
            cursor.increment_unbound(&client).await?
        };
        pg_reset_db(&mut pg_client).await?;
        Ok(result)
    }
}
