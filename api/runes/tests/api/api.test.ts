import { ENV } from '../../src/env';
import { PgStore } from '../../src/pg/pg-store';
import {
  insertDbLedgerEntry,
  insertRune,
  sampleRune,
  runMigrations,
  startTestApiServer,
  TestFastifyServer,
  insertSupplyChange,
  sampleLedgerEntry,
  clearDb,
} from '../helpers';

describe('Endpoints', () => {
  let db: PgStore;
  let fastify: TestFastifyServer;

  const rune = sampleRune('1:1', 'Sample Rune');
  const ledgerEntry = sampleLedgerEntry(rune.id);

  beforeEach(async () => {
    db = await PgStore.connect();
    fastify = await startTestApiServer(db);
    await runMigrations(db.sql);
    await insertRune(db, rune);
    const event_index = 0;
    await insertDbLedgerEntry(db, ledgerEntry, event_index);
    await insertSupplyChange(db, rune.id, 1);
  });

  afterEach(async () => {
    if (fastify) {
      await fastify.close();
    }

    await clearDb(db.sql);
    await db.close();
  });

  describe('Etchings', () => {
    test('lists runes', async () => {
      const expected = {
        divisibility: 0,
        id: '1:1',
        location: {
          block_hash: '0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5',
          block_height: 840000,
          timestamp: 0,
          tx_id: '2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e',
          tx_index: 1,
        },
        mint_terms: {
          amount: '100',
          cap: '5000000',
          height_end: null,
          height_start: null,
          offset_end: null,
          offset_start: null,
        },
        name: 'Sample Rune',
        number: 1,
        spaced_name: 'Sample•Rune',
        supply: {
          burned: '0',
          current: '0',
          mint_percentage: '0.0000',
          mintable: false,
          minted: '0',
          premine: '0',
          total_burns: '0',
          total_mints: '0',
        },
        symbol: 'ᚠ',
        turbo: false,
      };
      const runesResponse = await fastify.inject({
        method: 'GET',
        url: '/runes/v1/etchings',
      });
      expect(runesResponse.statusCode).toBe(200);
      expect(runesResponse.json().results).not.toHaveLength(0);

      const response = await fastify.inject({
        method: 'GET',
        url: '/runes/v1/etchings/' + ledgerEntry.rune_id,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual(expected);
    });

    test('can fetch by spaced name', async () => {
      const url = '/runes/v1/etchings/' + rune.spaced_name;
      const response = await fastify.inject({
        method: 'GET',
        url: url,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().spaced_name).toEqual(rune.spaced_name);
    });

    test('can not fetch by spaced name if lacking bullets', async () => {
      const url = '/runes/v1/etchings/' + rune.spaced_name.replaceAll('•', '-');
      const response = await fastify.inject({
        method: 'GET',
        url: url,
      });
      expect(response.statusCode).toBe(400);
    });
  });
  describe('Transactions', () => {
    test('shows details', async () => {
      const expected = {
        limit: 20,
        offset: 0,
        results: [
          {
            address: '0',
            amount: '0',
            location: {
              block_hash: '0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5',
              block_height: 840000,
              output: '2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e:0',
              timestamp: 0,
              tx_id: '2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e',
              tx_index: 0,
              vout: 0,
            },
            operation: 'etching',
            receiver_address: '0',
            rune: {
              id: '1:1',
              name: 'Sample Rune',
              number: 1,
              spaced_name: 'Sample•Rune',
            },
          },
        ],
        total: 1,
      };
      const txid = ledgerEntry.tx_id;
      const response = await fastify.inject({
        method: 'GET',
        url: '/runes/v1/transactions/' + txid + '/activity',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual(expected);
    });
  });
});
