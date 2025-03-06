CREATE TABLE IF NOT EXISTS runes (
    id                      TEXT NOT NULL PRIMARY KEY,
    number                  BIGINT NOT NULL UNIQUE,
    name                    TEXT NOT NULL UNIQUE,
    spaced_name             TEXT NOT NULL UNIQUE,
    block_hash              TEXT NOT NULL,
    block_height            NUMERIC NOT NULL,
    tx_index                BIGINT NOT NULL,
    tx_id                   TEXT NOT NULL,
    divisibility            SMALLINT NOT NULL DEFAULT 0,
    premine                 NUMERIC NOT NULL DEFAULT 0,
    symbol                  TEXT NOT NULL DEFAULT '¤',
    terms_amount            NUMERIC,
    terms_cap               NUMERIC,
    terms_height_start      NUMERIC,
    terms_height_end        NUMERIC,
    terms_offset_start      NUMERIC,
    terms_offset_end        NUMERIC,
    turbo                   BOOLEAN NOT NULL DEFAULT FALSE,
    cenotaph                BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp               BIGINT NOT NULL
);

CREATE INDEX runes_block_height_tx_index_index ON runes (block_height DESC, tx_index DESC);

-- Insert default 'UNCOMMON•GOODS'
INSERT INTO runes (
    id, number, name, spaced_name, block_hash, block_height, tx_index, tx_id, symbol, terms_amount,
    terms_cap, terms_height_start, terms_height_end, timestamp
)
VALUES (
    '1:0', 0, 'UNCOMMONGOODS', 'UNCOMMON•GOODS',
    '0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5', 840000, 0, '', '⧉', 1,
    '340282366920938463463374607431768211455', 840000, 1050000, 0
);
