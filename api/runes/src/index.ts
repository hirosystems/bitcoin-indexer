import { isProdEnv, logger, registerShutdownConfig } from '@hirosystems/api-toolkit';
import { buildApiServer, buildPrometheusServer } from './api/init';
import { ENV } from './env';
import { PgStore } from './pg/pg-store';
import { ApiMetrics } from './metrics/metrics';

async function initApiService(db: PgStore) {
  logger.info('Initializing API service...');
  const fastify = await buildApiServer({ db });
  registerShutdownConfig({
    name: 'API Server',
    forceKillable: false,
    handler: async () => {
      await fastify.close();
    },
  });

  await fastify.listen({ host: ENV.API_HOST, port: ENV.API_PORT });

  if (isProdEnv) {
    const promServer = await buildPrometheusServer({ metrics: fastify.metrics });
    registerShutdownConfig({
      name: 'Prometheus Server',
      forceKillable: false,
      handler: async () => {
        await promServer.close();
      },
    });
    ApiMetrics.configure(db);
    await promServer.listen({ host: ENV.API_HOST, port: 9153 });
  }
}

async function initApp() {
  const db = await PgStore.connect();
  await initApiService(db);

  registerShutdownConfig({
    name: 'DB',
    forceKillable: false,
    handler: async () => {
      await db.close();
    },
  });
}

registerShutdownConfig();
initApp()
  .then(() => {
    logger.info('App initialized');
  })
  .catch(error => {
    logger.error(error, `App failed to start`);
    process.exit(1);
  });
