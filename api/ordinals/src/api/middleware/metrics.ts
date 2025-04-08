import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiMetrics } from '../../metrics/metrics';

export function registerMetricsMiddleware(fastify: FastifyInstance, metrics: ApiMetrics) {
  // Expose metrics for routes
  fastify.decorate('metrics', metrics);

  // Add hooks for request timing and counting
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.metrics = {
      startTime: process.hrtime(),
    };

    // Determine API category based on path
    const path = request.routeOptions.url;
    let category = 'other';

    if (path.includes('/inscriptions/')) {
      category = 'inscriptions';
    } else if (path.includes('/sats/')) {
      category = 'satoshi';
    } else if (path.includes('/brc-20/')) {
      category = 'brc20';

      // Track BRC-20 specific requests
      let endpointType = 'other';
      if (path.includes('/tokens')) {
        endpointType = 'tokens';
      } else if (path.includes('/balances')) {
        endpointType = 'balances';
      } else if (path.includes('/activity')) {
        endpointType = 'activity';
      }
      metrics.brc20_api_request_count.inc({ endpoint_type: endpointType });
    } else if (path.includes('/stats')) {
      category = 'stats';
    } else if (path.includes('/status')) {
      category = 'status';
    }

    // Store category for later use
    request.metrics.category = category;

    // Track request rate
    metrics.ordinals_api_request_rate.inc({ category });
  });

  // Add hook for response timing and status tracking
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.metrics?.startTime) {
      const diff = process.hrtime(request.metrics.startTime);
      const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

      const category = request.metrics.category || 'other';

      // Map status code to class (2xx, 4xx, 5xx) to have fewer labels
      // keeping the cardinality lower
      const statusCodeClass = `${Math.floor(reply.statusCode / 100)}xx`;

      // Record request duration
      metrics.ordinals_api_request_duration.observe(
        {
          category,
          status_code_class: statusCodeClass,
        },
        time
      );

      // Track errors
      if (reply.statusCode >= 400) {
        const error_class = reply.statusCode >= 500 ? 'server' : 'client';
        metrics.ordinals_api_error_rate.inc({ category, error_class });
      }
    }
  });

  // Track database query durations
  fastify.decorate('trackDbQuery', (operationType: string, startTime: [number, number]) => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds
    metrics.ordinals_api_db_query_duration.observe({ operation_type: operationType }, time);
  });
}

// Extend FastifyRequest to include metrics
declare module 'fastify' {
  interface FastifyRequest {
    metrics?: {
      startTime: [number, number];
      category?: string;
    };
  }
}
