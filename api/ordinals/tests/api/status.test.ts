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
  updateTestChainTip,
} from '../helpers';

describe('Status', () => {
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

  test('returns status when db is empty', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/ordinals/v1/' });
    const json = response.json();
    expect(json).toStrictEqual({
      server_version: 'ordinals-api v0.0.1 (test:123456)',
      status: 'ready',
      block_height: 0,
    });
    const noVersionResponse = await fastify.inject({ method: 'GET', url: '/ordinals/' });
    expect(response.statusCode).toEqual(noVersionResponse.statusCode);
    expect(json).toStrictEqual(noVersionResponse.json());
  });

  test('returns inscriptions total', async () => {
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
      content_type: 'text/plain;charset=utf-8',
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
      timestamp: 1676913207000,
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
      inscription_id: 'a98d7055a77fa0b96cc31e30bb8bacf777382d1b67f1b7eca6f2014e961591c8i0',
      ordinal_number: '257418248345364',
      number: '-2',
      classic_number: '-2',
      block_height: '791975',
      block_hash: '6c3f7e89a7b6d5f4e3a2c1b09876e5d4c3b2a1908765e4d3c2b1a09f8e7d6c5b',
      tx_id: 'a98d7055a77fa0b96cc31e30bb8bacf777382d1b67f1b7eca6f2014e961591c8',
      tx_index: 0,
      address: 'bc1pk6y72s45lcaurfwxrjyg7cf9xa9ezzuc8f5hhhzhtvhe5fgygckq0t0m5f',
      mime_type: 'text/plain',
      content_type: 'text/plain;charset=utf-8',
      content_length: 5,
      content: '0x48656C6C6F',
      fee: '2805',
      curse_type: 'p2wsh',
      recursive: false,
      input_index: 0,
      pointer: null,
      metadata: null,
      metaprotocol: null,
      delegate: null,
      timestamp: 1676913207000,
      output: 'a98d7055a77fa0b96cc31e30bb8bacf777382d1b67f1b7eca6f2014e961591c8:0',
      offset: '0',
      prev_output: null,
      prev_offset: null,
      value: '10000',
      transfer_type: 'transferred',
      rarity: 'common',
      coinbase_height: '650000',
      charms: 0,
    });
    await updateTestChainTip(db.sql, 791975);

    const response = await fastify.inject({ method: 'GET', url: '/ordinals/v1/' });
    const json = response.json();
    expect(json).toStrictEqual({
      server_version: 'ordinals-api v0.0.1 (test:123456)',
      status: 'ready',
      block_height: 791975,
      max_inscription_number: 0,
      max_cursed_inscription_number: -2,
    });
  });
});
