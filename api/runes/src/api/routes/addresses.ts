import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { FastifyPluginCallback } from 'fastify';
import { Server } from 'http';
import {
  AddressSchema,
  LimitSchema,
  OffsetSchema,
  BalanceResponseSchema,
  ActivityResponseSchema,
} from '../schemas';
import { parseActivityResponse, parseBalanceResponse } from '../util/helpers';
import { Optional, PaginatedResponse } from '@hirosystems/api-toolkit';
import { handleCache } from '../util/cache';

export const AddressRoutes: FastifyPluginCallback<
  Record<never, never>,
  Server,
  TypeBoxTypeProvider
> = (fastify, options, done) => {
  fastify.addHook('preHandler', handleCache);

  fastify.get(
    '/addresses/:address/balances',
    {
      schema: {
        operationId: 'getAddressBalances',
        summary: 'Address balances',
        description: 'Retrieves a paginated list of address balances',
        tags: ['Balances'],
        params: Type.Object({
          address: AddressSchema,
        }),
        querystring: Type.Object({
          offset: Optional(OffsetSchema),
          limit: Optional(LimitSchema),
        }),
        response: {
          200: PaginatedResponse(BalanceResponseSchema, 'Paginated balances response'),
        },
      },
    },
    async (request, reply) => {
      const offset = request.query.offset ?? 0;
      const limit = request.query.limit ?? 20;
      const results = await fastify.db.getAddressBalances(request.params.address, offset, limit);
      await reply.send({
        limit,
        offset,
        total: results.total,
        results: results.results.map(r => parseBalanceResponse(r)),
      });
    }
  );

  fastify.get(
    '/addresses/:address/activity',
    {
      schema: {
        operationId: 'getAddressActivity',
        summary: 'Address activity',
        description: 'Retrieves a paginated list of rune activity for an address',
        tags: ['Activity'],
        params: Type.Object({
          address: AddressSchema,
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
      const results = await fastify.db.getAddressActivity(request.params.address, offset, limit);
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
