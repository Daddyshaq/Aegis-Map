import {
  CRISIS_STATUSES,
  EVIDENCE_KINDS,
  MODERATION_ACTIONS,
  SEVERITIES,
  VERIFICATION_STATUSES,
  type CrisisStatus,
  type EvidenceKind,
  type ModerationAction,
  type Severity,
  type VerificationStatus,
} from '@crisis/types';
import { z } from 'zod';

import { isoDateTime, latitude, latitudeParam, longitude, longitudeParam, nonEmpty, uuid } from './primitives';

const tuple = <T extends string>(values: T[]) => values as [T, ...T[]];

export const severitySchema = z.enum(tuple<Severity>(SEVERITIES));
export const verificationStatusSchema = z.enum(tuple<VerificationStatus>(VERIFICATION_STATUSES));
export const crisisStatusSchema = z.enum(tuple<CrisisStatus>(CRISIS_STATUSES));
export const moderationActionSchema = z.enum(tuple<ModerationAction>(MODERATION_ACTIONS));
export const evidenceKindSchema = z.enum(tuple<EvidenceKind>(EVIDENCE_KINDS));

export const createReportSchema = z.object({
  categoryId: uuid,
  title: nonEmpty('Title', 160),
  description: nonEmpty('Description', 5000),
  severity: severitySchema,
  lat: latitude,
  lng: longitude,
  locationName: z.string().trim().max(240).optional().nullable(),
  reportedAt: isoDateTime.optional(),
  isAnonymous: z.boolean().default(false),
  /** When set, the citizen confirmed this is NOT a duplicate of the given id. */
  notDuplicateOf: uuid.optional(),
});

/** Uploaded evidence is registered after the file lands in storage. */
export const registerEvidenceSchema = z.object({
  kind: evidenceKindSchema,
  storagePath: nonEmpty('Storage path', 512),
  mimeType: nonEmpty('MIME type', 128),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
});

export const moderateReportSchema = z
  .object({
    action: moderationActionSchema,
    notes: z.string().trim().max(2000).optional(),
    severity: severitySchema.optional(),
    duplicateOfId: uuid.optional(),
  })
  .refine((d) => d.action !== 'MARK_DUPLICATE' || !!d.duplicateOfId, {
    path: ['duplicateOfId'],
    message: 'A duplicate target report is required',
  })
  .refine((d) => d.action !== 'ASSIGN_SEVERITY' || !!d.severity, {
    path: ['severity'],
    message: 'A severity is required for this action',
  });

export const reportQuerySchema = z.object({
  status: verificationStatusSchema.optional(),
  crisisStatus: crisisStatusSchema.optional(),
  categoryId: uuid.optional(),
  severity: severitySchema.optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Bounding-box query used by the map endpoint. */
export const mapBoundsSchema = z.object({
  minLat: latitudeParam,
  minLng: longitudeParam,
  maxLat: latitudeParam,
  maxLng: longitudeParam,
  categoryId: uuid.optional(),
  minSeverity: severitySchema.optional(),
  verifiedOnly: z.coerce.boolean().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type RegisterEvidenceInput = z.infer<typeof registerEvidenceSchema>;
export type ModerateReportInput = z.infer<typeof moderateReportSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type MapBoundsInput = z.infer<typeof mapBoundsSchema>;
