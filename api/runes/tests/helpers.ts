import { readdirSync } from 'fs';
import { PgStore } from '../src/pg/pg-store';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { buildApiServer } from '../src/api/init';
import * as fs from 'fs';
import * as path from 'path';
import { DbLedgerEntry, DbRune } from '../src/pg/types';
import { PgSqlClient } from '@hirosystems/api-toolkit';

export type TestFastifyServer = FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export async function startTestApiServer(db: PgStore): Promise<TestFastifyServer> {
  return await buildApiServer({ db });
}

const RUNES_MIGRATIONS_DIR = '../../migrations/runes';

/// Runs SQL migrations based on the Rust `refinery` crate standard.
export async function runMigrations(sql: PgSqlClient) {
  const files = fs.readdirSync(RUNES_MIGRATIONS_DIR);
  const sqlFiles = files
    .filter(file => path.extname(file).toLowerCase() === '.sql')
    .map(file => path.join(RUNES_MIGRATIONS_DIR, file))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.toString() || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.toString() || '0', 10);
      return numA - numB;
    });
  for (const sqlFile of sqlFiles) await sql.file(sqlFile);
  return sqlFiles;
}

/// Drops all tables and types from a test DB. Equivalent to a migration rollback, which are
/// unsupported by the `refinery` crate.
export async function clearDb(sql: PgSqlClient) {
  await sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `;
  await sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `;
}

export function sampleLedgerEntry(rune_id: string, block_height?: string): DbLedgerEntry {
  return {
    rune_id: '1:1',
    block_hash: '0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5',
    block_height: block_height || '840000',
    tx_index: 0,
    tx_id: '2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e',
    output: 0,
    address: '0',
    receiver_address: '0',
    amount: '0',
    operation: 'etching',
    timestamp: 0,
  };
}

function toSpacedName(name: string | null): string | null {
  if (name === null) {
    return null;
  }
  // should take "Some name" and make it "Some•name"
  const words = name.split(' ');
  return words.join('•');
}
export function sampleRune(id: string, name?: string): DbRune {
  return {
    id: '1:1',
    name: name || 'SAMPLERUNENAME',
    spaced_name: (name && toSpacedName(name)) || 'SAMPLE•RUNE•NAME',
    number: 1,
    block_hash: '0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5',
    block_height: '840000',
    tx_index: 1,
    tx_id: '2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e',
    divisibility: 2,
    premine: '1000',
    symbol: 'ᚠ',
    cenotaph: true,
    terms_amount: '100',
    terms_cap: '5000000',
    terms_height_start: null,
    terms_height_end: null,
    terms_offset_start: null,
    terms_offset_end: null,
    turbo: false,
    minted: '1000',
    total_mints: '1500',
    burned: '500',
    total_burns: '750',
    total_operations: '1',
    timestamp: 1713571767,
  };
}

export async function insertDbLedgerEntry(
  db: PgStore,
  payload: DbLedgerEntry,
  event_index: number
): Promise<void> {
  await db.sqlWriteTransaction(async sql => {
    const {
      rune_id,
      block_hash,
      block_height,
      tx_index,
      tx_id,
      output,
      address,
      receiver_address,
      amount,
      operation,
    } = payload;

    await sql`
      INSERT INTO ledger (
        rune_id, block_hash, block_height, tx_index, tx_id, output,
        address, receiver_address, amount, operation, timestamp, event_index
      )
      VALUES (

      ${rune_id}, ${block_hash}, ${block_height}, ${tx_index}, ${tx_id}, ${output}, ${address}, ${receiver_address}, ${amount}, ${operation}, 0, ${event_index}
      )
    `;
  });
}

export async function insertSupplyChange(
  db: PgStore,
  rune_id: string,
  block_height: number,
  minted?: number,
  total_mints?: number,
  total_operations?: number
): Promise<void> {
  await db.sqlWriteTransaction(async sql => {
    const burned = 0;
    const total_burned = 0;

    await sql`
      INSERT INTO supply_changes (
        rune_id, block_height, minted, total_mints, burned, total_burns, total_operations
      )
      VALUES (

      ${rune_id}, ${block_height}, ${minted || 0}, ${
      total_mints || 0
    }, ${burned}, ${total_burned}, ${total_operations || 0}
      )
    `;
  });
}

export async function insertRune(db: PgStore, payload: DbRune): Promise<void> {
  await db.sqlWriteTransaction(async sql => {
    const {
      id,
      name,
      spaced_name,
      number,
      block_hash,
      block_height,
      tx_index,
      tx_id,
      symbol,
      cenotaph,
      terms_amount,
      terms_cap,
      terms_height_start,
      terms_height_end,
    } = payload;

    await sql`
      INSERT INTO runes (
        id, number, name, spaced_name, block_hash, block_height, tx_index, tx_id, symbol, cenotaph,
        terms_amount, terms_cap, terms_height_start, terms_height_end, timestamp
      )
      VALUES (

      ${id}, ${number}, ${name}, ${spaced_name}, ${block_hash}, ${block_height}, ${tx_index}, ${tx_id}, ${symbol}, ${cenotaph}, ${
      terms_amount || ''
    }, ${terms_cap || ''}, ${terms_height_start}, ${terms_height_end}, 0
      )
    `;
  });
}
