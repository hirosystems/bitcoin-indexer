import { buildApiServer } from '../../src/api/init';
import { PgStore } from '../../src/pg/pg-store';
import { Brc20PgStore } from '../../src/pg/brc20/brc20-pg-store';
import {
  BRC20_MIGRATIONS_DIR,
  clearDb,
  inscriptionReveal,
  inscriptionTransfer,
  ORDINALS_MIGRATIONS_DIR,
  runMigrations,
  TestFastifyServer,
} from '../helpers';

describe('/sats', () => {
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

  test('returns valid sat', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/sats/10080000000001',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toStrictEqual({
      coinbase_height: 2016,
      cycle: 0,
      decimal: '2016.1',
      degree: '0°2016′0″1‴',
      epoch: 0,
      name: 'ntwwidfrzxg',
      offset: 1,
      percentile: '0.48000000052804787%',
      period: 1,
      rarity: 'common',
    });
  });

  test('returns sat with inscription', async () => {
    await inscriptionReveal(db.sql, {
      content: '0x48656C6C6F',
      content_type: 'image/png',
      content_length: 5,
      number: '0',
      classic_number: '0',
      fee: '2805',
      inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      value: '10000',
      address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
      ordinal_number: '257418248345364',
      coinbase_height: '650000',
      offset: '0',
      output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
      input_index: 0,
      tx_index: 0,
      curse_type: null,
      pointer: null,
      delegate: null,
      metaprotocol: null,
      metadata: null,
      block_height: '775617',
      block_hash: '163de66dc9c0949905bfe8e148bde04600223cf88d19f26fdbeba1d6e6fa0f88',
      tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
      mime_type: 'image/png',
      recursive: false,
      timestamp: 1676913207,
      prev_output: null,
      prev_offset: null,
      transfer_type: 'transferred',
      rarity: 'common',
      charms: 0,
    });
    const response = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/sats/257418248345364',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().inscription_id).toBe(
      '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0'
    );
  });

  test('returns sat with more than 1 inscription', async () => {
    await inscriptionReveal(db.sql, {
      content: '0x48656C6C6F',
      content_type: 'image/png',
      content_length: 5,
      number: '-7',
      classic_number: '-7',
      fee: '2805',
      inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      value: '10000',
      address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
      ordinal_number: '257418248345364',
      coinbase_height: '650000',
      offset: '0',
      output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
      curse_type: 'p2wsh',
      input_index: 0,
      tx_index: 0,
      pointer: null,
      delegate: null,
      metaprotocol: null,
      metadata: null,
      block_height: '775617',
      block_hash: '163de66dc9c0949905bfe8e148bde04600223cf88d19f26fdbeba1d6e6fa0f88',
      tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
      mime_type: 'image/png',
      recursive: false,
      timestamp: 1676913207,
      prev_output: null,
      prev_offset: null,
      transfer_type: 'transferred',
      rarity: 'common',
      charms: 0,
    });
    await inscriptionReveal(db.sql, {
      content: '0x48656C6C6F',
      content_type: 'image/png',
      content_length: 5,
      number: '-1',
      classic_number: '-1',
      fee: '2805',
      inscription_id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993i0',
      value: '10000',
      address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
      // Same sat. This will also create a transfer for the previous inscription.
      ordinal_number: '257418248345364',
      coinbase_height: '650000',
      offset: '0',
      output: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0',
      curse_type: 'p2wsh',
      input_index: 0,
      tx_index: 0,
      pointer: null,
      delegate: null,
      metaprotocol: null,
      metadata: null,
      block_height: '775618',
      block_hash: '000000000000000000002a244dc7dfcf8ab85e42d182531c27197fc125086f19',
      tx_id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993',
      mime_type: 'image/png',
      recursive: false,
      timestamp: 1676913207,
      prev_output: null,
      prev_offset: null,
      transfer_type: 'transferred',
      rarity: 'common',
      charms: 0,
    });
    // Simulate the inscription transfer for -7
    await inscriptionTransfer(db.sql, {
      ordinal_number: '257418248345364',
      block_height: '775618',
      tx_index: 0,
      tx_id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993',
      block_hash: '000000000000000000002a244dc7dfcf8ab85e42d182531c27197fc125086f19',
      address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
      output: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0',
      offset: '0',
      prev_output: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0',
      prev_offset: '0',
      value: '10000',
      transfer_type: 'transferred',
      timestamp: 1676913207,
      inscription_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
      number: '-7',
      from_block_height: '775617',
      from_tx_index: 0,
      block_transfer_index: 0,
    });
    const response = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/sats/257418248345364/inscriptions',
    });
    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.total).toBe(2);
    expect(json.results).toStrictEqual([
      {
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        content_length: 5,
        content_type: 'image/png',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '000000000000000000002a244dc7dfcf8ab85e42d182531c27197fc125086f19',
        genesis_block_height: 775618,
        genesis_fee: '2805',
        genesis_timestamp: 1676913207000,
        genesis_tx_id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993',
        id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993i0',
        location: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0:0',
        mime_type: 'image/png',
        number: -1,
        offset: '0',
        output: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0',
        sat_coinbase_height: 650000,
        sat_ordinal: '257418248345364',
        sat_rarity: 'common',
        timestamp: 1676913207000,
        tx_id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993',
        value: '10000',
        curse_type: 'p2wsh',
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
        address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        content_length: 5,
        content_type: 'image/png',
        genesis_address: 'bc1p3cyx5e2hgh53w7kpxcvm8s4kkega9gv5wfw7c4qxsvxl0u8x834qf0u2td',
        genesis_block_hash: '163de66dc9c0949905bfe8e148bde04600223cf88d19f26fdbeba1d6e6fa0f88',
        genesis_block_height: 775617,
        genesis_fee: '2805',
        genesis_timestamp: 1676913207000,
        genesis_tx_id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc',
        id: '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dci0',
        // Re-inscribed sat is moved to the latest inscription's location.
        location: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0:0',
        mime_type: 'image/png',
        number: -7,
        offset: '0',
        output: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0',
        sat_coinbase_height: 650000,
        sat_ordinal: '257418248345364',
        sat_rarity: 'common',
        timestamp: 1676913207000,
        tx_id: 'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993',
        value: '10000',
        curse_type: 'p2wsh',
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

    // Inscription -7 should have 2 locations, -1 should only have 1.
    let transfersResponse = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/inscriptions/-7/transfers',
    });
    expect(transfersResponse.statusCode).toBe(200);
    let transferJson = transfersResponse.json();
    expect(transferJson.total).toBe(2);
    expect(transferJson.results).toHaveLength(2);
    expect(transferJson.results[0].location).toBe(
      'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0:0'
    );
    expect(transferJson.results[1].location).toBe(
      '38c46a8bf7ec90bc7f6b797e7dc84baa97f4e5fd4286b92fe1b50176d03b18dc:0:0'
    );

    transfersResponse = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/inscriptions/-1/transfers',
    });
    expect(transfersResponse.statusCode).toBe(200);
    transferJson = transfersResponse.json();
    expect(transferJson.total).toBe(1);
    expect(transferJson.results).toHaveLength(1);
    expect(transferJson.results[0].location).toBe(
      'b9cd9489fe30b81d007f753663d12766f1368721a87f4c69056c8215caa57993:0:0'
    );

    // Block transfer activity should reflect all true transfers.
    transfersResponse = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/inscriptions/transfers?block=775617',
    });
    expect(transfersResponse.statusCode).toBe(200);
    transferJson = transfersResponse.json();
    expect(transferJson.total).toBe(0);
    expect(transferJson.results).toHaveLength(0);

    transfersResponse = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/inscriptions/transfers?block=775618',
    });
    expect(transfersResponse.statusCode).toBe(200);
    transferJson = transfersResponse.json();
    expect(transferJson.total).toBe(1);
    expect(transferJson.results).toHaveLength(1);
    expect(transferJson.results[0].number).toBe(-7);
  });

  test('returns not found on invalid sats', async () => {
    const response1 = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/sats/2099999997690000',
    });
    expect(response1.statusCode).toBe(400);

    const response2 = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/sats/-1',
    });
    expect(response2.statusCode).toBe(400);

    const response3 = await fastify.inject({
      method: 'GET',
      url: '/ordinals/v1/sats/Infinity',
    });
    expect(response3.statusCode).toBe(400);
  });
});
