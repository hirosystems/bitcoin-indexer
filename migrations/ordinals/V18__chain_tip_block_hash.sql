ALTER TABLE chain_tip ADD COLUMN block_hash TEXT;
ALTER TABLE chain_tip ALTER COLUMN block_height DROP NOT NULL;

WITH last_block AS (
    SELECT block_height, block_hash
    FROM locations
    ORDER BY block_height DESC
    LIMIT 1
)
UPDATE chain_tip SET
    block_height = (SELECT block_height FROM last_block),
    block_hash = (SELECT block_hash FROM last_block);
