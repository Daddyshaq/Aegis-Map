import {
  notificationPreferencesSchema,
  pushSubscriptionSchema,
  savedLocationSchema,
  updateProfileSchema,
} from '@crisis/validation';
import type { FastifyInstance } from 'fastify';

import { badRequest } from '../../lib/errors';
import { success } from '../../lib/response';
import { validate } from '../../lib/validate';
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from '../../services/push.service';
import {
  createSavedLocation,
  deleteSavedLocation,
  getNotificationPreferences,
  getProfile,
  listSavedLocations,
  updateNotificationPreferences,
  updateProfile,
} from '../../services/user.service';

/** Routes scoped to the currently-authenticated user. */
export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/me', async (request) => {
    const user = request.authUser!;
    const profile = await getProfile(user.id);
    return success(profile);
  });

  app.patch('/me/profile', async (request) => {
    const user = request.authUser!;
    const input = validate(updateProfileSchema, request.body);
    const profile = await updateProfile(user.id, input);
    return success(profile, 'Profile updated');
  });

  app.get('/me/preferences', async (request) => {
    const prefs = await getNotificationPreferences(request.authUser!.id);
    return success(prefs);
  });

  app.put('/me/preferences', async (request) => {
    const input = validate(notificationPreferencesSchema, request.body);
    const prefs = await updateNotificationPreferences(request.authUser!.id, input);
    return success(prefs, 'Preferences saved');
  });

  app.get('/me/locations', async (request) => {
    const locations = await listSavedLocations(request.authUser!.id);
    return success(locations);
  });

  app.post('/me/locations', async (request, reply) => {
    const input = validate(savedLocationSchema, request.body);
    const location = await createSavedLocation(request.authUser!.id, input);
    reply.code(201);
    return success(location, 'Location saved');
  });

  app.delete('/me/locations/:id', async (request) => {
    const { id } = request.params as { id: string };
    await deleteSavedLocation(request.authUser!.id, id);
    return success({ id }, 'Location removed');
  });

  // ---- Web Push subscription management ----
  app.get('/me/push/key', async () => {
    return success({ publicKey: getVapidPublicKey() });
  });

  app.post('/me/push/subscribe', async (request, reply) => {
    const input = validate(pushSubscriptionSchema, request.body);
    await savePushSubscription(request.authUser!.id, input);
    reply.code(201);
    return success({ ok: true }, 'Push subscription registered');
  });

  app.post('/me/push/unsubscribe', async (request) => {
    const body = request.body as { endpoint?: string };
    if (!body?.endpoint) throw badRequest('Missing subscription endpoint');
    await removePushSubscription(request.authUser!.id, body.endpoint);
    return success({ ok: true }, 'Push subscription removed');
  });
}
