import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '../../services/notification.service';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/notifications', async (request) => {
    const q = request.query as { page?: string; pageSize?: string; unreadOnly?: string };
    const result = await listNotifications(request.authUser!.id, {
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      unreadOnly: q.unreadOnly === 'true',
    });
    return success(result.items, null, { pagination: result.pagination });
  });

  app.get('/notifications/unread-count', async (request) => {
    const count = await unreadCount(request.authUser!.id);
    return success({ count });
  });

  app.post('/notifications/:id/read', async (request) => {
    const { id } = request.params as { id: string };
    await markRead(request.authUser!.id, id);
    return success({ id });
  });

  app.post('/notifications/read-all', async (request) => {
    await markAllRead(request.authUser!.id);
    return success({ ok: true });
  });
}
