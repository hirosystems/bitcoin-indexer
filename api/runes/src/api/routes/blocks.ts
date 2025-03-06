import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { FastifyPluginCallback } from 'fastify';
import { Server } from 'http';
import { LimitSchema, OffsetSchema, ActivityResponseSchema, BlockSchema } from '../schemas';
import { parseActivityResponse } from '../util/helpers';
import { Optional, PaginatedResponse } from '@hirosystems/api-toolkit';
import { handleCache } from '../util/cache';

export const BlockRoutes: FastifyPluginCallback<
  Record<never, never>,
  Server,
  TypeBoxTypeProvider
> = (fastify, options, done) => {
  fastify.addHook('preHandler', handleCache);

  fastify.get(
    '/blocks/:block/activity',
    {
      schema: {
        operationId: 'getBlockActivity',
        summary: 'Block activity',
        description: 'Retrieves a paginated list of rune activity for a block',
        tags: ['Activity'],
        params: Type.Object({
          block: BlockSchema,
        }),
        querystring: Type.Object({
          offset: Optional(OffsetSchema),
          limit: Optional(LimitSchema),
        }),
        response: {
          200: PaginatedResponse(ActivityResponseSchema, 'Paginated activity response'),
        },
      },
    },
    async (request, reply) => {
      const offset = request.query.offset ?? 0;
      const limit = request.query.limit ?? 20;
      const results = await fastify.db.getBlockActivity(request.params.block, offset, limit);
      await reply.send({
        limit,
        offset,
        total: results.total,
        results: results.results.map(r => parseActivityResponse(r)),
      });
    }
  );

  done();
};
