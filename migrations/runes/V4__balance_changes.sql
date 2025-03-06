CREATE TABLE IF NOT EXISTS balance_changes (
    rune_id                 TEXT NOT NULL,
    block_height            NUMERIC NOT NULL,
    address                 TEXT NOT NULL,
    balance                 NUMERIC NOT NULL,
    total_operations        BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (rune_id, block_height, address)
);

CREATE INDEX balance_changes_address_balance_index ON balance_changes (address, block_height, balance DESC);
CREATE INDEX balance_changes_rune_id_balance_index ON balance_changes (rune_id, block_height, balance DESC);
