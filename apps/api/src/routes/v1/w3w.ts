import type { FastifyInstance } from 'fastify';

import { badRequest } from '../../lib/errors';
import { success } from '../../lib/response';
import { w3wService } from '../../services/w3w.service';

export async function w3wRoutes(app: FastifyInstance): Promise<void> {
  // Convert 3 words to coordinates
  app.get('/w3w/convert-to-coordinates', async (request) => {
    const { words } = request.query as { words?: string };
    if (!words || words.trim().length === 0) {
      throw badRequest('Query parameter "words" is required (e.g. ///filled.count.soap)');
    }
    const result = await w3wService.convertToCoordinates(words.trim());
    return success(result);
  });

  // Convert lat/lng to 3 words
  app.get('/w3w/convert-to-3wa', async (request) => {
    const { lat, lng } = request.query as { lat?: string; lng?: string };
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      throw badRequest('Valid "lat" and "lng" query parameters are required');
    }
    const result = await w3wService.convertTo3wa(latN, lngN);
    return success(result);
  });

  // Autosuggest 3-word addresses
  app.get('/w3w/autosuggest', async (request) => {
    const { input } = request.query as { input?: string };
    if (!input || input.trim().length === 0) {
      return success([]);
    }
    const suggestions = await w3wService.autosuggest(input.trim());
    return success(suggestions);
  });
}
