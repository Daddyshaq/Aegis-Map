import type { RiskLevel, Severity } from '@crisis/types';

/**
 * Central, tunable configuration for the crisis risk engine and lifecycle.
 * Kept in a shared package so the API (authoritative) and the web app
 * (optimistic previews) apply identical rules.
 */

export interface RiskEngineConfig {
  /** Base points contributed per severity. */
  severityPoints: Record<Severity, number>;
  /** Multiplier applied when a report is officially verified. */
  verifiedMultiplier: number;
  /** Multiplier applied to unverified (pending/under-review) reports. */
  unverifiedMultiplier: number;
  /** Points added per corroborating report (capped). */
  corroborationPoints: number;
  maxCorroborationPoints: number;
  /** Recency half-life in hours; older reports decay towards zero. */
  recencyHalfLifeHours: number;
  /** Score thresholds (inclusive lower bound) for each risk band. */
  thresholds: { level: Exclude<RiskLevel, 'UNKNOWN'>; min: number }[];
}

export const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
  severityPoints: { LOW: 10, MODERATE: 30, HIGH: 60, CRITICAL: 100 },
  verifiedMultiplier: 1.0,
  unverifiedMultiplier: 0.6,
  corroborationPoints: 8,
  maxCorroborationPoints: 40,
  recencyHalfLifeHours: 12,
  thresholds: [
    { level: 'CRITICAL', min: 85 },
    { level: 'HIGH', min: 55 },
    { level: 'MODERATE', min: 25 },
    { level: 'LOW', min: 0 },
  ],
};

/** Default incident time-to-live per severity (hours) when a category omits it. */
export const DEFAULT_TTL_HOURS: Record<Severity, number> = {
  LOW: 24,
  MODERATE: 48,
  HIGH: 72,
  CRITICAL: 168,
};

/** Duplicate-detection thresholds used at report-submission time. */
export const DUPLICATE_DETECTION = {
  radiusMeters: 750,
  windowMinutes: 120,
  /** Minimum similarity (0–1) to treat as a likely duplicate. */
  similarityThreshold: 0.55,
} as const;

/** Nearby-alert radius options offered to users (kilometres). */
export const ALERT_RADIUS_OPTIONS_KM = [1, 5, 10, 25, 50] as const;
export const DEFAULT_ALERT_RADIUS_KM = 10;

/** Buffer distance used when testing whether a route intersects a hazard. */
export const ROUTE_HAZARD_BUFFER_METERS = 500;

/** Abuse mitigation: max reports per user per rolling window. */
export const REPORT_THROTTLE = {
  windowMinutes: 60,
  maxReports: 8,
} as const;

/** Upload constraints enforced on both client and server. */
export const UPLOAD_LIMITS = {
  maxBytes: 15 * 1024 * 1024,
  maxFiles: 5,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  allowedAudioTypes: ['audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav'],
} as const;

export const ALL_ALLOWED_UPLOAD_TYPES: readonly string[] = [
  ...UPLOAD_LIMITS.allowedImageTypes,
  ...UPLOAD_LIMITS.allowedVideoTypes,
  ...UPLOAD_LIMITS.allowedAudioTypes,
];

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/** Storage bucket names. */
export const STORAGE_BUCKETS = {
  evidence: 'crisis-evidence',
  avatars: 'avatars',
} as const;

/** Supabase Realtime channel/topic names. */
export const REALTIME_CHANNELS = {
  crisisReports: 'public:crisis_reports',
  alerts: 'public:alerts',
  safeLocations: 'public:safe_locations',
} as const;
