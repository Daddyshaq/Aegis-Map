import { z } from 'zod';

/** Reusable primitive schemas shared across request/response validation. */

export const latitude = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

export const longitude = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

export const latLng = z.object({ lat: latitude, lng: longitude });

/**
 * Coercing variants of latitude/longitude for query-string sources, where every
 * value arrives as a string (e.g. `?minLat=9.05`). Body schemas keep the strict
 * `number` variants above, since JSON bodies carry real numbers.
 */
export const latitudeParam = z.coerce
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

export const longitudeParam = z.coerce
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

export const uuid = z.string().uuid('Invalid identifier');

export const isoDateTime = z.string().datetime({ offset: true });

export const email = z.string().trim().toLowerCase().email('Enter a valid email address');

export const nonEmpty = (label: string, max = 5000) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

/** Password policy: length + character diversity. */
export const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password is too long')
  .refine((v) => /[a-z]/.test(v), 'Include a lowercase letter')
  .refine((v) => /[A-Z]/.test(v), 'Include an uppercase letter')
  .refine((v) => /[0-9]/.test(v), 'Include a number');

export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');

/** Lowercase machine slug: letters, numbers and single hyphens. */
export const slugParam = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
