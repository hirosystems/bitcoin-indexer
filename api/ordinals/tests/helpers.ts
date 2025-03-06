import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { PgSqlClient } from '@hirosystems/api-toolkit';

export const ORDINALS_MIGRATIONS_DIR = '../../migrations/ordinals';
export const BRC20_MIGRATIONS_DIR = '../../migrations/ordinals-brc20';

/// Runs SQL migrations based on the Rust `refinery` crate standard.
export async function runMigrations(sql: PgSqlClient, directory: string) {
  const files = fs.readdirSync(directory);
  const sqlFiles = files
    .filter(file => path.extname(file).toLowerCase() === '.sql')
    .map(file => path.join(directory, file))
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

export type TestFastifyServer = FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

type TestOrdinalsInscriptionsRow = {
  inscription_id: string;
  ordinal_number: string;
  number: string;
  classic_number: string;
  block_height: string;
  block_hash: string;
  tx_id: string;
  tx_index: number;
  address: string | null;
  mime_type: string;
  content_type: string;
  content_length: number;
  content: string;
  fee: string;
  curse_type: string | null;
  recursive: boolean;
  input_index: number;
  pointer: string | null;
  metadata: string | null;
  metaprotocol: string | null;
  delegate: string | null;
  timestamp: number;
  charms: number;
};
async function insertTestInscription(sql: PgSqlClient, row: TestOrdinalsInscriptionsRow) {
  await sql`INSERT INTO inscriptions ${sql(row)}`;
}

type TestOrdinalsLocationsRow = {
  ordinal_number: string;
  block_height: string;
  tx_index: number;
  tx_id: string;
  block_hash: string;
  address: string | null;
  output: string;
  offset: string | null;
  prev_output: string | null;
  prev_offset: string | null;
  value: string | null;
  transfer_type: string;
  timestamp: number;
};
async function insertTestLocation(sql: PgSqlClient, row: TestOrdinalsLocationsRow) {
  await sql`
    INSERT INTO locations ${sql(row)}
    ON CONFLICT (ordinal_number, block_height, tx_index) DO NOTHING
  `;
}

type TestOrdinalsCurrentLocationsRow = {
  ordinal_number: string;
  block_height: string;
  tx_id: string;
  tx_index: number;
  address: string;
  output: string;
  offset: string | null;
};
async function insertTestCurrentLocation(sql: PgSqlClient, row: TestOrdinalsCurrentLocationsRow) {
  await sql`
    INSERT INTO current_locations ${sql(row)}
    ON CONFLICT (ordinal_number) DO UPDATE SET
      block_height = EXCLUDED.block_height,
      tx_id = EXCLUDED.tx_id,
      tx_index = EXCLUDED.tx_index,
      address = EXCLUDED.address,
      output = EXCLUDED.output,
      \"offset\" = EXCLUDED.\"offset\"
  `;
}

type TestOrdinalsSatoshisRow = {
  ordinal_number: string;
  rarity: string;
  coinbase_height: string;
};
async function insertTestSatoshi(sql: PgSqlClient, row: TestOrdinalsSatoshisRow) {
  await sql`
    INSERT INTO satoshis ${sql(row)}
    ON CONFLICT (ordinal_number) DO NOTHING
  `;
}

type TestOrdinalsInscriptionTransfersRow = {
  inscription_id: string;
  number: string;
  ordinal_number: string;
  block_height: string;
  tx_index: number;
  from_block_height: string;
  from_tx_index: number;
  block_transfer_index: number;
};
async function insertTestInscriptionTransfer(
  sql: PgSqlClient,
  row: TestOrdinalsInscriptionTransfersRow
) {
  await sql`INSERT INTO inscription_transfers ${sql(row)}`;
}

type TestOrdinalsCountsByBlockRow = {
  block_height: string;
  block_hash: string;
  inscription_count: number;
  inscription_count_accum: number;
  timestamp: number;
};
export async function insertTestCountsByBlock(sql: PgSqlClient, row: TestOrdinalsCountsByBlockRow) {
  await sql`
    INSERT INTO counts_by_block ${sql(row)}
    ON CONFLICT (block_height) DO UPDATE SET
      inscription_count = counts_by_block.inscription_count + EXCLUDED.inscription_count,
      inscription_count_accum = counts_by_block.inscription_count_accum + EXCLUDED.inscription_count_accum
  `;
}

type TestOrdinalsInscriptionRecursionsRow = {
  inscription_id: string;
  ref_inscription_id: string;
};
export async function insertTestInscriptionRecursion(
  sql: PgSqlClient,
  row: TestOrdinalsInscriptionRecursionsRow
) {
  await sql`INSERT INTO inscription_recursions ${sql(row)}`;
}

type TestOrdinalsInscriptionParentsRow = {
  inscription_id: string;
  parent_inscription_id: string;
};
export async function insertTestInscriptionParent(
  sql: PgSqlClient,
  row: TestOrdinalsInscriptionParentsRow
) {
  await sql`INSERT INTO inscription_parents ${sql(row)}`;
}

export async function updateTestChainTip(sql: PgSqlClient, blockHeight: number) {
  await sql`UPDATE chain_tip SET block_height = ${blockHeight}`;
}

type TestOrdinalsInscriptionReveal = TestOrdinalsInscriptionsRow &
  TestOrdinalsLocationsRow &
  TestOrdinalsSatoshisRow &
  TestOrdinalsCurrentLocationsRow;
export async function inscriptionReveal(sql: PgSqlClient, reveal: TestOrdinalsInscriptionReveal) {
  await insertTestSatoshi(sql, {
    ordinal_number: reveal.ordinal_number,
    rarity: reveal.rarity,
    coinbase_height: reveal.coinbase_height,
  });
  await insertTestInscription(sql, {
    inscription_id: reveal.inscription_id,
    ordinal_number: reveal.ordinal_number,
    number: reveal.number,
    classic_number: reveal.classic_number,
    block_height: reveal.block_height,
    block_hash: reveal.block_hash,
    tx_id: reveal.tx_id,
    tx_index: reveal.tx_index,
    address: reveal.address,
    mime_type: reveal.mime_type,
    content_type: reveal.content_type,
    content_length: reveal.content_length,
    content: reveal.content,
    fee: reveal.fee,
    curse_type: reveal.curse_type,
    recursive: reveal.recursive,
    input_index: reveal.input_index,
    pointer: reveal.pointer,
    metadata: reveal.metadata,
    metaprotocol: reveal.metaprotocol,
    delegate: reveal.delegate,
    timestamp: reveal.timestamp,
    charms: reveal.charms,
  });
  await insertTestLocation(sql, {
    ordinal_number: reveal.ordinal_number,
    block_height: reveal.block_height,
    tx_index: reveal.tx_index,
    tx_id: reveal.tx_id,
    block_hash: reveal.block_hash,
    address: reveal.address,
    output: reveal.output,
    offset: reveal.offset,
    prev_output: reveal.prev_output,
    prev_offset: reveal.prev_offset,
    value: reveal.value,
    transfer_type: reveal.transfer_type,
    timestamp: reveal.timestamp,
  });
  await insertTestCurrentLocation(sql, {
    ordinal_number: reveal.ordinal_number,
    block_height: reveal.block_height,
    tx_index: reveal.tx_index,
    tx_id: reveal.tx_id,
    address: reveal.address,
    output: reveal.output,
    offset: reveal.offset,
  });
  await insertTestCountsByBlock(sql, {
    block_height: reveal.block_height,
    block_hash: reveal.block_hash,
    inscription_count: 1,
    inscription_count_accum: 1,
    timestamp: reveal.timestamp,
  });
  await sql`
    INSERT INTO counts_by_mime_type ${sql({ mime_type: reveal.mime_type, count: 1 })}
    ON CONFLICT (mime_type) DO UPDATE SET
      count = counts_by_mime_type.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_sat_rarity ${sql({ rarity: reveal.rarity, count: 1 })}
    ON CONFLICT (rarity) DO UPDATE SET
      count = counts_by_sat_rarity.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_type ${sql({
      type: parseInt(reveal.classic_number) >= 0 ? 'blessed' : 'cursed',
      count: 1,
    })}
    ON CONFLICT (type) DO UPDATE SET
      count = counts_by_type.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_address ${sql({ address: reveal.address, count: 1 })}
    ON CONFLICT (address) DO UPDATE SET
      count = counts_by_address.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_genesis_address ${sql({ address: reveal.address, count: 1 })}
    ON CONFLICT (address) DO UPDATE SET
      count = counts_by_genesis_address.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_recursive ${sql({ recursive: reveal.recursive, count: 1 })}
    ON CONFLICT (recursive) DO UPDATE SET
      count = counts_by_recursive.count + EXCLUDED.count
  `;
}

type TestOrdinalsInscriptionTransfer = TestOrdinalsLocationsRow &
  TestOrdinalsCurrentLocationsRow &
  TestOrdinalsInscriptionTransfersRow;
export async function inscriptionTransfer(
  sql: PgSqlClient,
  transfer: TestOrdinalsInscriptionTransfer
) {
  await insertTestLocation(sql, {
    ordinal_number: transfer.ordinal_number,
    block_height: transfer.block_height,
    tx_index: transfer.tx_index,
    tx_id: transfer.tx_id,
    block_hash: transfer.block_hash,
    address: transfer.address,
    output: transfer.output,
    offset: transfer.offset,
    prev_output: transfer.prev_output,
    prev_offset: transfer.prev_offset,
    value: transfer.value,
    transfer_type: transfer.transfer_type,
    timestamp: transfer.timestamp,
  });
  await insertTestCurrentLocation(sql, {
    ordinal_number: transfer.ordinal_number,
    block_height: transfer.block_height,
    tx_index: transfer.tx_index,
    tx_id: transfer.tx_id,
    address: transfer.address,
    output: transfer.output,
    offset: transfer.offset,
  });
  await insertTestInscriptionTransfer(sql, {
    inscription_id: transfer.inscription_id,
    number: transfer.number,
    ordinal_number: transfer.ordinal_number,
    block_height: transfer.block_height,
    tx_index: transfer.tx_index,
    from_block_height: transfer.from_block_height,
    from_tx_index: transfer.from_tx_index,
    block_transfer_index: transfer.block_transfer_index,
  });
}

type TestBrc20OperationsRow = {
  ticker: string;
  operation: string;
  inscription_id: string;
  inscription_number: string;
  ordinal_number: string;
  block_height: string;
  block_hash: string;
  tx_id: string;
  tx_index: number;
  output: string;
  offset: string;
  timestamp: number;
  address: string;
  to_address: string | null;
  amount: string;
};
type TestBrc20TokensRow = {
  ticker: string;
  display_ticker: string;
  inscription_id: string;
  inscription_number: string;
  block_height: string;
  block_hash: string;
  tx_id: string;
  tx_index: number;
  address: string;
  max: string;
  limit: string;
  decimals: number;
  self_mint: boolean;
  minted_supply: string;
  tx_count: number;
  timestamp: number;
};
type TestBrc20BalancesRow = {
  ticker: string;
  address: string;
  avail_balance: string;
  trans_balance: string;
  total_balance: string;
};

type TestBrc20TokenDeploy = TestBrc20TokensRow & TestBrc20OperationsRow;
export async function brc20TokenDeploy(sql: PgSqlClient, deploy: TestBrc20TokenDeploy) {
  const token: TestBrc20TokensRow = {
    ticker: deploy.ticker,
    display_ticker: deploy.display_ticker,
    inscription_id: deploy.inscription_id,
    inscription_number: deploy.inscription_number,
    block_height: deploy.block_height,
    block_hash: deploy.block_hash,
    tx_id: deploy.tx_id,
    tx_index: deploy.tx_index,
    address: deploy.address,
    max: deploy.max,
    limit: deploy.limit,
    decimals: deploy.decimals,
    self_mint: deploy.self_mint,
    minted_supply: deploy.minted_supply,
    tx_count: deploy.tx_count,
    timestamp: deploy.timestamp,
  };
  await sql`INSERT INTO tokens ${sql(token)}`;
  const op: TestBrc20OperationsRow = {
    ticker: deploy.ticker,
    operation: 'deploy',
    inscription_id: deploy.inscription_id,
    inscription_number: deploy.inscription_number,
    ordinal_number: deploy.ordinal_number,
    block_height: deploy.block_height,
    block_hash: deploy.block_hash,
    tx_id: deploy.tx_id,
    tx_index: deploy.tx_index,
    output: deploy.output,
    offset: deploy.offset,
    timestamp: deploy.timestamp,
    address: deploy.address,
    to_address: deploy.to_address,
    amount: deploy.amount,
  };
  await sql`INSERT INTO operations ${sql(op)}`;
  await sql`
    INSERT INTO counts_by_operation ${sql({ operation: 'deploy', count: 1 })}
    ON CONFLICT (operation) DO UPDATE SET
      count = counts_by_operation.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_address_operation ${sql({
      address: deploy.address,
      operation: 'deploy',
      count: 1,
    })}
    ON CONFLICT (address, operation) DO UPDATE SET
      count = counts_by_address_operation.count + EXCLUDED.count
  `;
}

export async function brc20Operation(sql: PgSqlClient, operation: TestBrc20OperationsRow) {
  await sql`INSERT INTO operations ${sql(operation)}`;
  if (operation.operation != 'transfer_receive') {
    await sql`UPDATE tokens SET tx_count = tx_count + 1 WHERE ticker = ${operation.ticker}`;
  }
  await sql`
    INSERT INTO counts_by_operation ${sql({ operation: operation.operation, count: 1 })}
    ON CONFLICT (operation) DO UPDATE SET
      count = counts_by_operation.count + EXCLUDED.count
  `;
  await sql`
    INSERT INTO counts_by_address_operation ${sql({
      address: operation.address,
      operation: operation.operation,
      count: 1,
    })}
    ON CONFLICT (address, operation) DO UPDATE SET
      count = counts_by_address_operation.count + EXCLUDED.count
  `;
  const balance: TestBrc20BalancesRow = {
    ticker: operation.ticker,
    address: operation.address,
    avail_balance: '0',
    trans_balance: '0',
    total_balance: '0',
  };
  switch (operation.operation) {
    case 'mint':
    case 'transfer_receive':
      balance.avail_balance = operation.amount;
      balance.total_balance = operation.amount;
      break;
    case 'transfer':
      balance.avail_balance = `-${operation.amount}`;
      balance.trans_balance = operation.amount;
      break;
    case 'transfer_send':
      balance.trans_balance = `-${operation.amount}`;
      balance.total_balance = `-${operation.amount}`;
      break;
    default:
      break;
  }
  await sql`
    INSERT INTO balances ${sql(balance)}
    ON CONFLICT (ticker, address) DO UPDATE SET
      avail_balance = balances.avail_balance + EXCLUDED.avail_balance,
      trans_balance = balances.trans_balance + EXCLUDED.trans_balance,
      total_balance = balances.avail_balance + EXCLUDED.total_balance
  `;
  await sql`
    INSERT INTO balances_history
    (ticker, address, block_height, avail_balance, trans_balance, total_balance)
    (
      SELECT ticker, address, ${operation.block_height} AS block_height, avail_balance,
        trans_balance, total_balance
      FROM balances
      WHERE address = ${operation.address} AND ticker = ${operation.ticker}
    )
    ON CONFLICT (address, block_height, ticker) DO UPDATE SET
      avail_balance = EXCLUDED.avail_balance,
      trans_balance = EXCLUDED.trans_balance,
      total_balance = EXCLUDED.total_balance
  `;
}

/** Generate a random hash like string for testing */
export const randomHash = () =>
  [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

/** Generator for incrementing numbers */
export function* incrementing(
  start: number = 0,
  step: number = 1
): Generator<number, number, 'next'> {
  let current = start;

  while (true) {
    yield current;
    current += step;
  }
}
