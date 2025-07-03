#[derive(Debug, Clone)]
pub struct InputRuneBalance {
    /// Previous owner of this balance. If this is `None`, it means the balance was just minted or premined.
    pub address: Option<String>,
    /// How much balance was input to this transaction.
    pub amount: u128,
}

#[cfg(test)]
impl InputRuneBalance {
    pub fn dummy() -> Self {
        InputRuneBalance {
            address: Some(
                "bc1p8zxlhgdsq6dmkzk4ammzcx55c3hfrg69ftx0gzlnfwq0wh38prds0nzqwf".to_string(),
            ),
            amount: 1000,
        }
    }

    pub fn amount(&mut self, amount: u128) -> &mut Self {
        self.amount = amount;
        return self;
    }

    pub fn address(&mut self, address: Option<String>) -> &mut Self {
        self.address = address;
        return self;
    }
}
