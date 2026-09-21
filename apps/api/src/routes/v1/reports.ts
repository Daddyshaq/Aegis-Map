import { createReportSchema, registerEvidenceSchema, reportQuerySchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { badRequest } from '../../lib/errors';
import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { requireModerator } from '../../plugins/rbac';
import {
  checkDuplicates,
  corroborateReport,
  createReport,
  getMyReports,
  getReportById,
  getReportVerifications,
  listReports,
  registerEvidence,
  uploadEvidence,
} from '../../services/report.service';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  // Public list (optional auth widens visibility for moderators).
  app.get('/reports', { preHandler: app.optionalAuth }, async (request) => {
    const query = validate(reportQuerySchema, request.query);
    const result = await listReports(query, request.authUser);
    return success(result.items, null, { pagination: result.pagination });
  });

  app.get('/reports/mine', { preHandler: app.authenticate }, async (request) => {
    const query = validate(reportQuerySchema, request.query);
    const result = await getMyReports(request.authUser!.id, query);
    return success(result.items, null, { pagination: result.pagination });
  });

  app.post('/reports', { preHandler: app.authenticate }, async (request, reply) => {
    const input = validate(createReportSchema, request.body);
    const report = await createReport(input, request.authUser!);
    reply.code(201);
    return success(report, 'Report submitted');
  });

  app.post('/reports/check-duplicates', { preHandler: app.authenticate }, async (request) => {
    const input = validate(createReportSchema, request.body);
    const candidates = await checkDuplicates(input);
    return success(candidates);
  });

  app.get('/reports/:id', { preHandler: app.optionalAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const report = await getReportById(id, request.authUser);
    return success(report);
  });

  app.post('/reports/:id/corroborate', { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const report = await corroborateReport(id, request.authUser!);
    return success(report, 'Thank you — your corroboration was recorded');
  });

  // Multipart evidence upload (validated + stored server-side).
  app.post('/reports/:id/evidence', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await request.file();
    if (!file) throw badRequest('No file was provided');
    const buffer = await file.toBuffer();
    const evidence = await uploadEvidence(id, request.authUser!, {
      buffer,
      mimeType: file.mimetype,
      filename: file.filename,
    });
    reply.code(201);
    return success(evidence, 'Evidence uploaded');
  });

  // Register evidence uploaded directly to storage (client-signed uploads).
  app.post(
    '/reports/:id/evidence/register',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = validate(registerEvidenceSchema, request.body);
      await registerEvidence(id, input, request.authUser!);
      reply.code(201);
      return success({ ok: true }, 'Evidence registered');
    },
  );

  app.get(
    '/reports/:id/verifications',
    { preHandler: [app.authenticate, requireModerator] },
    async (request) => {
      const { id } = request.params as { id: string };
      const verifications = await getReportVerifications(id);
      return success(verifications);
    },
  );
}
