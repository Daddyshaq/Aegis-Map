import {
  safeLocationQuerySchema,
  safeLocationSchema,
  updateSafeLocationSchema,
} from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requirePermission } from '../../plugins/rbac';
import {
  createSafeLocation,
  deactivateSafeLocation,
  getSafeLocation,
  listSafeLocations,
  updateSafeLocation,
  verifySafeLocation,
} from '../../services/safeLocation.service';

export async function safeLocationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/safe-locations', async (request) => {
    const query = validate(safeLocationQuerySchema, request.query);
    const result = await listSafeLocations(query);
    return success(result.items, null, { pagination: result.pagination });
  });

  app.get('/safe-locations/:id', async (request) => {
    const { id } = request.params as { id: string };
    const location = await getSafeLocation(id);
    return success(location);
  });

  // Any authenticated user may suggest a safe location (pending review).
  app.post('/safe-locations', { preHandler: app.authenticate }, async (request, reply) => {
    const input = validate(safeLocationSchema, request.body);
    const location = await createSafeLocation(input, request.authUser!);
    reply.code(201);
    return success(location, 'Safe location submitted');
  });

  app.patch(
    '/safe-locations/:id',
    { preHandler: [app.authenticate, requirePermission('safe_location:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = validate(updateSafeLocationSchema, request.body);
      const location = await updateSafeLocation(id, input, request.authUser!);
      return success(location, 'Safe location updated');
    },
  );

  app.post(
    '/safe-locations/:id/verify',
    { preHandler: [app.authenticate, requirePermission('safe_location:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const location = await verifySafeLocation(id, request.authUser!);
      return success(location, 'Safe location verified');
    },
  );

  app.delete(
    '/safe-locations/:id',
    { preHandler: [app.authenticate, requirePermission('safe_location:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      await deactivateSafeLocation(id, request.authUser!);
      return success({ id }, 'Safe location removed');
    },
  );
}
