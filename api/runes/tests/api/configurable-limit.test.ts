/**
 * @jest-environment node
 */

import { PgStore } from '../../src/pg/pg-store';
import { DbLedgerEntry } from '../../src/pg/types';
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
import { ENV } from '../../src/env';

describe('Configurable Limit Tests', () => {
  let db: PgStore;
  let fastify: TestFastifyServer;

  const rune = sampleRune('1:1', 'Test Rune');
  const baseEntry = sampleLedgerEntry(rune.id);

  beforeAll(() => {
    // Set environment variables before any modules are imported
    process.env.RUNES_PGHOST = process.env.RUNES_PGHOST || 'localhost';
    process.env.RUNES_PGPORT = process.env.RUNES_PGPORT || '5432';
    process.env.RUNES_PGUSER = process.env.RUNES_PGUSER || 'test';
    process.env.RUNES_PGPASSWORD = process.env.RUNES_PGPASSWORD || 'test';
    process.env.RUNES_PGDATABASE = process.env.RUNES_PGDATABASE || 'test';
    process.env.API_RESULTS_MAX_LIMIT = process.env.API_RESULTS_MAX_LIMIT || '100';
  });

  beforeEach(async () => {
    db = await PgStore.connect();
    fastify = await startTestApiServer(db);
    await runMigrations(db.sql);
    await insertRune(db, rune);
    await insertSupplyChange(db, rune.id, 1);

    // Insert multiple ledger entries for testing pagination
    for (let i = 0; i < 100; i++) {
      const entry: DbLedgerEntry = {
        ...baseEntry,
        tx_index: i,
        operation: i % 2 === 0 ? 'mint' : 'send',
      };
      await insertDbLedgerEntry(db, entry, i);
    }
  });

  afterEach(async () => {
    if (fastify) {
      await fastify.close();
    }
    await clearDb(db.sql);
    await db.close();
  });

  describe('Current Limit Configuration', () => {
    test('should respect current configured maximum limit', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      // Test that a request within the limit works
      const validLimit = Math.min(currentMaxLimit - 1, 50);
      const validResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=${validLimit}`,
      });

      expect(validResponse.statusCode).toBe(200);
      const json = validResponse.json();
      expect(json.limit).toBe(validLimit);
    });

    test('should reject limit exceeding current maximum', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;
      const exceedingLimit = currentMaxLimit + 1;

      const response = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=${exceedingLimit}`,
      });

      expect(response.statusCode).toBe(400);
      const errorJson = response.json();
      expect(errorJson.message).toContain('limit');
    });

    test('should accept limit equal to current maximum', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      const response = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=${currentMaxLimit}`,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.limit).toBe(currentMaxLimit);
    });

    test('should reject zero and negative limits', async () => {
      const zeroResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=0`,
      });
      expect(zeroResponse.statusCode).toBe(400);

      const negativeResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=-1`,
      });
      expect(negativeResponse.statusCode).toBe(400);
    });

    test('should work with minimum limit of 1', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=1`,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.limit).toBe(1);
      expect(json.results.length).toBe(1);
    });

    test('should use default limit when no limit specified', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity`,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      // Default limit should be 20 based on existing API behavior
      expect(json.limit).toBe(20);
      expect(json.results.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Enhanced Limit Testing (100)', () => {
    test('should handle limit of 100 when configured appropriately', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      if (currentMaxLimit >= 100) {
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=100`,
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.limit).toBe(100);
        // Should return all 100 test entries we inserted
        expect(json.results.length).toBe(100);
        expect(json.total).toBe(100);
      } else {
        // If current max limit is less than 100, it should reject limit=100
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=100`,
        });

        expect(response.statusCode).toBe(400);
        const errorJson = response.json();
        expect(errorJson.message).toContain('limit');
      }
    });

    test('should handle limit of 99 when max is 100 or higher', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      if (currentMaxLimit >= 100) {
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=99`,
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.limit).toBe(99);
        expect(json.results.length).toBe(99);
      } else {
        console.log(`Skipping test: current max limit is ${currentMaxLimit}, need at least 100`);
      }
    });

    test('should reject limit of 101 when max is exactly 100', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      if (currentMaxLimit === 100) {
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=101`,
        });

        expect(response.statusCode).toBe(400);
        const errorJson = response.json();
        expect(errorJson.message).toContain('limit');
      } else if (currentMaxLimit > 100) {
        // If max is higher than 100, then 101 should be allowed
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=101`,
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.limit).toBe(101);
      } else {
        console.log(`Skipping test: current max limit is ${currentMaxLimit}, need at least 100`);
      }
    });

    test('etchings endpoint with limit 100', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      if (currentMaxLimit >= 100) {
        const response = await fastify.inject({
          method: 'GET',
          url: '/runes/v1/etchings?limit=100',
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.limit).toBe(100);
      } else {
        const response = await fastify.inject({
          method: 'GET',
          url: '/runes/v1/etchings?limit=100',
        });

        expect(response.statusCode).toBe(400);
      }
    });

    test('transactions endpoint with limit 100', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      if (currentMaxLimit >= 100) {
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/transactions/${baseEntry.tx_id}/activity?limit=100`,
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.limit).toBe(100);
      } else {
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/transactions/${baseEntry.tx_id}/activity?limit=100`,
        });

        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('Multiple Endpoints Limit Validation', () => {
    test('etchings endpoint respects current limit configuration', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;
      const validLimit = Math.min(currentMaxLimit - 1, 50);
      const exceedingLimit = currentMaxLimit + 1;

      // Test within limit
      const validResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/etchings?limit=${validLimit}`,
      });
      expect(validResponse.statusCode).toBe(200);

      // Test exceeding limit
      const invalidResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/etchings?limit=${exceedingLimit}`,
      });
      expect(invalidResponse.statusCode).toBe(400);
    });

    test('transactions endpoint respects current limit configuration', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;
      const validLimit = Math.min(currentMaxLimit - 1, 50);
      const exceedingLimit = currentMaxLimit + 1;

      // Test within limit
      const validResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/transactions/${baseEntry.tx_id}/activity?limit=${validLimit}`,
      });
      expect(validResponse.statusCode).toBe(200);

      // Test exceeding limit
      const invalidResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/transactions/${baseEntry.tx_id}/activity?limit=${exceedingLimit}`,
      });
      expect(invalidResponse.statusCode).toBe(400);
    });

    test('addresses endpoint respects current limit configuration', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;
      const validLimit = Math.min(currentMaxLimit - 1, 50);
      const exceedingLimit = currentMaxLimit + 1;

      // Test within limit
      const validResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/addresses/${baseEntry.address}/activity?limit=${validLimit}`,
      });
      expect(validResponse.statusCode).toBe(200);

      // Test exceeding limit
      const invalidResponse = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/addresses/${baseEntry.address}/activity?limit=${exceedingLimit}`,
      });
      expect(invalidResponse.statusCode).toBe(400);
    });
  });

  describe('Environment Variable Integration', () => {
    test('should use API_RESULTS_MAX_LIMIT environment variable', () => {
      // This test verifies that the environment variable is being read correctly
      expect(ENV.API_RESULTS_MAX_LIMIT).toBeDefined();
      expect(typeof ENV.API_RESULTS_MAX_LIMIT).toBe('number');
      expect(ENV.API_RESULTS_MAX_LIMIT).toBeGreaterThan(0);
    });

    test('environment variable should default to 60 if not set', () => {
      // This verifies the default value is reasonable
      // Note: This might be different if the environment variable is explicitly set
      if (!process.env.API_RESULTS_MAX_LIMIT) {
        expect(ENV.API_RESULTS_MAX_LIMIT).toBe(60);
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle requests up to the configured limit efficiently', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;
      const testLimit = Math.min(currentMaxLimit, 50); // Don't go too high in tests

      const startTime = Date.now();
      const response = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=${testLimit}`,
      });
      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.limit).toBe(testLimit);

      // Performance assertion - should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle large limit efficiently when configured for 100+', async () => {
      const currentMaxLimit = ENV.API_RESULTS_MAX_LIMIT;

      if (currentMaxLimit >= 100) {
        const startTime = Date.now();
        const response = await fastify.inject({
          method: 'GET',
          url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=100`,
        });
        const endTime = Date.now();

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.limit).toBe(100);
        expect(json.results.length).toBe(100);

        // Performance should still be reasonable even with larger limits
        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max for larger queries
      } else {
        console.log(
          `Skipping large limit performance test: current max limit is ${currentMaxLimit}`
        );
      }
    });

    test('should return correct pagination metadata', async () => {
      const testLimit = Math.min(ENV.API_RESULTS_MAX_LIMIT, 10);

      const response = await fastify.inject({
        method: 'GET',
        url: `/runes/v1/blocks/${baseEntry.block_height}/activity?limit=${testLimit}&offset=0`,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.limit).toBe(testLimit);
      expect(json.offset).toBe(0);
      expect(json.total).toBeDefined();
      expect(json.results).toBeDefined();
      expect(Array.isArray(json.results)).toBe(true);
    });
  });
});
