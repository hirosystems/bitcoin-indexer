import { buildApiServer } from '../../src/api/init';
import { Brc20PgStore } from '../../src/pg/brc20/brc20-pg-store';
import { PgStore } from '../../src/pg/pg-store';
import {
  TestFastifyServer,
  ORDINALS_MIGRATIONS_DIR,
  BRC20_MIGRATIONS_DIR,
  clearDb,
  runMigrations,
  inscriptionReveal,
  insertTestInscriptionRecursion,
  inscriptionTransfer,
  randomHash,
  insertTestInscriptionParent,
} from '../helpers';

describe('/inscriptions', () => {
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

  describe('show', () => {
    test('shows inscription', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '1',
        classic_number: '1',
        block_height: '778576',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 10369,
      });
      const expected = {
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 778576,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: 1,
        value: '10000',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
        sat_rarity: 'common',
        timestamp: 1676913207000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: null,
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: ['coin', 'reinscription', 'mythic', 'palindrome'],
      };

      // By inscription id
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual(expected);

      // By inscription number
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/1',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json()).toStrictEqual(expected);
    });

    test('shows recursive inscription', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '2',
        classic_number: '2',
        block_height: '778576',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: `0x${Buffer.from(
          `Hello
          /content/9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0
          /content/f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0
          /content/b4b27b9a15f928b95a8ce4b418946553b7b313a345254cd9b23d79489175fa5ai0`
        ).toString('hex')}`,
        fee: '2805',
        curse_type: null,
        recursive: true,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      await insertTestInscriptionRecursion(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ref_inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
      });
      await insertTestInscriptionRecursion(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ref_inscription_id: 'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0',
      });
      await insertTestInscriptionRecursion(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ref_inscription_id: 'b4b27b9a15f928b95a8ce4b418946553b7b313a345254cd9b23d79489175fa5ai0',
      });
      const expected = {
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 778576,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: 2,
        value: '10000',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
        sat_rarity: 'common',
        timestamp: 1676913207000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: null,
        recursive: true,
        recursion_refs: [
          '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0',
          'b4b27b9a15f928b95a8ce4b418946553b7b313a345254cd9b23d79489175fa5ai0',
        ],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      };

      // By inscription id
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual(expected);

      // By inscription number
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/2',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json()).toStrictEqual(expected);
    });

    test('shows inscription with parents', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '778575',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
        tx_index: 0,
        address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
        mime_type: 'text/plain',
        content_type: 'text/plain;charset=utf-8',
        content_length: 5,
        content: '0x010101',
        fee: '705',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 0,
        output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });
      await inscriptionReveal(db.sql, {
        inscription_id: 'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0',
        ordinal_number: '257418248345364',
        number: '1',
        classic_number: '1',
        block_height: '778575',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: 'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 0,
        output: 'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      await insertTestInscriptionParent(db.sql, {
        inscription_id: 'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0',
        parent_inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
      });
      await insertTestInscriptionParent(db.sql, {
        inscription_id: 'f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0',
        parent_inscription_id: '001eec2c3fb12441057722b099ae22f4d67602e2e7add0bd018132c0b128cde3i0',
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/f351d86c6e6cae3c64e297e7463095732f216875bcc1f3c03f950a492bb25421i0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().parent_refs).toStrictEqual([
        '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
        '001eec2c3fb12441057722b099ae22f4d67602e2e7add0bd018132c0b128cde3i0',
      ]);
    });

    test('shows inscription with metadata', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '778575',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
        tx_index: 0,
        address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
        mime_type: 'text/plain',
        content_type: 'text/plain;charset=utf-8',
        content_length: 0,
        content: '0x010101',
        fee: '705',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: JSON.stringify({ foo: 'bar', test: 1337 }),
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().metadata).toStrictEqual({ foo: 'bar', test: 1337 });
    });

    test('shows inscription with empty genesis address', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: '',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      const expected = {
        address: '',
        genesis_address: '',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: 0,
        value: '10000',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
        sat_rarity: 'common',
        timestamp: 1676913207000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: null,
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      };

      // By inscription id
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual(expected);

      // By inscription number
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/0',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json()).toStrictEqual(expected);
    });

    test('shows cursed inscription', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '-7',
        classic_number: '-7',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: '88',
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      const expected = {
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: -7,
        value: '10000',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
        sat_rarity: 'common',
        timestamp: 1676913207000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: '88',
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      };

      // By inscription id
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual(expected);

      // By inscription number
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/-7',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json()).toStrictEqual(expected);
    });

    test('shows correct inscription data after a transfer', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });

      // Transfer 1
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775700',
        tx_index: 0,
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        block_hash: randomHash(),
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        offset: '0',
        prev_output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        prev_offset: '0',
        value: '9000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775617',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual({
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: 0,
        value: '9000',
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
        sat_rarity: 'common',
        timestamp: 1678122360000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: null,
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      });

      // Transfer 2
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775701',
        tx_index: 0,
        tx_id: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85',
        block_hash: randomHash(),
        address: 'bc1pkjq7cerr6h53qm86k9t3dq0gqg8lcfz5jx7z4aj2mpqrjggrnass0u7qqj',
        output: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0',
        offset: '0',
        prev_output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        prev_offset: '0',
        value: '8000',
        transfer_type: 'transferred',
        timestamp: 1678124000,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775700',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json()).toStrictEqual({
        address: 'bc1pkjq7cerr6h53qm86k9t3dq0gqg8lcfz5jx7z4aj2mpqrjggrnass0u7qqj',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: 0,
        tx_id: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85',
        value: '8000',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0',
        location: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0:0',
        sat_rarity: 'common',
        timestamp: 1678124000000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: null,
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      });
    });

    test('shows correct data when multiple transfers happen in the same block', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '9000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });

      // Multiple transfers
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775618',
        tx_index: 30,
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        block_hash: '000000000000000000028918f7f99683fb96dffa1184a1089b7c01c066319a08',
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        offset: '0',
        prev_output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        prev_offset: '0',
        value: '9000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775617',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775618',
        tx_index: 42,
        tx_id: 'c7cfe8e51760ce29b4cde68f3f476630f5e161bda3db176be3b3b7bb54d0ce3f',
        block_hash: '000000000000000000028918f7f99683fb96dffa1184a1089b7c01c066319a08',
        address: 'bc1qv7d2dgyvtctv7ya4t3ysy4c2s8qz4nm8t6dvm3',
        output: 'c7cfe8e51760ce29b4cde68f3f476630f5e161bda3db176be3b3b7bb54d0ce3f:1',
        offset: '0',
        prev_output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        prev_offset: '0',
        value: '8000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775618',
        from_tx_index: 30,
        block_transfer_index: 1,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual({
        address: 'bc1qv7d2dgyvtctv7ya4t3ysy4c2s8qz4nm8t6dvm3',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: 0,
        value: '8000',
        tx_id: 'c7cfe8e51760ce29b4cde68f3f476630f5e161bda3db176be3b3b7bb54d0ce3f',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: 'c7cfe8e51760ce29b4cde68f3f476630f5e161bda3db176be3b3b7bb54d0ce3f:1',
        location: 'c7cfe8e51760ce29b4cde68f3f476630f5e161bda3db176be3b3b7bb54d0ce3f:1:0',
        sat_rarity: 'common',
        timestamp: 1678122360000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: null,
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      });
    });

    test('shows correct cursed inscription data after a transfer', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '-7',
        classic_number: '-7',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: JSON.stringify({ tag: 66 }),
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });

      // Transfer 1
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775700',
        tx_index: 0,
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        block_hash: '',
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        offset: '0',
        prev_output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        prev_offset: '0',
        value: '9000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '-7',
        from_block_height: '775617',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual({
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: -7,
        value: '9000',
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
        sat_rarity: 'common',
        timestamp: 1678122360000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: '{"tag":66}',
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      });

      // Transfer 2
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775701',
        tx_index: 0,
        tx_id: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85',
        block_hash: '',
        address: 'bc1pkjq7cerr6h53qm86k9t3dq0gqg8lcfz5jx7z4aj2mpqrjggrnass0u7qqj',
        prev_output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        prev_offset: '0',
        output: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0',
        offset: '0',
        value: '8000',
        transfer_type: 'transferred',
        timestamp: 1678124000,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '-7',
        from_block_height: '775700',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json()).toStrictEqual({
        address: 'bc1pkjq7cerr6h53qm86k9t3dq0gqg8lcfz5jx7z4aj2mpqrjggrnass0u7qqj',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        genesis_block_height: 775617,
        content_length: 5,
        mime_type: 'image/png',
        content_type: 'image/png',
        genesis_fee: '2805',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        offset: '0',
        number: -7,
        tx_id: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85',
        value: '8000',
        sat_ordinal: '257418248345364',
        sat_coinbase_height: 51483,
        output: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0',
        location: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0:0',
        sat_rarity: 'common',
        timestamp: 1678124000000,
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        curse_type: '{"tag":66}',
        recursive: false,
        recursion_refs: [],
        parent: null,
        parent_refs: [],
        metadata: null,
        meta_protocol: null,
        delegate: null,
        charms: [],
      });
    });

    test('shows inscription content', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'text/plain',
        content_type: 'text/plain',
        content_length: 5,
        content: '0x48656C6C6F', // Hello
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0/content',
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-length']).toBe('5');
      expect(response.body).toBe('Hello');
    });

    test('shows delegate inscription content', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'text/plain',
        content_type: 'text/plain',
        content_length: 5,
        content: '0x48656C6C6F', // Hello
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      await inscriptionReveal(db.sql, {
        inscription_id: '42174ecc8a245841035793390bb53d63b3c2acb61366446f601b09e73b94b656i0',
        ordinal_number: '257418248345364',
        number: '1',
        classic_number: '1',
        block_height: '775618',
        block_hash: '00000000000000000000ceb7a81bf3696de0b2260078942f3ab36a7127aff296',
        tx_id: '42174ecc8a245841035793390bb53d63b3c2acb61366446f601b09e73b94b656',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'text/plain',
        content_type: 'text/plain',
        content_length: 0,
        content: '', // Empty
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        timestamp: 1676913207,
        output: '42174ecc8a245841035793390bb53d63b3c2acb61366446f601b09e73b94b656:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '51483',
        charms: 0,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/42174ecc8a245841035793390bb53d63b3c2acb61366446f601b09e73b94b656i0/content',
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-length']).toBe('5');
      expect(response.body).toBe('Hello');

      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/42174ecc8a245841035793390bb53d63b3c2acb61366446f601b09e73b94b656i0',
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.json().delegate).toBe(
        '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0'
      );
    });
  });

  describe('transfers', () => {
    test('shows inscription history after a transfer', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });

      // Transfer 1
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775700',
        tx_index: 0,
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        offset: '0',
        prev_output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        prev_offset: '0',
        value: '9000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775617',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      const response = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0/transfers',
      });
      expect(response.statusCode).toBe(200);
      const json1 = response.json();
      expect(json1.total).toBe(2);
      expect(json1.results).toStrictEqual([
        {
          address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
          block_height: 775700,
          location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
          offset: '0',
          output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
          timestamp: 1678122360000,
          tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
          value: '9000',
        },
        {
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          block_height: 775617,
          location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
          offset: '0',
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          timestamp: 1676913207000,
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          value: '10000',
        },
      ]);

      // Transfer 2
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775701',
        tx_index: 0,
        tx_id: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7cccc',
        address: 'bc1pkjq7cerr6h53qm86k9t3dq0gqg8lcfz5jx7z4aj2mpqrjggrnass0u7qqj',
        output: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0',
        offset: '0',
        prev_output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        prev_offset: '0',
        value: '8000',
        transfer_type: 'transferred',
        timestamp: 1678124000,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775700',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0/transfers',
      });
      expect(response2.statusCode).toBe(200);
      const json2 = response2.json();
      expect(json2.total).toBe(3);
      expect(json2.results).toStrictEqual([
        {
          address: 'bc1pkjq7cerr6h53qm86k9t3dq0gqg8lcfz5jx7z4aj2mpqrjggrnass0u7qqj',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7cccc',
          block_height: 775701,
          location: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0:0',
          offset: '0',
          output: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85:0',
          timestamp: 1678124000000,
          tx_id: 'e3af144354367de58c675e987febcb49f17d6c19e645728b833fe95408feab85',
          value: '8000',
        },
        {
          address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
          block_height: 775700,
          location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
          offset: '0',
          output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
          timestamp: 1678122360000,
          tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
          value: '9000',
        },
        {
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          block_height: 775617,
          location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
          offset: '0',
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          timestamp: 1676913207000,
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          value: '10000',
        },
      ]);
    });

    test('shows transfers per block', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });
      await inscriptionReveal(db.sql, {
        inscription_id: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cdi0',
        ordinal_number: '257418248340000',
        number: '1',
        classic_number: '1',
        block_height: '775617',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cd',
        tx_index: 1,
        address: 'bc1ptrehxtus25xx8jp5pchljxg2aps7mdemc4264zzzsdcvs6q25hhsf3rrph',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cd:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });

      // No transfers on this block because they are all genesis.
      const response1 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/transfers?block=775617',
      });
      expect(response1.statusCode).toBe(200);
      const json1 = response1.json();
      expect(json1.total).toBe(0);
      expect(json1.results).toStrictEqual([]);

      // Transfers
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775700',
        tx_index: 0,
        tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        offset: '0',
        prev_output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        prev_offset: '0',
        value: '9000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775617',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248340000',
        block_height: '775700',
        tx_index: 1,
        tx_id: 'abe7deebd0c6bacc9b1ddd234f9442db0530180448e934f34b9cbf3d7e6d91cb',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
        address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
        output: 'abe7deebd0c6bacc9b1ddd234f9442db0530180448e934f34b9cbf3d7e6d91cb:0',
        offset: '0',
        prev_output: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cd:0',
        prev_offset: '0',
        value: '9000',
        transfer_type: 'transferred',
        timestamp: 1678122360,
        inscription_id: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cdi0',
        number: '1',
        from_block_height: '775617',
        from_tx_index: 0,
        block_transfer_index: 1,
      });
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/transfers?block=775700',
      });
      expect(response2.statusCode).toBe(200);
      const json2 = response2.json();
      expect(json2.total).toBe(2);
      expect(json2.results).toStrictEqual([
        {
          id: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cdi0',
          number: 1,
          from: {
            address: 'bc1ptrehxtus25xx8jp5pchljxg2aps7mdemc4264zzzsdcvs6q25hhsf3rrph',
            block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
            block_height: 775617,
            location: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cd:0:0',
            offset: '0',
            output: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cd:0',
            timestamp: 1676913207000,
            tx_id: '7ac73ecd01b9da4a7eab904655416dbfe8e03f193e091761b5a63ad0963570cd',
            value: '10000',
          },
          to: {
            address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
            block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
            block_height: 775700,
            location: 'abe7deebd0c6bacc9b1ddd234f9442db0530180448e934f34b9cbf3d7e6d91cb:0:0',
            offset: '0',
            output: 'abe7deebd0c6bacc9b1ddd234f9442db0530180448e934f34b9cbf3d7e6d91cb:0',
            timestamp: 1678122360000,
            tx_id: 'abe7deebd0c6bacc9b1ddd234f9442db0530180448e934f34b9cbf3d7e6d91cb',
            value: '9000',
          },
        },
        {
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          number: 0,
          from: {
            address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
            block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
            block_height: 775617,
            location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
            offset: '0',
            output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
            timestamp: 1676913207000,
            tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
            value: '10000',
          },
          to: {
            address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
            block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
            block_height: 775700,
            location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
            offset: '0',
            output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
            timestamp: 1678122360000,
            tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
            value: '9000',
          },
        },
      ]);

      // More transfers
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775701',
        tx_index: 0,
        tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
        block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
        address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
        output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0',
        offset: '0',
        prev_output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
        prev_offset: '0',
        value: '8000',
        transfer_type: 'transferred',
        timestamp: 1676913208,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775700',
        from_tx_index: 0,
        block_transfer_index: 0,
      });
      await inscriptionTransfer(db.sql, {
        ordinal_number: '257418248345364',
        block_height: '775701',
        tx_index: 1,
        tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
        block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
        address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
        output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:1',
        offset: '0',
        prev_output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0',
        prev_offset: '0',
        value: '7500',
        transfer_type: 'transferred',
        timestamp: 1676913208,
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        number: '0',
        from_block_height: '775700',
        from_tx_index: 0,
        block_transfer_index: 1,
      });
      const response3 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/transfers?block=775701',
      });
      expect(response3.statusCode).toBe(200);
      const json3 = response3.json();
      expect(json3.total).toBe(2);
      expect(json3.results).toHaveLength(2);
      expect(json3.results).toStrictEqual([
        {
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          number: 0,
          from: {
            address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
            block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
            block_height: 775701,
            location: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0:0',
            offset: '0',
            output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0',
            timestamp: 1676913208000,
            tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
            value: '8000',
          },
          to: {
            address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
            block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
            block_height: 775701,
            location: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:1:0',
            offset: '0',
            output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:1',
            timestamp: 1676913208000,
            tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
            value: '7500',
          },
        },
        {
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          number: 0,
          from: {
            address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
            block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
            block_height: 775700,
            location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
            offset: '0',
            output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
            timestamp: 1678122360000,
            tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
            value: '9000',
          },
          to: {
            address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
            block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
            block_height: 775701,
            location: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0:0',
            offset: '0',
            output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0',
            timestamp: 1676913208000,
            tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
            value: '8000',
          },
        },
      ]);

      // Test pagination
      const response4 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/transfers?block=775701&limit=1&offset=0',
      });
      expect(response4.statusCode).toBe(200);
      const json4 = response4.json();
      expect(json4.total).toBe(2);
      expect(json4.results).toHaveLength(1);
      expect(json4.results).toStrictEqual([
        {
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          number: 0,
          from: {
            address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
            block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
            block_height: 775701,
            location: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0:0',
            offset: '0',
            output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0',
            timestamp: 1676913208000,
            tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
            value: '8000',
          },
          to: {
            address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
            block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
            block_height: 775701,
            location: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:1:0',
            offset: '0',
            output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:1',
            timestamp: 1676913208000,
            tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
            value: '7500',
          },
        },
      ]);
      const response5 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions/transfers?block=775701&limit=1&offset=1',
      });
      expect(response5.statusCode).toBe(200);
      const json5 = response5.json();
      expect(json5.total).toBe(2);
      expect(json5.results).toHaveLength(1);
      expect(json5.results).toStrictEqual([
        {
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          number: 0,
          from: {
            address: 'bc1p3xqwzmddceqrd6x9yxplqzkl5vucta2gqm5szpkmpuvcvgs7g8psjf8htd',
            block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7bbbb',
            block_height: 775700,
            location: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0:0',
            offset: '0',
            output: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444:0',
            timestamp: 1678122360000,
            tx_id: 'bdda0d240132bab2af7f797d1507beb1acab6ad43e2c0ef7f96291aea5cc3444',
            value: '9000',
          },
          to: {
            address: 'bc1pkx5me775s748lzchytzdsw4f0lq04wssxnyk27g8fn3gee8zhjjqsn9tfp',
            block_hash: '000000000000000000044b12039abd3112963959d9fd7510ac503ea84dc17002',
            block_height: 775701,
            location: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0:0',
            offset: '0',
            output: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e:0',
            timestamp: 1676913208000,
            tx_id: '5cabafe04aaf98b1f325b0c3ffcbff904dbdb6f3d2e9e451102fda36f1056b5e',
            value: '8000',
          },
        },
      ]);
    });
  });

  describe('index', () => {
    test('unfiltered index', async () => {
      await inscriptionReveal(db.sql, {
        inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
        ordinal_number: '257418248345364',
        number: '0',
        classic_number: '0',
        block_height: '778575',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
        tx_index: 0,
        address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
        mime_type: 'text/plain',
        content_type: 'text/plain;charset=utf-8',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '705',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });
      await inscriptionReveal(db.sql, {
        inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        ordinal_number: '257418248345365',
        number: '1',
        classic_number: '1',
        block_height: '778576',
        block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
        tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        tx_index: 0,
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        mime_type: 'image/png',
        content_type: 'image/png',
        content_length: 5,
        content: '0x48656C6C6F',
        fee: '2805',
        curse_type: null,
        recursive: false,
        input_index: 0,
        pointer: null,
        metadata: null,
        metaprotocol: null,
        delegate: null,
        timestamp: 1676913207,
        output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
        offset: '0',
        prev_output: null,
        prev_offset: null,
        value: '10000',
        transfer_type: 'transferred',
        rarity: 'common',
        coinbase_height: '650000',
        charms: 0,
      });

      const response1 = await fastify.inject({
        method: 'GET',
        url: '/ordinals/v1/inscriptions',
      });
      expect(response1.statusCode).toBe(200);
      const responseJson1 = response1.json();
      expect(responseJson1.total).toBe(2);
      expect(responseJson1.results).toStrictEqual([
        {
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          genesis_block_height: 778576,
          content_length: 5,
          mime_type: 'image/png',
          content_type: 'image/png',
          genesis_fee: '2805',
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          offset: '0',
          number: 1,
          value: '10000',
          sat_ordinal: '257418248345365',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          sat_coinbase_height: 650000,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
          sat_rarity: 'common',
          timestamp: 1676913207000,
          genesis_timestamp: 1676913207000,
          genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          curse_type: null,
          recursive: false,
          recursion_refs: [],
          parent: null,
          parent_refs: [],
          metadata: null,
          meta_protocol: null,
          delegate: null,
          charms: [],
        },
        {
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          genesis_address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          genesis_block_height: 778575,
          content_length: 5,
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          genesis_fee: '705',
          id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          offset: '0',
          number: 0,
          value: '10000',
          sat_ordinal: '257418248345364',
          sat_coinbase_height: 650000,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          location: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0:0',
          sat_rarity: 'common',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          timestamp: 1676913207000,
          genesis_timestamp: 1676913207000,
          genesis_tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          curse_type: null,
          recursive: false,
          recursion_refs: [],
          parent: null,
          parent_refs: [],
          metadata: null,
          meta_protocol: null,
          delegate: null,
          charms: [],
        },
      ]);
    });

    describe('filters', () => {
      test('index filtered by mime type', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '257418248345365',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?mime_type=text/plain',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        const result1 = {
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          genesis_address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          genesis_block_height: 778575,
          content_length: 5,
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          genesis_fee: '705',
          id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          offset: '0',
          number: 0,
          value: '10000',
          sat_ordinal: '257418248345364',
          sat_coinbase_height: 650000,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          location: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0:0',
          sat_rarity: 'common',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          timestamp: 1676913207000,
          genesis_timestamp: 1676913207000,
          genesis_tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          curse_type: null,
          recursive: false,
          recursion_refs: [],
          parent: null,
          parent_refs: [],
          metadata: null,
          meta_protocol: null,
          delegate: null,
          charms: [],
        };
        expect(responseJson1.results[0]).toStrictEqual(result1);

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?mime_type=image/png',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        const result2 = {
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          genesis_block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          genesis_block_height: 778576,
          content_length: 5,
          mime_type: 'image/png',
          content_type: 'image/png',
          genesis_fee: '2805',
          id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          offset: '0',
          number: 1,
          value: '10000',
          sat_ordinal: '257418248345365',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          sat_coinbase_height: 650000,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          location: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0',
          sat_rarity: 'common',
          timestamp: 1676913207000,
          genesis_timestamp: 1676913207000,
          genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          curse_type: null,
          recursive: false,
          recursion_refs: [],
          parent: null,
          parent_refs: [],
          metadata: null,
          meta_protocol: null,
          delegate: null,
          charms: [],
        };
        expect(responseJson2.results[0]).toStrictEqual(result2);

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?mime_type=image/png&mime_type=text/plain',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(2);
        expect(responseJson3.results.length).toBe(2);
        expect(responseJson3.results[0]).toStrictEqual(result2);
        expect(responseJson3.results[1]).toStrictEqual(result1);
      });

      test('index filtered by sat rarity', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '0',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'mythic',
          coinbase_height: '0',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?rarity=common',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].sat_rarity).toBe('common');

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?rarity=mythic',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results[0].sat_rarity).toBe('mythic');

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?rarity=mythic&rarity=common',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(2);
      });

      test('index filtered by inscription id', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '257418248345364',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?id=9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results[0].id).toBe(
          '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0'
        );

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?id=38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results[0].id).toBe(
          '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0'
        );

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?id=9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0&id=38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(2);
      });

      test('index filtered by inscription number', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '257418248345364',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?number=0',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results[0].number).toBe(0);

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?number=1',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results[0].number).toBe(1);

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?number=0&number=1',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(2);
      });

      test('index filtered by block height', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '257418248345364',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?genesis_block=778576',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].genesis_block_height).toBe(778576);

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?to_genesis_block_height=778575',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        expect(responseJson2.results[0].genesis_block_height).toBe(778575);

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?from_genesis_block_height=778576',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(1);
        expect(responseJson3.results.length).toBe(1);
        expect(responseJson3.results[0].genesis_block_height).toBe(778576);

        await inscriptionReveal(db.sql, {
          inscription_id: '25b372de3de0cb6fcc52c89a8bc3fb78eec596521ba20de16e53c1585be7c3fci0',
          ordinal_number: '257418248345364',
          number: '2',
          classic_number: '2',
          block_height: '778577',
          block_hash: '000000000000000000003ac2d5b588bc97a5479d25e403cffd90bd60c9680cfc',
          tx_id: '25b372de3de0cb6fcc52c89a8bc3fb78eec596521ba20de16e53c1585be7c3fc',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '25b372de3de0cb6fcc52c89a8bc3fb78eec596521ba20de16e53c1585be7c3fc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        const response4 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?from_genesis_block_height=778575&to_genesis_block_height=778576',
        });
        expect(response4.statusCode).toBe(200);
        const responseJson4 = response4.json();
        expect(responseJson4.total).toBe(2);
        expect(responseJson4.results.length).toBe(2);
        expect(responseJson4.results[0].genesis_block_height).toBe(778576);
        expect(responseJson4.results[1].genesis_block_height).toBe(778575);
      });

      test('index filtered by block hash', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '000000000000000000039b3051705a16fcf310a70dee55742339e6da70181bf7',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '257418248345364',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?genesis_block=000000000000000000039b3051705a16fcf310a70dee55742339e6da70181bf7',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].genesis_block_hash).toBe(
          '000000000000000000039b3051705a16fcf310a70dee55742339e6da70181bf7'
        );
      });

      test('index filtered by timestamp range', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '257418248345364',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?from_genesis_timestamp=1675571361000',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        expect(responseJson2.results[0].genesis_timestamp).toBe(1677731361000);

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?to_genesis_timestamp=1675571361000',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(1);
        expect(responseJson3.results.length).toBe(1);
        expect(responseJson3.results[0].genesis_timestamp).toBe(1675312161000);
      });

      test('index filtered by sat ordinal range', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?from_sat_ordinal=1000400000000',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        expect(responseJson2.results[0].sat_ordinal).toBe('257418248345364');

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?to_sat_ordinal=1000400000000',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(1);
        expect(responseJson3.results.length).toBe(1);
        expect(responseJson3.results[0].sat_ordinal).toBe('1000000000000');
      });

      test('index filtered by sat coinbase height range', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '51483',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '200',
          charms: 0,
        });

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?from_sat_coinbase_height=51400',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        expect(responseJson2.results[0].sat_coinbase_height).toBe(51483);

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?to_sat_coinbase_height=51400',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(1);
        expect(responseJson3.results.length).toBe(1);
        expect(responseJson3.results[0].sat_coinbase_height).toBe(200);
      });

      test('index filtered by inscription number range', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?from_number=1',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results[0].number).toBe(1);

        const response3 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?to_number=0',
        });
        expect(response3.statusCode).toBe(200);
        const responseJson3 = response3.json();
        expect(responseJson3.total).toBe(1);
        expect(responseJson3.results.length).toBe(1);
        expect(responseJson3.results[0].number).toBe(0);
      });

      test('index filtered by output', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?output=9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results[0].output).toBe(
          '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0'
        );
      });

      test('index filtered by address', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?address=bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].address).toBe(
          'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj'
        );

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?address=bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj&address=bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(2);
        expect(responseJson2.results.length).toBe(2);
      });

      test('index filtered by recursive', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: `0x${Buffer.from(
            'Hello /content/9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0'
          ).toString('hex')}`,
          fee: '2805',
          curse_type: null,
          recursive: true,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await insertTestInscriptionRecursion(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ref_inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?recursive=true',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].id).toBe(
          '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0'
        );

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?recursive=false',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        expect(responseJson2.results[0].id).toBe(
          '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0'
        );
      });

      test('index filtered by cursed', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '-100',
          classic_number: '-100',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: 'test',
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?cursed=true',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].id).toBe(
          '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0'
        );

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?cursed=false',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(1);
        expect(responseJson2.results.length).toBe(1);
        expect(responseJson2.results[0].id).toBe(
          '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0'
        );
      });

      test('index filtered by genesis address', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1677731361,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1675312161,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?genesis_address=bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(1);
        expect(responseJson1.results.length).toBe(1);
        expect(responseJson1.results[0].genesis_address).toBe(
          'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj'
        );

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?genesis_address=bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj&genesis_address=bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(2);
        expect(responseJson2.results.length).toBe(2);
      });
    });

    describe('ordering', () => {
      test('index ordered by number', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1050000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1i0',
          ordinal_number: '0',
          number: '2',
          classic_number: '2',
          block_height: '778577',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1',
          tx_index: 0,
          address: 'bc1pxq6t85qp57aw8yf8eh9t7vsgd9zm5a8372rdll5jzrmc3cxqdpmqfucdry',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '0',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=number&order=asc',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(3);
        expect(responseJson1.results[0].number).toStrictEqual(0);
        expect(responseJson1.results[1].number).toStrictEqual(1);
        expect(responseJson1.results[2].number).toStrictEqual(2);

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=number&order=desc',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(3);
        expect(responseJson2.results[0].number).toStrictEqual(2);
        expect(responseJson2.results[1].number).toStrictEqual(1);
        expect(responseJson2.results[2].number).toStrictEqual(0);
      });

      test('index ordered by sat rarity', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1050000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'epic',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1i0',
          ordinal_number: '0',
          number: '2',
          classic_number: '2',
          block_height: '778577',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1',
          tx_index: 0,
          address: 'bc1pxq6t85qp57aw8yf8eh9t7vsgd9zm5a8372rdll5jzrmc3cxqdpmqfucdry',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'mythic',
          coinbase_height: '0',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=rarity&order=asc',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(3);
        expect(responseJson1.results[0].sat_rarity).toStrictEqual('common');
        expect(responseJson1.results[1].sat_rarity).toStrictEqual('epic');
        expect(responseJson1.results[2].sat_rarity).toStrictEqual('mythic');

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=rarity&order=desc',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(3);
        expect(responseJson2.results[0].sat_rarity).toStrictEqual('mythic');
        expect(responseJson2.results[1].sat_rarity).toStrictEqual('epic');
        expect(responseJson2.results[2].sat_rarity).toStrictEqual('common');
      });

      test('index ordered by sat ordinal', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1050000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1i0',
          ordinal_number: '0',
          number: '2',
          classic_number: '2',
          block_height: '778577',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1',
          tx_index: 0,
          address: 'bc1pxq6t85qp57aw8yf8eh9t7vsgd9zm5a8372rdll5jzrmc3cxqdpmqfucdry',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '0',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=ordinal&order=asc',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(3);
        expect(responseJson1.results[0].sat_ordinal).toStrictEqual('0');
        expect(responseJson1.results[1].sat_ordinal).toStrictEqual('257418248345364');
        expect(responseJson1.results[2].sat_ordinal).toStrictEqual('1050000000000000');

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=ordinal&order=desc',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(3);
        expect(responseJson2.results[0].sat_ordinal).toStrictEqual('1050000000000000');
        expect(responseJson2.results[1].sat_ordinal).toStrictEqual('257418248345364');
        expect(responseJson2.results[2].sat_ordinal).toStrictEqual('0');
      });

      test('index ordered by genesis block height', async () => {
        await inscriptionReveal(db.sql, {
          inscription_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201i0',
          ordinal_number: '257418248345364',
          number: '0',
          classic_number: '0',
          block_height: '778575',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201',
          tx_index: 0,
          address: 'bc1pscktlmn99gyzlvymvrezh6vwd0l4kg06tg5rvssw0czg8873gz5sdkteqj',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '9f4a9b73b0713c5da01c0a47f97c6c001af9028d6bdd9e264dfacbc4e6790201:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
          ordinal_number: '1050000000000000',
          number: '1',
          classic_number: '1',
          block_height: '778576',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
          tx_index: 0,
          address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
          mime_type: 'text/plain',
          content_type: 'text/plain;charset=utf-8',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '705',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '650000',
          charms: 0,
        });
        await inscriptionReveal(db.sql, {
          inscription_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1i0',
          ordinal_number: '0',
          number: '2',
          classic_number: '2',
          block_height: '778577',
          block_hash: '00000000000000000002a90330a99f67e3f01eb2ce070b45930581e82fb7a91d',
          tx_id: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1',
          tx_index: 0,
          address: 'bc1pxq6t85qp57aw8yf8eh9t7vsgd9zm5a8372rdll5jzrmc3cxqdpmqfucdry',
          mime_type: 'image/png',
          content_type: 'image/png',
          content_length: 5,
          content: '0x48656C6C6F',
          fee: '2805',
          curse_type: null,
          recursive: false,
          input_index: 0,
          pointer: null,
          metadata: null,
          metaprotocol: null,
          delegate: null,
          timestamp: 1676913207,
          output: '567c7605439dfdc3a289d13fd2132237852f4a56e784b9364ba94499d5f9baf1:0',
          offset: '0',
          prev_output: null,
          prev_offset: null,
          value: '10000',
          transfer_type: 'transferred',
          rarity: 'common',
          coinbase_height: '0',
          charms: 0,
        });

        const response1 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=genesis_block_height&order=asc',
        });
        expect(response1.statusCode).toBe(200);
        const responseJson1 = response1.json();
        expect(responseJson1.total).toBe(3);
        expect(responseJson1.results[0].genesis_block_height).toStrictEqual(778575);
        expect(responseJson1.results[1].genesis_block_height).toStrictEqual(778576);
        expect(responseJson1.results[2].genesis_block_height).toStrictEqual(778577);

        const response2 = await fastify.inject({
          method: 'GET',
          url: '/ordinals/v1/inscriptions?order_by=genesis_block_height&order=desc',
        });
        expect(response2.statusCode).toBe(200);
        const responseJson2 = response2.json();
        expect(responseJson2.total).toBe(3);
        expect(responseJson2.results[0].genesis_block_height).toStrictEqual(778577);
        expect(responseJson2.results[1].genesis_block_height).toStrictEqual(778576);
        expect(responseJson2.results[2].genesis_block_height).toStrictEqual(778575);
      });
    });
  });

  test('returns not found for invalid inscriptions', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/inscriptions/ff4503ab9048d6d0ff4e23def81b614d5270d341ce993992e93902ceb0d4ed79i0',
    });
    expect(response.statusCode).toBe(404);
  });
});
