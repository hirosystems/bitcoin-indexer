import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import FastifyCors from '@fastify/cors';
import Fastify, { FastifyInstance } from 'fastify';
import FastifyMetrics, { IFastifyMetrics } from 'fastify-metrics';
import { FastifyPluginAsync } from 'fastify';
import { Server } from 'http';
import { PgStore } from '../pg/pg-store';
import { EtchingRoutes } from './routes/etchings';
import { AddressRoutes } from './routes/addresses';
import { TransactionRoutes } from './routes/transactions';
import { BlockRoutes } from './routes/blocks';
import { StatusRoutes } from './routes/status';
import { PINO_LOGGER_CONFIG, isProdEnv } from '@hirosystems/api-toolkit';

export const Api: FastifyPluginAsync<
  Record<never, never>,
  Server,
  TypeBoxTypeProvider
> = async fastify => {
  await fastify.register(StatusRoutes);
  await fastify.register(EtchingRoutes);
  await fastify.register(AddressRoutes);
  await fastify.register(TransactionRoutes);
  await fastify.register(BlockRoutes);
};

export async function buildApiServer(args: { db: PgStore }) {
  const fastify = Fastify({
    trustProxy: true,
    logger: PINO_LOGGER_CONFIG,
  }).withTypeProvider<TypeBoxTypeProvider>();
  if (isProdEnv) {
    await fastify.register(FastifyMetrics, { endpoint: null });
  }
  await fastify.register(FastifyCors);
  fastify.decorate('db', args.db);
  await fastify.register(Api, { prefix: '/runes/v1' });
  await fastify.register(Api, { prefix: '/runes' });

  return fastify;
}

export async function buildPrometheusServer(args: {
  metrics: IFastifyMetrics;
}): Promise<FastifyInstance> {
  const promServer = Fastify({
    trustProxy: true,
    logger: PINO_LOGGER_CONFIG,
  });
  promServer.route({
    url: '/metrics',
    method: 'GET',
    logLevel: 'info',
    handler: async (_, reply) => {
      await reply.type('text/plain').send(await args.metrics.client.register.metrics());
    },
  });
  return promServer;
}
