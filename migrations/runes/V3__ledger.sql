CREATE TYPE ledger_operation AS ENUM ('etching', 'mint', 'burn', 'send', 'receive');

CREATE TABLE IF NOT EXISTS ledger (
    rune_id                 TEXT NOT NULL,
    block_hash              TEXT NOT NULL,
    block_height            NUMERIC NOT NULL,
    tx_index                BIGINT NOT NULL,
    event_index             BIGINT NOT NULL,
    tx_id                   TEXT NOT NULL,
    output                  BIGINT,
    address                 TEXT,
    receiver_address        TEXT,
    amount                  NUMERIC,
    operation               ledger_operation NOT NULL,
    timestamp               BIGINT NOT NULL
);

CREATE INDEX ledger_rune_id_index ON ledger (rune_id);
CREATE INDEX ledger_block_height_tx_index_event_index_index ON ledger (block_height DESC, tx_index DESC, event_index DESC);
CREATE INDEX ledger_address_rune_id_index ON ledger (address, rune_id);
CREATE INDEX ledger_tx_id_output_index ON ledger (tx_id, output);
