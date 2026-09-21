import { createAlertSchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requirePermission } from '../../plugins/rbac';
import { createAlert, deactivateAlert, getAlert, listAlerts } from '../../services/alert.service';

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  // Public: active alerts are shown to everyone (banner + notifications).
  app.get('/alerts', async (request) => {
    const q = request.query as { activeOnly?: string; page?: string; pageSize?: string };
    const result = await listAlerts({
      activeOnly: q.activeOnly !== 'false',
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    });
    return success(result.items, null, { pagination: result.pagination });
  });

  app.get('/alerts/:id', async (request) => {
    const { id } = request.params as { id: string };
    const alert = await getAlert(id);
    return success(alert);
  });

  app.post(
    '/alerts',
    { preHandler: [app.authenticate, requirePermission('alert:create')] },
    async (request, reply) => {
      const input = validate(createAlertSchema, request.body);
      const alert = await createAlert(input, request.authUser!);
      reply.code(201);
      return success(alert, 'Alert published');
    },
  );

  app.delete(
    '/alerts/:id',
    { preHandler: [app.authenticate, requirePermission('alert:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      await deactivateAlert(id, request.authUser!);
      return success({ id }, 'Alert deactivated');
    },
  );
}
