import FastifyCors from '@fastify/cors';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { PINO_LOGGER_CONFIG, isProdEnv } from '@hirosystems/api-toolkit';
import Fastify, {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
  FastifyInstance,
  RouteHandlerMethod,
} from 'fastify';
import FastifyMetrics, { IFastifyMetrics } from 'fastify-metrics';
import * as promClient from 'prom-client';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { PgStore } from '../pg/pg-store';
import { Brc20Routes } from './routes/brc20';
import { InscriptionsRoutes } from './routes/inscriptions';
import { SatRoutes } from './routes/sats';
import { StatsRoutes } from './routes/stats';
import { StatusRoutes } from './routes/status';
import { Brc20PgStore } from '../pg/brc20/brc20-pg-store';
import { ApiMetrics } from '../metrics/metrics';

export const Api: FastifyPluginAsync<
  Record<never, never>,
  Server,
  TypeBoxTypeProvider
> = async fastify => {
  await fastify.register(StatusRoutes);
  await fastify.register(InscriptionsRoutes);
  await fastify.register(SatRoutes);
  await fastify.register(StatsRoutes);
  await fastify.register(Brc20Routes);
};

export async function buildApiServer(args: { db: PgStore; brc20Db: Brc20PgStore }) {
  const fastify = Fastify({
    trustProxy: true,
    logger: PINO_LOGGER_CONFIG,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.decorate('db', args.db);
  fastify.decorate('brc20Db', args.brc20Db);

  if (isProdEnv) {
    await fastify.register(FastifyMetrics, {
      endpoint: null,
      promClient: promClient,
      defaultMetrics: { enabled: false },
    });
    // Configure API metrics and register middleware
    const metrics = ApiMetrics.configure(args.db);

    fastify.addHook(
      'preHandler',
      (request: FastifyRequest, _response: FastifyReply, done: () => void) => {
        request.metrics = {
          timer: metrics.handleMetric(request.routerPath),
        };
        done();
      }
    );

    fastify.addHook('onResponse', async (request: FastifyRequest, response: FastifyReply) => {
      metrics.handleResponse(request.routerPath, response.statusCode, request.metrics?.timer);
    });

    fastify.trackDbQuery = (operationType: string, startTime: [number, number]) => {
      const endtime = process.hrtime();
      metrics.handleDbMetric(operationType, startTime, endtime);
    };
    // Set the Fastify instance on PgStore for metrics tracking
    args.db.setFastify(fastify);
    args.brc20Db.setFastify(fastify);
  }

  await fastify.register(FastifyCors);
  await fastify.register(Api, { prefix: '/ordinals/v1' });
  await fastify.register(Api, { prefix: '/ordinals' });

  return fastify;
}

export async function buildPromServer(args: {
  metrics: IFastifyMetrics;
}): Promise<FastifyInstance> {
  const promServer = Fastify({
    trustProxy: true,
    logger: PINO_LOGGER_CONFIG,
  });

  const metricsHandler: RouteHandlerMethod = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    await reply.type('text/plain').send(await args.metrics.client.register.metrics());
  };

  promServer.route({
    url: '/metrics',
    method: 'GET',
    logLevel: 'info',
    handler: metricsHandler,
  });

  return promServer;
}
