import type { FastifyInstance } from 'fastify';

import { adminRoutes } from './admin';
import { alertRoutes } from './alerts';
import { categoryRoutes } from './categories';
import { geoRoutes } from './geo';
import { guideRoutes } from './guides';
import { healthRoutes } from './health';
import { mapRoutes } from './map';
import { meRoutes } from './me';
import { moderationRoutes } from './moderation';
import { notificationRoutes } from './notifications';
import { reportRoutes } from './reports';
import { routingRoutes } from './routing';
import { safeLocationRoutes } from './safe-locations';

/** Register all v1 routes. Mounted under `/api/v1` by the app. */
export async function registerV1Routes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(reportRoutes);
  await app.register(mapRoutes);
  await app.register(categoryRoutes);
  await app.register(safeLocationRoutes);
  await app.register(routingRoutes);
  await app.register(alertRoutes);
  await app.register(notificationRoutes);
  await app.register(moderationRoutes);
  await app.register(adminRoutes);
  await app.register(guideRoutes);
  await app.register(geoRoutes);
}
