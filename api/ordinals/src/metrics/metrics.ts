import * as prom from 'prom-client';
import { PgStore } from '../pg/pg-store';
import { convertInMs } from '../api/util/helpers';

export class ApiMetrics {
  /** The most recent Bitcoin block height ingested by the API */
  readonly ordinals_api_block_height: prom.Gauge;
  /** Maximum blessed inscription number */
  readonly ordinals_api_max_inscription_number: prom.Gauge;
  /** Maximum cursed inscription number */
  readonly ordinals_api_max_cursed_inscription_number: prom.Gauge;

  // API performance metrics
  readonly ordinals_api_request_duration: prom.Histogram;
  readonly ordinals_api_request_rate: prom.Counter;
  readonly ordinals_api_error_rate: prom.Counter;
  readonly ordinals_api_db_query_duration: prom.Histogram;

  // Domain-specific metrics
  readonly brc20_api_request_count: prom.Counter;

  static configure(db: PgStore): ApiMetrics {
    return new ApiMetrics(db);
  }

  private constructor(db: PgStore) {
    this.ordinals_api_block_height = new prom.Gauge({
      name: `ordinals_api_block_height`,
      help: 'The most recent Bitcoin block height ingested by the API',
      async collect() {
        const height = await db.getChainTipBlockHeight();
        this.set(height ?? 0);
      },
    });
    this.ordinals_api_max_inscription_number = new prom.Gauge({
      name: `ordinals_api_max_inscription_number`,
      help: 'Maximum blessed inscription number',
      async collect() {
        const max = await db.getMaxInscriptionNumber();
        if (max) this.set(max);
      },
    });
    this.ordinals_api_max_cursed_inscription_number = new prom.Gauge({
      name: `ordinals_api_max_cursed_inscription_number`,
      help: 'Maximum cursed inscription number',
      async collect() {
        const max = await db.getMaxCursedInscriptionNumber();
        if (max) this.set(max);
      },
    });

    // API performance metrics initialization
    this.ordinals_api_request_duration = new prom.Histogram({
      name: 'ordinals_api_request_duration_ms',
      help: 'Duration of Ordinals API requests in milliseconds',
      labelNames: ['category', 'status_code_class'],
      buckets: [10, 100, 500, 1_000, 5_000, 10_000, 50_000],
    });

    this.ordinals_api_request_rate = new prom.Counter({
      name: 'ordinals_api_request_rate',
      help: 'Rate of requests to the Ordinals API',
      labelNames: ['category'],
    });

    this.ordinals_api_error_rate = new prom.Counter({
      name: 'ordinals_api_error_rate',
      help: 'Rate of errors from the Ordinals API',
      labelNames: ['category', 'error_class'],
    });

    this.ordinals_api_db_query_duration = new prom.Histogram({
      name: 'ordinals_api_db_query_duration_ms',
      help: 'Duration of Ordinals API database queries in milliseconds',
      labelNames: ['operation_type'],
      buckets: [10, 100, 500, 1_000, 5_000, 10_000, 50_000],
    });

    // BRC-20 specific metrics
    this.brc20_api_request_count = new prom.Counter({
      name: 'brc20_api_request_count',
      help: 'Count of BRC-20 API requests',
      labelNames: ['endpoint_type'], // tokens, balances, transfers
    });
  }

  handleMetric(route: string) {
    this.ordinals_api_request_rate.inc({ category: route });
    return this.ordinals_api_request_duration.startTimer();
  }

  handleResponse(route: string, statusCode: number, timer: any) {
    const errorClass = statusCode >= 400 ? (statusCode >= 500 ? 'client' : 'server') : false;

    if (errorClass) {
      this.ordinals_api_error_rate.inc({ error_class: errorClass }, 1);
    }

    const time: number = timer({
      category: route,
      status_code_class: statusCode,
    });

    this.ordinals_api_request_duration.observe(
      { category: route, status_code_class: statusCode },
      time
    );
  }

  handleDbMetric(operationType: string, startTime: [number, number], endTime: [number, number]) {
    //convert to ms
    const startInMs = convertInMs(startTime);
    const endTimeMs = convertInMs(endTime);
    const durationInMs = endTimeMs - startInMs;
    this.ordinals_api_db_query_duration.observe(
      {
        operation_type: operationType,
      },
      durationInMs
    );
  }
}
