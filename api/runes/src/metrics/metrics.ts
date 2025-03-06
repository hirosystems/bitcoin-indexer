import * as prom from 'prom-client';
import { PgStore } from '../pg/pg-store';

export class ApiMetrics {
  /** The most recent Bitcoin block height ingested by the API */
  readonly runes_api_block_height: prom.Gauge;

  static configure(db: PgStore): ApiMetrics {
    return new ApiMetrics(db);
  }

  private constructor(db: PgStore) {
    this.runes_api_block_height = new prom.Gauge({
      name: `runes_api_block_height`,
      help: 'The most recent Bitcoin block height ingested by the API',
      async collect() {
        const height = await db.getChainTipBlockHeight();
        this.set(parseInt(height ?? '0'));
      },
    });
  }
}
