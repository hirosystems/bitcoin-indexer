import { buildApiServer } from '../../src/api/init';
import { Brc20PgStore } from '../../src/pg/brc20/brc20-pg-store';
import { PgStore } from '../../src/pg/pg-store';
import {
  TestFastifyServer,
  ORDINALS_MIGRATIONS_DIR,
  BRC20_MIGRATIONS_DIR,
  clearDb,
  runMigrations,
  insertTestCountsByBlock,
} from '../helpers';

describe('/stats', () => {
  let db: PgStore;
  let brc20Db: Brc20PgStore;
  let fastify: TestFastifyServer;

  beforeEach(async () => {
    db = await PgStore.connect();
    await runMigrations(db.sql, ORDINALS_MIGRATIONS_DIR);
    brc20Db = await Brc20PgStore.connect();
    await runMigrations(brc20Db.sql, BRC20_MIGRATIONS_DIR);
    fastify = await buildApiServer({ db, brc20Db });
  });

  afterEach(async () => {
    await fastify.close();
    await clearDb(db.sql);
    await db.close();
    await clearDb(brc20Db.sql);
    await brc20Db.close();
  });

  describe('/stats/inscriptions', () => {
    const bh = '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d';
    const ts = 1676913207000;

    describe('event processing', () => {
      const EXPECTED = {
        results: [
          {
            block_hash: bh,
            block_height: '778010',
            inscription_count: '3',
            inscription_count_accum: '9',
            timestamp: ts,
          },
          {
            block_hash: bh,
            block_height: '778005',
            inscription_count: '2',
            inscription_count_accum: '6',
            timestamp: ts,
          },
          {
            block_hash: bh,
            block_height: '778002',
            inscription_count: '1',
            inscription_count_accum: '4',
            timestamp: ts,
          },
          {
            block_hash: bh,
            block_height: '778001',
            inscription_count: '1',
            inscription_count_accum: '3',
            timestamp: ts,
          },
          {
            block_hash: bh,
            block_height: '778000',
            inscription_count: '2',
            inscription_count_accum: '2',
            timestamp: ts,
          },
        ],
      };

      test('returns stats when processing blocks in order', async () => {
        await insertTestCountsByBlock(db.sql, {
          block_height: '778000',
          block_hash: bh,
          inscription_count: 2,
          inscription_count_accum: 2,
          timestamp: ts,
        });
        await insertTestCountsByBlock(db.sql, {
          block_height: '778001',
          block_hash: bh,
          inscription_count: 1,
          inscription_count_accum: 3,
          timestamp: ts,
        });
        await insertTestCountsByBlock(db.sql, {
          block_height: '778002',
          block_hash: bh,
          inscription_count: 1,
          inscription_count_accum: 4,
          timestamp: ts,
        });
        await insertTestCountsByBlock(db.sql, {
          block_height: '778005',
          block_hash: bh,
          inscription_count: 2,
          inscription_count_accum: 6,
          timestamp: ts,
        });
        await insertTestCountsByBlock(db.sql, {
          block_height: '778010',
          block_hash: bh,
          inscription_count: 3,
          inscription_count_accum: 9,
          timestamp: ts,
        });

        const response = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/stats/inscriptions',
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toStrictEqual(EXPECTED);
      });
    });

    test('range filters', async () => {
      await insertTestCountsByBlock(db.sql, {
        block_height: '778000',
        block_hash: bh,
        inscription_count: 1,
        inscription_count_accum: 1,
        timestamp: ts,
      });
      await insertTestCountsByBlock(db.sql, {
        block_height: '778001',
        block_hash: bh,
        inscription_count: 1,
        inscription_count_accum: 2,
        timestamp: ts,
      });
      await insertTestCountsByBlock(db.sql, {
        block_height: '778002',
        block_hash: bh,
        inscription_count: 1,
        inscription_count_accum: 3,
        timestamp: ts,
      });
      await insertTestCountsByBlock(db.sql, {
        block_height: '778005',
        block_hash: bh,
        inscription_count: 2,
        inscription_count_accum: 5,
        timestamp: ts,
      });
      await insertTestCountsByBlock(db.sql, {
        block_height: '778010',
        block_hash: bh,
        inscription_count: 1,
        inscription_count_accum: 6,
        timestamp: ts,
      });

      const responseFrom = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/stats/inscriptions',
        query: { from_block_height: '778004' },
      });
      expect(responseFrom.statusCode).toBe(200);
      expect(responseFrom.json()).toStrictEqual({
        results: [
          {
            block_height: '778010',
            block_hash: bh,
            inscription_count: '1',
            inscription_count_accum: '6',
            timestamp: ts,
          },
          {
            block_height: '778005',
            block_hash: bh,
            inscription_count: '2',
            inscription_count_accum: '5',
            timestamp: ts,
          },
        ],
      });

      const responseTo = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/stats/inscriptions',
        query: { to_block_height: '778004' },
      });
      expect(responseTo.statusCode).toBe(200);
      expect(responseTo.json()).toStrictEqual({
        results: [
          {
            block_height: '778002',
            block_hash: bh,
            inscription_count: '1',
            inscription_count_accum: '3',
            timestamp: ts,
          },
          {
            block_height: '778001',
            block_hash: bh,
            inscription_count: '1',
            inscription_count_accum: '2',
            timestamp: ts,
          },
          {
            block_height: '778000',
            block_hash: bh,
            inscription_count: '1',
            inscription_count_accum: '1',
            timestamp: ts,
          },
        ],
      });

      const responseFromTo = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/stats/inscriptions',
        query: {
          from_block_height: '778002',
          to_block_height: '778005',
        },
      });
      expect(responseFromTo.statusCode).toBe(200);
      expect(responseFromTo.json()).toStrictEqual({
        results: [
          {
            block_height: '778005',
            block_hash: bh,
            inscription_count: '2',
            inscription_count_accum: '5',
            timestamp: ts,
          },
          {
            block_height: '778002',
            block_hash: bh,
            inscription_count: '1',
            inscription_count_accum: '3',
            timestamp: ts,
          },
        ],
      });
    });
  });
});
