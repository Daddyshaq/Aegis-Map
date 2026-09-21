import { moderateReportSchema, reportQuerySchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { hashIp } from '../../lib/audit';
import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requirePermission } from '../../plugins/rbac';
import { listModerationQueue, moderateReport } from '../../services/moderation.service';

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/moderation/queue',
    { preHandler: [app.authenticate, requirePermission('moderation:view_queue')] },
    async (request) => {
      const query = validate(reportQuerySchema, request.query);
      const result = await listModerationQueue(query);
      return success(result.items, null, { pagination: result.pagination });
    },
  );

  app.post(
    '/moderation/reports/:id',
    { preHandler: [app.authenticate, requirePermission('moderation:act')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = validate(moderateReportSchema, request.body);
      const report = await moderateReport(id, input, request.authUser!, hashIp(request.ip));
      return success(report, 'Moderation action applied');
    },
  );
}
