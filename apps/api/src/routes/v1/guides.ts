import { emergencyGuideSchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requirePermission } from '../../plugins/rbac';
import {
  createGuide,
  deleteGuide,
  getGuideBySlug,
  listAllGuides,
  listPublishedGuides,
  updateGuide,
} from '../../services/guide.service';

export async function guideRoutes(app: FastifyInstance): Promise<void> {
  // Public: published emergency guides.
  app.get('/guides', async () => {
    const guides = await listPublishedGuides();
    return success(guides);
  });

  app.get('/guides/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    const guide = await getGuideBySlug(slug);
    return success(guide);
  });

  // Admin: manage the full catalogue (including drafts).
  app.get(
    '/admin/guides',
    { preHandler: [app.authenticate, requirePermission('guide:manage')] },
    async () => {
      const guides = await listAllGuides();
      return success(guides);
    },
  );

  app.post(
    '/admin/guides',
    { preHandler: [app.authenticate, requirePermission('guide:manage')] },
    async (request, reply) => {
      const input = validate(emergencyGuideSchema, request.body);
      const guide = await createGuide(input, request.authUser!);
      reply.code(201);
      return success(guide, 'Guide created');
    },
  );

  app.patch(
    '/admin/guides/:id',
    { preHandler: [app.authenticate, requirePermission('guide:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = validate(emergencyGuideSchema.partial(), request.body);
      const guide = await updateGuide(id, input, request.authUser!);
      return success(guide, 'Guide updated');
    },
  );

  app.delete(
    '/admin/guides/:id',
    { preHandler: [app.authenticate, requirePermission('guide:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      await deleteGuide(id, request.authUser!);
      return success({ id }, 'Guide deleted');
    },
  );
}
