import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => success({ status: 'ok', service: 'aegis-map-api' }));

  app.get('/ready', async () => {
    // Lightweight readiness probe. DB connectivity is validated at boot.
    return success({ status: 'ready' });
  });
}
