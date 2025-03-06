CREATE TABLE inscription_parents (
    inscription_id TEXT NOT NULL,
    parent_inscription_id TEXT NOT NULL
);
ALTER TABLE inscription_parents ADD PRIMARY KEY (inscription_id, parent_inscription_id);
ALTER TABLE inscription_parents ADD CONSTRAINT inscription_parents FOREIGN KEY(inscription_id) REFERENCES inscriptions(inscription_id) ON DELETE CASCADE;

-- Migrate from old `parent` column in `inscriptions` table.
INSERT INTO inscription_parents (inscription_id, parent_inscription_id) (
    SELECT inscription_id, parent AS parent_inscription_id
    FROM inscriptions
    WHERE parent IS NOT NULL
);
ALTER TABLE inscriptions DROP COLUMN parent;
