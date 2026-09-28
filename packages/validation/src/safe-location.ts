import {
  ALERT_TYPES,
  OPERATING_STATUSES,
  SAFE_LOCATION_TYPES,
  type AlertType,
  type OperatingStatus,
  type SafeLocationType,
} from '@crisis/types';
import { z } from 'zod';

import { severitySchema } from './crisis';
import {
  isoDateTime,
  latitude,
  latitudeParam,
  longitude,
  longitudeParam,
  nonEmpty,
  phone,
} from './primitives';

const tuple = <T extends string>(values: T[]) => values as [T, ...T[]];

export const safeLocationTypeSchema = z.enum(tuple<SafeLocationType>(SAFE_LOCATION_TYPES));
export const operatingStatusSchema = z.enum(tuple<OperatingStatus>(OPERATING_STATUSES));
export const alertTypeSchema = z.enum(tuple<AlertType>(ALERT_TYPES));

export const safeLocationSchema = z.object({
  name: nonEmpty('Name', 160),
  description: z.string().trim().max(2000).optional().nullable(),
  type: safeLocationTypeSchema,
  lat: latitude,
  lng: longitude,
  address: z.string().trim().max(320).optional().nullable(),
  phone: phone.optional().or(z.literal('')).nullable(),
  capacity: z.number().int().nonnegative().max(1_000_000).optional().nullable(),
  operatingStatus: operatingStatusSchema.default('UNKNOWN'),
  openingHours: z.string().trim().max(240).optional().nullable(),
  facilities: z.array(z.string().trim().max(64)).max(30).default([]),
});

export const updateSafeLocationSchema = safeLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const safeLocationQuerySchema = z.object({
  type: safeLocationTypeSchema.optional(),
  lat: latitudeParam.optional(),
  lng: longitudeParam.optional(),
  radiusKm: z.coerce.number().min(0.1).max(500).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createAlertSchema = z
  .object({
    type: alertTypeSchema,
    title: nonEmpty('Title', 160),
    body: nonEmpty('Body', 4000),
    severity: severitySchema,
    centerLat: latitude.optional().nullable(),
    centerLng: longitude.optional().nullable(),
    radiusKm: z.number().min(0.1).max(1000).optional().nullable(),
    expiresAt: isoDateTime.optional().nullable(),
  })
  .refine((d) => (d.centerLat == null) === (d.centerLng == null), {
    path: ['centerLng'],
    message: 'Provide both centre coordinates or neither',
  });

export type SafeLocationInput = z.infer<typeof safeLocationSchema>;
export type UpdateSafeLocationInput = z.infer<typeof updateSafeLocationSchema>;
export type SafeLocationQueryInput = z.infer<typeof safeLocationQuerySchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
