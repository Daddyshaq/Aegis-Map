import type { FastifyInstance } from 'fastify';

import { badRequest } from '../../lib/errors';
import { success } from '../../lib/response';
import { getGeocodingProvider } from '../../services/geocoding';

export async function geoRoutes(app: FastifyInstance): Promise<void> {
  // Forward geocoding (place search). Auth optional; lightly rate-limited globally.
  app.get('/geo/search', async (request) => {
    const { q, limit } = request.query as { q?: string; limit?: string };
    if (!q || q.trim().length < 2)
      throw badRequest('A search query of at least 2 characters is required');
    const results = await getGeocodingProvider().search(q.trim(), limit ? Number(limit) : 5);
    return success(results);
  });

  app.get('/geo/reverse', async (request) => {
    const { lat, lng } = request.query as { lat?: string; lng?: string };
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      throw badRequest('Valid lat and lng query parameters are required');
    }
    const result = await getGeocodingProvider().reverse(latN, lngN);
    return success(result);
  });
}
