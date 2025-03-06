import { Static, Type } from '@sinclair/typebox';
import envSchema from 'env-schema';

const schema = Type.Object({
  /** Hostname of the API server */
  API_HOST: Type.String({ default: '0.0.0.0' }),
  /** Port in which to serve the API */
  API_PORT: Type.Number({ default: 3000, minimum: 0, maximum: 65535 }),
  /** Port in which to serve the Admin RPC interface */
  ADMIN_RPC_PORT: Type.Number({ default: 3001, minimum: 0, maximum: 65535 }),

  RUNES_PGHOST: Type.String(),
  RUNES_PGPORT: Type.Number({ default: 5432, minimum: 0, maximum: 65535 }),
  RUNES_PGUSER: Type.String(),
  RUNES_PGPASSWORD: Type.String(),
  RUNES_PGDATABASE: Type.String(),

  /** Limit to how many concurrent connections can be created */
  PG_CONNECTION_POOL_MAX: Type.Number({ default: 10 }),
  PG_IDLE_TIMEOUT: Type.Number({ default: 30 }),
  PG_MAX_LIFETIME: Type.Number({ default: 60 }),
  PG_STATEMENT_TIMEOUT: Type.Number({ default: 60_000 }),
});
type Env = Static<typeof schema>;

export const ENV = envSchema<Env>({
  schema: schema,
  dotenv: true,
});
