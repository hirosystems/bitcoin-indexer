import fastify from 'fastify';
import { PgStore } from '../../pg/pg-store';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse,
    Logger = FastifyLoggerInstance,
    TypeProvider = FastifyTypeProviderDefault
  > {
    db: PgStore;
  }
}
