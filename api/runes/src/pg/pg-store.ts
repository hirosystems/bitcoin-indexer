import {
  BasePgStore,
  PgConnectionVars,
  PgSqlClient,
  PgSqlQuery,
  connectPostgres,
} from '@hirosystems/api-toolkit';
import { ENV } from '../env';
import {
  DbBalance,
  DbCountedQueryResult,
  DbItemWithRune,
  DbLedgerEntry,
  DbPaginatedResult,
  DbRuneWithChainTip,
} from './types';
import {
  Address,
  BlockHeightCType,
  Block,
  Rune,
  Limit,
  Offset,
  RuneNameSchemaCType,
  RuneSpacedNameSchemaCType,
  TransactionId,
  RuneNumberSchemaCType,
} from '../api/schemas';

function runeFilter(sql: PgSqlClient, etching: string, prefix?: string): PgSqlQuery {
  const p = prefix ? `${prefix}.` : '';
  let filter = sql`${sql(`${p}id`)} = ${etching}`;
  if (RuneNameSchemaCType.Check(etching)) {
    filter = sql`${sql(`${p}name`)} = ${etching}`;
  } else if (RuneSpacedNameSchemaCType.Check(etching)) {
    filter = sql`${sql(`${p}spaced_name`)} = ${etching}`;
  } else if (RuneNumberSchemaCType.Check(etching)) {
    filter = sql`${sql(`${p}number`)} = ${etching}`;
  }
  return filter;
}

function blockFilter(sql: PgSqlClient, block: string, prefix?: string): PgSqlQuery {
  const p = prefix ? `${prefix}.` : '';
  let filter = sql`${sql(`${p}block_hash`)} = ${block}`;
  if (BlockHeightCType.Check(block)) {
    filter = sql`${sql(`${p}block_height`)} = ${block}`;
  }
  return filter;
}

export class PgStore extends BasePgStore {
  static async connect(): Promise<PgStore> {
    const pgConfig: PgConnectionVars = {
      host: ENV.RUNES_PGHOST,
      port: ENV.RUNES_PGPORT,
      user: ENV.RUNES_PGUSER,
      password: ENV.RUNES_PGPASSWORD,
      database: ENV.RUNES_PGDATABASE,
    };
    const sql = await connectPostgres({
      usageName: 'runes-api-pg-store',
      connectionArgs: pgConfig,
      connectionConfig: {
        poolMax: ENV.PG_CONNECTION_POOL_MAX,
        idleTimeout: ENV.PG_IDLE_TIMEOUT,
        maxLifetime: ENV.PG_MAX_LIFETIME,
        statementTimeout: ENV.PG_STATEMENT_TIMEOUT,
      },
    });
    return new PgStore(sql);
  }

  constructor(sql: PgSqlClient) {
    super(sql);
  }

  async getChainTipEtag(): Promise<string | undefined> {
    const result = await this.sql<{ etag: string }[]>`
      SELECT block_hash AS etag FROM ledger ORDER BY block_height DESC LIMIT 1
    `;
    return result[0]?.etag;
  }

  async getChainTipBlockHeight(): Promise<string | undefined> {
    const result = await this.sql<{ block_height: string }[]>`
      SELECT block_height FROM ledger ORDER BY block_height DESC LIMIT 1
    `;
    return result[0]?.block_height;
  }

  private async getEtchings(
    id?: Rune,
    offset: Offset = 0,
    limit: Limit = 1
  ): Promise<DbPaginatedResult<DbRuneWithChainTip>> {
    const results = await this.sql<DbCountedQueryResult<DbRuneWithChainTip>[]>`
      WITH
        rune_count AS (SELECT COALESCE(MAX(number), 0) + 1 AS total FROM runes),
        max AS (SELECT MAX(block_height) AS chain_tip FROM ledger),
        results AS (
          SELECT *
          FROM runes
          ${id ? this.sql`WHERE ${runeFilter(this.sql, id)}` : this.sql``}
          ORDER BY block_height DESC, tx_index DESC
          OFFSET ${offset} LIMIT ${limit}
        ),
        recent_supplies AS (
          SELECT DISTINCT ON (rune_id) *
          FROM supply_changes
          WHERE rune_id IN (SELECT id FROM results)
          ORDER BY rune_id, block_height DESC
        )
        SELECT r.*, s.minted, s.total_mints, s.burned, s.total_burns,
          (SELECT total FROM rune_count), (SELECT chain_tip FROM max)
        FROM results AS r
        INNER JOIN recent_supplies AS s ON r.id = s.rune_id
        ORDER BY r.block_height DESC, r.tx_index DESC
    `;
    return {
      total: results[0]?.total ?? 0,
      results,
    };
  }

  async getRuneEtching(id: Rune): Promise<DbRuneWithChainTip | undefined> {
    const result = await this.getEtchings(id);
    if (result.total == 0) return undefined;
    return result.results[0];
  }

  async getRuneEtchings(
    offset: Offset,
    limit: Limit
  ): Promise<DbPaginatedResult<DbRuneWithChainTip>> {
    return this.getEtchings(undefined, offset, limit);
  }

