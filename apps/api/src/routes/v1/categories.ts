import { crisisCategorySchema, updateCrisisCategorySchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requirePermission } from '../../plugins/rbac';
import { createCategory, listCategories, updateCategory } from '../../services/admin.service';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  // Public: active categories power the report form and map legend.
  app.get('/categories', async (request) => {
    const includeInactive =
      (request.query as { includeInactive?: string }).includeInactive === 'true';
    const categories = await listCategories(includeInactive);
    return success(categories);
  });

  app.post(
    '/categories',
    { preHandler: [app.authenticate, requirePermission('category:manage')] },
    async (request, reply) => {
      const input = validate(crisisCategorySchema, request.body);
      const category = await createCategory(input, request.authUser!);
      reply.code(201);
      return success(category, 'Category created');
    },
  );

  app.patch(
    '/categories/:id',
    { preHandler: [app.authenticate, requirePermission('category:manage')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = validate(updateCrisisCategorySchema, request.body);
      const category = await updateCategory(id, input, request.authUser!);
      return success(category, 'Category updated');
    },
  );
}
