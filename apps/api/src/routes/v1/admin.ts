import type { AppRole } from '@crisis/types';
import {
  auditLogQuerySchema,
  suspendUserSchema,
  systemSettingSchema,
  updateUserRoleSchema,
} from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { hashIp } from '../../lib/audit';
import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requirePermission } from '../../plugins/rbac';
import {
  getDashboardStats,
  listAuditLogs,
  listSettings,
  listUsers,
  setUserStatus,
  updateSetting,
  updateUserRole,
} from '../../services/admin.service';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/admin/stats', { preHandler: requirePermission('analytics:view') }, async () => {
    const stats = await getDashboardStats();
    return success(stats);
  });

  app.get('/admin/users', { preHandler: requirePermission('user:manage') }, async (request) => {
    const q = request.query as { page?: string; pageSize?: string; q?: string; role?: string };
    const result = await listUsers({
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      q: q.q,
      role: q.role as AppRole | undefined,
    });
    return success(result.items, null, { pagination: result.pagination });
  });

  app.patch(
    '/admin/users/:id/role',
    { preHandler: requirePermission('moderator:manage') },
    async (request) => {
      const { id } = request.params as { id: string };
      const { role } = validate(updateUserRoleSchema, request.body);
      const user = await updateUserRole(id, role, request.authUser!, hashIp(request.ip));
      return success(user, 'Role updated');
    },
  );

  app.patch(
    '/admin/users/:id/status',
    { preHandler: requirePermission('user:suspend') },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = validate(suspendUserSchema, request.body);
      const user = await setUserStatus(id, input, request.authUser!, hashIp(request.ip));
      return success(user, 'Account status updated');
    },
  );

  app.get('/admin/settings', { preHandler: requirePermission('settings:manage') }, async () => {
    const settings = await listSettings();
    return success(settings);
  });

  app.put(
    '/admin/settings/:key',
    { preHandler: requirePermission('settings:manage') },
    async (request) => {
      const { key } = request.params as { key: string };
      const input = validate(systemSettingSchema, request.body);
      const setting = await updateSetting(key, input, request.authUser!);
      return success(setting, 'Setting saved');
    },
  );

  app.get('/admin/audit', { preHandler: requirePermission('audit:view') }, async (request) => {
    const query = validate(auditLogQuerySchema, request.query);
    const result = await listAuditLogs(query);
    return success(result.items, null, { pagination: result.pagination });
  });
}