  private async getActivity(
    filter: PgSqlQuery,
    count: PgSqlQuery,
    offset: Offset,
    limit: Limit,
    cte?: PgSqlQuery
  ): Promise<DbPaginatedResult<DbItemWithRune<DbLedgerEntry>>> {
    const results = await this.sql<DbCountedQueryResult<DbItemWithRune<DbLedgerEntry>>[]>`
      WITH ${cte ? cte : this.sql`none AS (SELECT NULL)`},
      results AS (
        SELECT l.*, r.name, r.number, r.spaced_name, r.divisibility, ${count} AS total
        FROM ledger AS l
        INNER JOIN runes AS r ON r.id = l.rune_id
        WHERE ${filter}
      )
      SELECT * FROM results
      ORDER BY block_height DESC, tx_index DESC, event_index DESC
      OFFSET ${offset} LIMIT ${limit}
    `;
    return {
      total: results[0]?.total ?? 0,
      results,
    };
  }

  async getRuneActivity(runeId: Rune, offset: Offset, limit: Limit) {
    return this.getActivity(
      runeFilter(this.sql, runeId, 'r'),
      this.sql`COALESCE((SELECT total_operations FROM count), 0)`,
      offset,
      limit,
      this.sql`count AS (
        SELECT total_operations FROM supply_changes
        WHERE rune_id = (SELECT id FROM runes WHERE ${runeFilter(this.sql, runeId)})
        ORDER BY block_height DESC LIMIT 1
      )`
    );
  }

  async getRuneAddressActivity(runeId: Rune, address: Address, offset: Offset, limit: Limit) {
    return this.getActivity(
      this.sql`${runeFilter(this.sql, runeId, 'r')} AND address = ${address}`,
      this.sql`COUNT(*) OVER()`,
      offset,
      limit
    );
  }

  async getAddressActivity(address: Address, offset: Offset, limit: Limit) {
    return this.getActivity(
      this.sql`address = ${address}`,
      this.sql`COALESCE((SELECT total_operations FROM count), 0)`,
      offset,
      limit,
      this.sql`recent AS (
        SELECT DISTINCT ON (rune_id) total_operations
        FROM balance_changes
        WHERE address = ${address}
        ORDER BY rune_id, block_height DESC
      ),
      count AS (
        SELECT SUM(total_operations) AS total_operations FROM recent
      )`
    );
  }

  async getTransactionActivity(txId: TransactionId, offset: Offset, limit: Limit) {
    return this.getActivity(this.sql`l.tx_id = ${txId}`, this.sql`COUNT(*) OVER()`, offset, limit);
  }

  async getBlockActivity(block: Block, offset: Offset, limit: Limit, operationType?: string) {
    const filter = this.sql`${blockFilter(this.sql, block, 'l')}`;
    const operationFilter = operationType
      ? this.sql` AND operation = ${operationType}`
      : this.sql``;

    return this.getActivity(
      this.sql`${filter}${operationFilter}`,
      this.sql`COUNT(*) OVER()`,
      offset,
      limit
    );
  }

  async getRuneHolders(
    id: Rune,
    offset: Offset,
    limit: Limit
  ): Promise<DbPaginatedResult<DbItemWithRune<DbBalance>>> {
    const results = await this.sql<DbCountedQueryResult<DbItemWithRune<DbBalance>>[]>`
      WITH grouped AS (
        SELECT DISTINCT ON (b.address) b.address, b.balance, b.total_operations, b.rune_id, r.name, r.number
          r.spaced_name, r.divisibility, COUNT(*) OVER() AS total
        FROM balance_changes AS b
        INNER JOIN runes AS r ON r.id = b.rune_id
        WHERE ${runeFilter(this.sql, id, 'r')}
        ORDER BY b.address, b.block_height DESC
      )
      SELECT * FROM grouped
      ORDER BY balance DESC
      OFFSET ${offset} LIMIT ${limit}
    `;
    return {
      total: results[0]?.total ?? 0,
      results,
    };
  }

  async getRuneAddressBalance(
    id: Rune,
    address: Address
  ): Promise<DbItemWithRune<DbBalance> | undefined> {
    const results = await this.sql<DbItemWithRune<DbBalance>[]>`
      SELECT b.rune_id, b.address, b.balance, b.total_operations, r.name,
        r.number, r.spaced_name, r.divisibility, COUNT(*) OVER() AS total
      FROM balance_changes AS b
      INNER JOIN runes AS r ON r.id = b.rune_id
      WHERE ${runeFilter(this.sql, id, 'r')} AND address = ${address}
      ORDER BY b.block_height DESC
      LIMIT 1
    `;
    return results[0];
  }

  async getAddressBalances(
    address: Address,
    offset: Offset,
    limit: Limit
  ): Promise<DbPaginatedResult<DbItemWithRune<DbBalance>>> {
    const results = await this.sql<DbCountedQueryResult<DbItemWithRune<DbBalance>>[]>`
      WITH grouped AS (
        SELECT DISTINCT ON (b.rune_id) b.address, b.balance, b.total_operations, b.rune_id, r.name,
          r.number, r.spaced_name, r.divisibility, COUNT(*) OVER() AS total
        FROM balance_changes AS b
        INNER JOIN runes AS r ON r.id = b.rune_id
        WHERE address = ${address}
        ORDER BY b.rune_id, b.block_height DESC
      )
      SELECT * FROM grouped
      ORDER BY balance DESC
      OFFSET ${offset} LIMIT ${limit}
    `;
    return {
      total: results[0]?.total ?? 0,
      results,
    };
  }
}
