import { CACHE_CONTROL_MUST_REVALIDATE, parseIfNoneMatchHeader } from '@hirosystems/api-toolkit';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function handleCache(request: FastifyRequest, reply: FastifyReply) {
  const ifNoneMatch = parseIfNoneMatchHeader(request.headers['if-none-match']);
  const etag = await request.server.db.getChainTipEtag();
  if (etag) {
    if (ifNoneMatch && ifNoneMatch.includes(etag)) {
      await reply.header('Cache-Control', CACHE_CONTROL_MUST_REVALIDATE).code(304).send();
    } else {
      void reply.headers({ 'Cache-Control': CACHE_CONTROL_MUST_REVALIDATE, ETag: `"${etag}"` });
    }
  }
}
