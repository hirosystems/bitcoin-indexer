import { buildApiServer } from '../../src/api/init';
import {
  Brc20TokenResponse,
  Brc20ActivityResponse,
  Brc20TransferableInscriptionsResponse,
} from '../../src/api/schemas';
import { Brc20PgStore } from '../../src/pg/brc20/brc20-pg-store';
import { PgStore } from '../../src/pg/pg-store';
import {
  TestFastifyServer,
  ORDINALS_MIGRATIONS_DIR,
  BRC20_MIGRATIONS_DIR,
  clearDb,
  incrementing,
  randomHash,
  runMigrations,
  brc20TokenDeploy,
  brc20Operation,
} from '../helpers';

describe('BRC-20 API', () => {
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

  describe('/brc-20/tokens', () => {
    test('tokens endpoint', async () => {
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        to_address: null,
        amount: '0',
      });
      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/tokens/pepe`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual({
        token: {
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          number: 0,
          block_height: 767430,
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          ticker: 'pepe',
          max_supply: '21000000.000000000000000000',
          mint_limit: '21000000.000000000000000000',
          decimals: 18,
          deploy_timestamp: 1677803510000,
          minted_supply: '0.000000000000000000',
          tx_count: 1,
          self_mint: false,
        },
        supply: {
          max_supply: '21000000.000000000000000000',
          minted_supply: '0.000000000000000000',
          holders: 0,
        },
      });
    });

    test('tokens filter by ticker prefix', async () => {
      let transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'peer',
        display_ticker: 'peer',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'abcd',
        display_ticker: 'abcd',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'dcba',
        display_ticker: 'dcba',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });
      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/tokens?ticker=PE&ticker=AB`,
      });
      expect(response.statusCode).toBe(200);
      const responseJson = response.json();
      expect(responseJson.total).toBe(3);
      expect(responseJson.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ticker: 'pepe' }),
          expect.objectContaining({ ticker: 'peer' }),
          expect.objectContaining({ ticker: 'abcd' }),
        ])
      );
    });

    test('tokens using order_by tx_count', async () => {
      let transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 10,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'peer',
        display_ticker: 'peer',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 8,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'abcd',
        display_ticker: 'abcd',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      transferHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'dcba',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: '0',
        block_height: '767430',
        block_hash: '00000000000000000000a8c86d8777fd891d07308b13cf03680300636ab10fa6',
        tx_id: transferHash,
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 6,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });
      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/tokens?order_by=tx_count`,
      });
      expect(response.statusCode).toBe(200);
      const responseJson = response.json();
      expect(responseJson.total).toBe(4);
      expect(responseJson.results[0].ticker).toBe('pepe');
      expect(responseJson.results[1].ticker).toBe('peer');
      expect(responseJson.results[2].ticker).toBe('dcba');
      expect(responseJson.results[3].ticker).toBe('abcd');
    });
  });

  describe('/brc-20/activity', () => {
    test('activity for token transfers', async () => {
      // Setup
      const blockHeights = incrementing(767430);
      const numbers = incrementing(0);
      const addressA = 'bc1q6uwuet65rm6xvlz7ztw2gvdmmay5uaycu03mqz';
      const addressB = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

      // A deploys pepe
      let transferHash = randomHash();
      let blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      // Verify that the pepe deploy is in the activity feed
      let response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      let json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'pepe',
            address: addressA,
            deploy: expect.objectContaining({
              max_supply: '21000000.000000000000000000',
            }),
          } as Brc20ActivityResponse),
        ])
      );

      // A mints 10000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '10000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'pepe',
          } as Brc20ActivityResponse),
          expect.objectContaining({
            operation: 'mint',
            ticker: 'pepe',
            address: addressA,
            mint: {
              amount: '10000.000000000000000000',
            },
          } as Brc20ActivityResponse),
        ])
      );

      // B mints 10000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '10000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(3);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'mint',
            ticker: 'pepe',
            address: addressB,
            mint: {
              amount: '10000.000000000000000000',
            },
          } as Brc20ActivityResponse),
        ])
      );

      // A creates transfer of 9000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '9000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(4);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer',
            ticker: 'pepe',
            address: addressA,
            tx_id: transferHash,
            transfer: {
              amount: '9000.000000000000000000',
              from_address: addressA,
            },
          } as Brc20ActivityResponse),
        ])
      );

      // A sends transfer inscription to B (aka transfer/sale)
      transferHash = randomHash();
      blockHash = randomHash();
      const blockHeight = blockHeights.next().value.toString();
      const number = numbers.next().value.toString();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_send',
        inscription_id: `${transferHash}i0`,
        inscription_number: number,
        ordinal_number: '200000',
        block_height: blockHeight,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: addressB,
        amount: '9000000000000000000000',
      });
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_receive',
        inscription_id: `${transferHash}i0`,
        inscription_number: number,
        ordinal_number: '200000',
        block_height: blockHeight,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '9000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(5);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressB,
            transfer_send: {
              amount: '9000.000000000000000000',
              from_address: addressA,
              to_address: addressB,
            },
          } as Brc20ActivityResponse),
        ])
      );

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&operation=transfer_send`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressB,
            transfer_send: {
              amount: '9000.000000000000000000',
              from_address: addressA,
              to_address: addressB,
            },
          } as Brc20ActivityResponse),
        ])
      );
    });

    test('activity for multiple token transfers among three participants', async () => {
      // Step 1: A deploys a token
      // Step 2: A mints 1000 of the token
      // Step 3: B mints 2000 of the token
      // Step 4: A creates a transfer to B
      // Step 5: B creates a transfer to C
      // Step 6: A transfer_send the transfer to B
      // Step 7: B transfer_send the transfer to C

      // Setup
      const inscriptionNumbers = incrementing(0);
      const blockHeights = incrementing(767430);
      const addressA = 'bc1q6uwuet65rm6xvlz7ztw2gvdmmay5uaycu03mqz';
      const addressB = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
      const addressC = 'bc1q9d80h0q5d3f54w7w8c3l2sguf9uset4ydw9xj2';

      // Step 1: A deploys a token
      let number = inscriptionNumbers.next().value;
      let transferHash = randomHash();
      let blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      // Verify that the pepe deploy is in the activity feed
      let response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      let json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'pepe',
            address: addressA,
            deploy: expect.objectContaining({
              max_supply: '21000000.000000000000000000',
            }),
          } as Brc20ActivityResponse),
        ])
      );

      // Step 2: A mints 1000 of the token
      number = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '1000000000000000000000',
      });

      // Verify that the pepe mint is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'mint',
            ticker: 'pepe',
            address: addressA,
            mint: {
              amount: '1000.000000000000000000',
            },
          } as Brc20ActivityResponse),
        ])
      );
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&address=${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'pepe',
            address: addressA,
            deploy: expect.objectContaining({
              max_supply: '21000000.000000000000000000',
            }),
          } as Brc20ActivityResponse),
          expect.objectContaining({
            operation: 'mint',
            ticker: 'pepe',
            address: addressA,
            mint: {
              amount: '1000.000000000000000000',
            },
          } as Brc20ActivityResponse),
        ])
      );

      // Step 3: B mints 2000 of the token
      number = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '2000000000000000000000',
      });

      // Verify that the pepe mint is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(3);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'mint',
            ticker: 'pepe',
            address: addressB,
            mint: {
              amount: '2000.000000000000000000',
            },
          } as Brc20ActivityResponse),
        ])
      );

      // Step 4: A creates a transfer to B
      const numberAB = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer',
        inscription_id: `${transferHash}i0`,
        inscription_number: numberAB.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '1000000000000000000000',
      });

      // Verify that the pepe transfer is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(4);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer',
            ticker: 'pepe',
            address: addressA,
            tx_id: transferHash,
            transfer: {
              amount: '1000.000000000000000000',
              from_address: addressA,
            },
          } as Brc20ActivityResponse),
        ])
      );
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&address=${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(3);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer',
            ticker: 'pepe',
            address: addressA,
            tx_id: transferHash,
            transfer: {
              amount: '1000.000000000000000000',
              from_address: addressA,
            },
          } as Brc20ActivityResponse),
        ])
      );

      // Step 5: B creates a transfer to C
      const numberBC = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer',
        inscription_id: `${transferHash}i0`,
        inscription_number: numberBC.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '2000000000000000000000',
      });

      // Verify that the pepe transfer is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(5);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer',
            ticker: 'pepe',
            address: addressB,
            tx_id: transferHash,
            transfer: {
              amount: '2000.000000000000000000',
              from_address: addressB,
            },
          } as Brc20ActivityResponse),
        ])
      );

      // Step 6: A transfer_send the transfer to B
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_send',
        inscription_id: `${transferHash}i0`,
        inscription_number: numberAB.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: addressB,
        amount: '1000000000000000000000',
      });
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_receive',
        inscription_id: `${transferHash}i0`,
        inscription_number: numberAB.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '1000000000000000000000',
      });
      // A gets the transfer send in its feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&address=${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(4);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressB,
            transfer_send: {
              amount: '1000.000000000000000000',
              from_address: addressA,
              to_address: addressB,
            },
          } as Brc20ActivityResponse),
        ])
      );
      // B gets the transfer send in its feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&address=${addressB}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(3);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressB,
            transfer_send: {
              amount: '1000.000000000000000000',
              from_address: addressA,
              to_address: addressB,
            },
          } as Brc20ActivityResponse),
        ])
      );

      // Verify that the pepe transfer_send is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(6);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressB,
            transfer_send: {
              amount: '1000.000000000000000000',
              from_address: addressA,
              to_address: addressB,
            },
          } as Brc20ActivityResponse),
        ])
      );

      // Step 7: B transfer_send the transfer to C
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_send',
        inscription_id: `${transferHash}i0`,
        inscription_number: numberBC.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: addressC,
        amount: '2000000000000000000000',
      });
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_receive',
        inscription_id: `${transferHash}i0`,
        inscription_number: numberBC.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressC,
        to_address: null,
        amount: '2000000000000000000000',
      });

      // Verify that the pepe transfer_send is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(7);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressC,
            transfer_send: {
              amount: '2000.000000000000000000',
              from_address: addressB,
              to_address: addressC,
            },
          } as Brc20ActivityResponse),
        ])
      );
      // B gets the transfer send in its feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&address=${addressB}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(4);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressC,
            transfer_send: {
              amount: '2000.000000000000000000',
              from_address: addressB,
              to_address: addressC,
            },
          } as Brc20ActivityResponse),
        ])
      );
      // C gets the transfer send in its feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=pepe&address=${addressC}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'transfer_send',
            ticker: 'pepe',
            tx_id: transferHash,
            address: addressC,
            transfer_send: {
              amount: '2000.000000000000000000',
              from_address: addressB,
              to_address: addressC,
            },
          } as Brc20ActivityResponse),
        ])
      );
    });

    test('activity for multiple token creation', async () => {
      const inscriptionNumbers = incrementing(0);
      const blockHeights = incrementing(767430);
      const addressA = 'bc1q6uwuet65rm6xvlz7ztw2gvdmmay5uaycu03mqz';

      // Step 1: Create a token pepe
      let number = inscriptionNumbers.next().value;
      let transferHash = randomHash();
      let blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      // Verify that the pepe deploy is in the activity feed
      let response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity`,
      });
      expect(response.statusCode).toBe(200);
      let json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'pepe',
            address: addressA,
            deploy: expect.objectContaining({
              max_supply: '21000000.000000000000000000',
            }),
          } as Brc20ActivityResponse),
        ])
      );

      // Step 2: Create a token peer
      number = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'peer',
        display_ticker: 'peer',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      // Verify that the peer deploy is in the activity feed
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'peer',
            address: addressA,
            deploy: expect.objectContaining({
              max_supply: '21000000.000000000000000000',
            }),
          } as Brc20ActivityResponse),
        ])
      );

      // Verify that no events are available before the first block height
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?ticker=peer&block_height=${767430}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(0);
      expect(json.results).toEqual([]);

      // Verify that the peer deploy is not in the activity feed when using block_height parameter
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/activity?block_height=${767430}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operation: 'deploy',
            ticker: 'pepe',
            address: addressA,
            deploy: expect.objectContaining({
              max_supply: '21000000.000000000000000000',
            }),
          } as Brc20ActivityResponse),
        ])
      );
      // Should NOT include peer at this block height
      expect(json.results).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ticker: 'peer',
          } as Brc20ActivityResponse),
        ])
      );
    });
  });

  describe('/brc-20/token/holders', () => {
    test('displays holders for token', async () => {
      const inscriptionNumbers = incrementing(0);
      const blockHeights = incrementing(767430);
      const addressA = 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td';
      const addressB = 'bc1qp9jgp9qtlhgvwjnxclj6kav6nr2fq09c206pyl';

      let number = inscriptionNumbers.next().value;
      let transferHash = randomHash();
      let blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      number = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '10000000000000000000000',
      });

      number = inscriptionNumbers.next().value;
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '2000000000000000000000',
      });

      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/tokens/pepe/holders`,
      });
      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toStrictEqual([
        {
          address: addressA,
          overall_balance: '10000.000000000000000000',
        },
        {
          address: addressB,
          overall_balance: '2000.000000000000000000',
        },
      ]);
    });

    test('shows empty list on token with no holders', async () => {
      const inscriptionNumbers = incrementing(0);
      const blockHeights = incrementing(767430);
      const addressA = 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td';

      const number = inscriptionNumbers.next().value;
      const transferHash = randomHash();
      const blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: number.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });
      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/tokens/pepe/holders`,
      });
      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.total).toBe(0);
      expect(json.results).toStrictEqual([]);
    });

    test('shows 404 on token not found', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/tokens/pepe/holders`,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('/brc-20/balances', () => {
    test('address balance history is accurate', async () => {
      // Setup
      const numbers = incrementing(0);
      const addressA = 'bc1q6uwuet65rm6xvlz7ztw2gvdmmay5uaycu03mqz';
      const addressB = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

      // A deploys pepe
      let transferHash = randomHash();
      let blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        block_height: '780000',
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });
      // A mints 10000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: '780050',
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '10000000000000000000000',
      });
      // A mints 10000 pepe again
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: '780060',
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '10000000000000000000000',
      });
      // B mints 10000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: '780070',
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '10000000000000000000000',
      });

      // A deploys test
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'test',
        display_ticker: 'test',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        block_height: '780100',
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });
      // A mints 10000 test
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'test',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: '780200',
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '10000000000000000000000',
      });

      // Verify balance history across block intervals
      let response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/balances/${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      let json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          {
            available_balance: '20000.000000000000000000',
            overall_balance: '20000.000000000000000000',
            ticker: 'pepe',
            transferrable_balance: '0.000000000000000000',
          },
          {
            available_balance: '10000.000000000000000000',
            overall_balance: '10000.000000000000000000',
            ticker: 'test',
            transferrable_balance: '0.000000000000000000',
          },
        ])
      );
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/balances/${addressA}?block_height=780200`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          {
            available_balance: '20000.000000000000000000',
            overall_balance: '20000.000000000000000000',
            ticker: 'pepe',
            transferrable_balance: '0.000000000000000000',
          },
          {
            available_balance: '10000.000000000000000000',
            overall_balance: '10000.000000000000000000',
            ticker: 'test',
            transferrable_balance: '0.000000000000000000',
          },
        ])
      );
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/balances/${addressA}?block_height=780200&ticker=te`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          {
            available_balance: '10000.000000000000000000',
            overall_balance: '10000.000000000000000000',
            ticker: 'test',
            transferrable_balance: '0.000000000000000000',
          },
        ])
      );
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/balances/${addressA}?block_height=780050`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          {
            available_balance: '10000.000000000000000000',
            overall_balance: '10000.000000000000000000',
            ticker: 'pepe',
            transferrable_balance: '0.000000000000000000',
          },
        ])
      );
    });
  });

  describe('/brc-20/transferable-inscriptions/:address', () => {
    test('returns 202 if address has no transferable inscriptions', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td`,
      });
      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.total).toBe(0);
      expect(json.results).toEqual([]);
    });

    test('transferable inscriptions are accurate', async () => {
      // This test verifies that the transferable inscriptions API correctly tracks BRC-20 tokens
      // that are available for transfer by an address. The test follows this flow:
      // 1. Address A deploys two tokens: 'pepe' and 'meme'
      // 2. Address A mints 10000 'pepe' and 20000 'meme'
      // 3. Address B mints 10000 'pepe'
      // 4. Address A creates a transfer inscription for 9000 'pepe'
      // 5. Verify that A's transferable inscriptions include this 'pepe' transfer
      // 6. A sends the 'pepe' transfer inscription to B
      // 7. Verify that A no longer has any transferable inscriptions
      // 8. A creates transfer inscriptions for 500 'pepe' and 2000 'meme'
      // 9. Verify that A has both transferable inscriptions
      // 11. Verify that A only has the 'meme' transferable inscription if querying for 'meme' ticker
      // 12. Verify that A only has the 'pepe' transferable inscription if querying for 'pepe' ticker
      // 13. Verify that A only has no transferable inscription if querying for 'rere' ticker
      // 14. A sends the 500 'pepe' transfer to B
      // 15. Verify that A only has the 'meme' transferable inscription left
      // 16. A sends the 2000 'meme' transfer to B
      // 17. Verify that A has no transferable inscriptions left

      // Setup
      const blockHeights = incrementing(767430);
      const numbers = incrementing(0);
      const addressA = 'bc1q6uwuet65rm6xvlz7ztw2gvdmmay5uaycu03mqz';
      const addressB = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

      // A deploys pepe
      let transferHash = randomHash();
      let blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'pepe',
        display_ticker: 'pepe',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '20000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      // A deploys meme
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20TokenDeploy(brc20Db.sql, {
        ticker: 'meme',
        display_ticker: 'meme',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        address: addressA,
        max: '21000000000000000000000000',
        limit: '21000000000000000000000000',
        decimals: 18,
        self_mint: false,
        minted_supply: '0',
        tx_count: 1,
        timestamp: 1677803510,
        operation: 'deploy',
        ordinal_number: '30000',
        output: `${transferHash}:0`,
        offset: '0',
        to_address: null,
        amount: '0',
      });

      // A mints 10000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '10000000000000000000000',
      });

      // A mints 20000 meme
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'meme',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '300000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '20000000000000000000000',
      });

      // B mints 10000 pepe
      transferHash = randomHash();
      blockHash = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'mint',
        inscription_id: `${transferHash}i0`,
        inscription_number: numbers.next().value.toString(),
        ordinal_number: '200000',
        block_height: blockHeights.next().value.toString(),
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '10000000000000000000000',
      });

      // A creates transfer of 9000 pepe
      blockHash = randomHash();
      const inscriptionNumberMocked = numbers.next().value.toString();
      const blockHeightMocked = blockHeights.next().value.toString();
      const transferHashMocked = randomHash();
      transferHash = transferHashMocked;
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer',
        inscription_id: `${transferHashMocked}i0`,
        inscription_number: inscriptionNumberMocked,
        ordinal_number: '200000',
        block_height: blockHeightMocked,
        block_hash: blockHash,
        tx_id: transferHashMocked,
        tx_index: 0,
        output: `${transferHashMocked}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '9000000000000000000000',
      });

      let response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}`,
      });

      expect(response.statusCode).toBe(200);
      let json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            inscription_id: `${transferHash}i0`,
            ticker: 'pepe',
            inscription_number: parseInt(inscriptionNumberMocked),
            block_height: parseInt(blockHeightMocked),
            amount: '9000000000000000000000',
          } as Brc20TransferableInscriptionsResponse),
        ])
      );

      // A sends transfer inscription to B (aka transfer/sale)
      transferHash = randomHash();
      blockHash = randomHash();
      const blockHeightMockedSend = blockHeights.next().value.toString();
      const inscriptionNumberMockedSend = numbers.next().value.toString();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_send',
        inscription_id: `${transferHashMocked}i0`,
        inscription_number: inscriptionNumberMockedSend,
        ordinal_number: '200000',
        block_height: blockHeightMockedSend,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: addressB,
        amount: '9000000000000000000000',
      });
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_receive',
        inscription_id: `${transferHashMocked}i0`,
        inscription_number: inscriptionNumberMockedSend,
        ordinal_number: '200000',
        block_height: blockHeightMockedSend,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '9000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(0);
      expect(json.results).toEqual([]);

      // A creates transfer of 500 pepe and 2000 meme
      blockHash = randomHash();
      const inscriptionNumberMocked2 = numbers.next().value.toString();
      const blockHeightMocked2 = blockHeights.next().value.toString();
      const transferHashMocked2 = randomHash();
      const inscriptionNumberMocked3 = numbers.next().value.toString();
      const blockHeightMocked3 = blockHeights.next().value.toString();
      const transferHashMocked3 = randomHash();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer',
        inscription_id: `${transferHashMocked2}i0`,
        inscription_number: inscriptionNumberMocked2,
        ordinal_number: '200000',
        block_height: blockHeightMocked2,
        block_hash: blockHash,
        tx_id: transferHashMocked2,
        tx_index: 0,
        output: `${transferHashMocked2}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '500000000000000000000',
      });

      await brc20Operation(brc20Db.sql, {
        ticker: 'meme',
        operation: 'transfer',
        inscription_id: `${transferHashMocked3}i0`,
        inscription_number: inscriptionNumberMocked3,
        ordinal_number: '300000',
        block_height: blockHeightMocked3,
        block_hash: blockHash,
        tx_id: transferHashMocked3,
        tx_index: 0,
        output: `${transferHashMocked3}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: null,
        amount: '2000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}`,
      });

      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(2);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            inscription_id: `${transferHashMocked2}i0`,
            ticker: 'pepe',
            inscription_number: parseInt(inscriptionNumberMocked2),
            block_height: parseInt(blockHeightMocked2),
            amount: '500000000000000000000',
          } as Brc20TransferableInscriptionsResponse),
          expect.objectContaining({
            inscription_id: `${transferHashMocked3}i0`,
            ticker: 'meme',
            inscription_number: parseInt(inscriptionNumberMocked3),
            block_height: parseInt(blockHeightMocked3),
            amount: '2000000000000000000000',
          } as Brc20TransferableInscriptionsResponse),
        ])
      );

      // Verify that A only has the 'meme' transferable inscription if querying for 'meme' ticker
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}?ticker=meme`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual([
        expect.objectContaining({
          inscription_id: `${transferHashMocked3}i0`,
          ticker: 'meme',
          inscription_number: parseInt(inscriptionNumberMocked3),
          block_height: parseInt(blockHeightMocked3),
          amount: '2000000000000000000000',
        } as Brc20TransferableInscriptionsResponse),
      ]);

      // Verify that A only has the 'pepe' transferable inscription if querying for 'pepe' ticker
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}?ticker=pepe`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual([
        expect.objectContaining({
          inscription_id: `${transferHashMocked2}i0`,
          ticker: 'pepe',
          inscription_number: parseInt(inscriptionNumberMocked2),
          block_height: parseInt(blockHeightMocked2),
          amount: '500000000000000000000',
        } as Brc20TransferableInscriptionsResponse),
      ]);

      // Verify that A only has no transferable inscription if querying for 'rere' ticker
      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}?ticker=rere`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(0);
      expect(json.results).toEqual([]);

      // A sends transfer inscription to B (aka transfer/sale) of pepe
      transferHash = randomHash();
      blockHash = randomHash();
      const blockHeightMockedSend4 = blockHeights.next().value.toString();
      const inscriptionNumberMockedSend4 = numbers.next().value.toString();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_send',
        inscription_id: `${transferHashMocked2}i0`,
        inscription_number: inscriptionNumberMockedSend4,
        ordinal_number: '200000',
        block_height: blockHeightMockedSend4,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: addressB,
        amount: '500000000000000000000',
      });
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_receive',
        inscription_id: `${transferHashMocked2}i0`,
        inscription_number: inscriptionNumberMockedSend4,
        ordinal_number: '200000',
        block_height: blockHeightMockedSend4,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '500000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(1);
      expect(json.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            inscription_id: `${transferHashMocked3}i0`,
            ticker: 'meme',
            inscription_number: parseInt(inscriptionNumberMocked3),
            block_height: parseInt(blockHeightMocked3),
            amount: '2000000000000000000000',
          } as Brc20TransferableInscriptionsResponse),
        ])
      );

      // A sends transfer inscription to B (aka transfer/sale) of meme
      transferHash = randomHash();
      blockHash = randomHash();
      const blockHeightMockedSend5 = blockHeights.next().value.toString();
      const inscriptionNumberMockedSend5 = numbers.next().value.toString();
      await brc20Operation(brc20Db.sql, {
        ticker: 'pepe',
        operation: 'transfer_send',
        inscription_id: `${transferHashMocked3}i0`,
        inscription_number: inscriptionNumberMockedSend5,
        ordinal_number: '300000',
        block_height: blockHeightMockedSend5,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressA,
        to_address: addressB,
        amount: '2000000000000000000000',
      });
      await brc20Operation(brc20Db.sql, {
        ticker: 'meme',
        operation: 'transfer_receive',
        inscription_id: `${transferHashMocked3}i0`,
        inscription_number: inscriptionNumberMockedSend5,
        ordinal_number: '300000',
        block_height: blockHeightMockedSend5,
        block_hash: blockHash,
        tx_id: transferHash,
        tx_index: 0,
        output: `${transferHash}:0`,
        offset: '0',
        timestamp: 1677803510,
        address: addressB,
        to_address: null,
        amount: '2000000000000000000000',
      });

      response = await fastify.inject({
        method: 'GET',
        url: `/ordinals/brc-20/transferable-inscriptions/${addressA}`,
      });
      expect(response.statusCode).toBe(200);
      json = response.json();
      expect(json.total).toBe(0);
      expect(json.results).toEqual([]);
    });
  });
});
