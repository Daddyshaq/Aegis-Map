import { APP_ROLES, type AppRole } from '@crisis/types';
import { z } from 'zod';

import { nonEmpty, slugParam } from './primitives';

const tuple = <T extends string>(values: T[]) => values as [T, ...T[]];
export const roleSchema = z.enum(tuple<AppRole>(APP_ROLES));

export const crisisCategorySchema = z.object({
  slug: slugParam,
  name: nonEmpty('Name', 80),
  description: z.string().trim().max(500).optional().nullable(),
  icon: nonEmpty('Icon', 60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #dc2626'),
  defaultTtlHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCrisisCategorySchema = crisisCategorySchema.partial();

export const updateUserRoleSchema = z.object({
  role: roleSchema,
});

export const suspendUserSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  reason: z.string().trim().max(500).optional(),
});

export const systemSettingSchema = z.object({
  value: z.unknown(),
  description: z.string().trim().max(300).optional().nullable(),
});

export const emergencyGuideSchema = z.object({
  slug: slugParam,
  title: nonEmpty('Title', 160),
  summary: nonEmpty('Summary', 400),
  content: nonEmpty('Content', 50_000),
  icon: nonEmpty('Icon', 60),
  categorySlug: z.string().trim().max(80).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
});

export const auditLogQuerySchema = z.object({
  action: z.string().trim().max(80).optional(),
  resourceType: z.string().trim().max(80).optional(),
  actorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type CrisisCategoryInput = z.infer<typeof crisisCategorySchema>;
export type UpdateCrisisCategoryInput = z.infer<typeof updateCrisisCategorySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type SystemSettingInput = z.infer<typeof systemSettingSchema>;
export type EmergencyGuideInput = z.infer<typeof emergencyGuideSchema>;
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
