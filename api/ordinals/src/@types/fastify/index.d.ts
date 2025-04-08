import fastify from 'fastify';
import { PgStore } from '../../pg/pg-store';
import { Brc20PgStore } from '../../pg/brc20/brc20-pg-store';
import { ApiMetrics } from '../../metrics/metrics';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse,
    Logger = FastifyLoggerInstance,
    TypeProvider = FastifyTypeProviderDefault
  > {
    db: PgStore;
    brc20Db: Brc20PgStore;
    metrics?: ApiMetrics;
    trackDbQuery: (operationType: string, startTime: [number, number]) => void;
  }
}
