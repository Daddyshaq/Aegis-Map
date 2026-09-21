import { routeRequestSchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { getSafeRoutes } from '../../services/route.service';

export async function routingRoutes(app: FastifyInstance): Promise<void> {
  // Safe routing is available to everyone; auth is optional.
  app.post('/routes', { preHandler: app.optionalAuth }, async (request) => {
    const input = validate(routeRequestSchema, request.body);
    const routes = await getSafeRoutes(input);
    return success({
      routes,
      // Reinforce the advisory nature at the payload level.
      disclaimer:
        'Routes are advisory only and based on reported incidents. No route can be guaranteed safe.',
    });
  });
}
