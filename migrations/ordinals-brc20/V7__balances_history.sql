CREATE TABLE balances_history (
  ticker TEXT NOT NULL,
  address TEXT NOT NULL,
  block_height NUMERIC NOT NULL,
  avail_balance NUMERIC NOT NULL,
  trans_balance NUMERIC NOT NULL,
  total_balance NUMERIC NOT NULL
);
ALTER TABLE balances_history ADD PRIMARY KEY (address, ticker, block_height);
CREATE INDEX balances_history_block_height_index ON balances_history (block_height);
