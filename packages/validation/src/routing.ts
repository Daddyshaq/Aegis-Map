import { ALERT_RADIUS_OPTIONS_KM } from '@crisis/config';
import { z } from 'zod';

import { severitySchema } from './crisis';
import { latLng } from './primitives';

export const routeRequestSchema = z.object({
  origin: latLng,
  destination: latLng,
  profile: z.enum(['driving', 'walking', 'cycling']).default('driving'),
  avoidCrisisZones: z.boolean().default(true),
});

export const notificationPreferencesSchema = z.object({
  emergencyAlerts: z.boolean(),
  nearbyCrisisAlerts: z.boolean(),
  reportStatusUpdates: z.boolean(),
  safeLocationUpdates: z.boolean(),
  systemNotifications: z.boolean(),
  minSeverity: severitySchema,
  radiusKm: z.number().refine((v) => (ALERT_RADIUS_OPTIONS_KM as readonly number[]).includes(v), {
    message: 'Unsupported alert radius',
  }),
  pushEnabled: z.boolean(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
});

export const savedLocationSchema = z.object({
  label: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(320).optional().nullable(),
});

export type RouteRequestInput = z.infer<typeof routeRequestSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type SavedLocationInput = z.infer<typeof savedLocationSchema>;
