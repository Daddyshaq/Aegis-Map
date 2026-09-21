import { mapBoundsSchema } from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import { getMapFeatures } from '../../services/report.service';

/** Lightweight, public map feature endpoint (no PII in the payload). */
export async function mapRoutes(app: FastifyInstance): Promise<void> {
  app.get('/map', async (request) => {
    const bounds = validate(mapBoundsSchema, request.query);
    const features = await getMapFeatures(bounds);
    return success(features);
  });
}
