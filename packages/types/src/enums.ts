/**
 * Canonical enumerations shared across the whole system.
 *
 * These are modelled as `const` objects plus derived string-literal unions
 * rather than TypeScript `enum`s so that:
 *   - the runtime values are plain strings that match the Postgres enum labels,
 *   - the types are erasable and tree-shakeable,
 *   - both the API and the web app validate against the exact same set.
 */

export const AppRole = {
  Citizen: 'citizen',
  Moderator: 'moderator',
  Admin: 'admin',
} as const;
export type AppRole = (typeof AppRole)[keyof typeof AppRole];
export const APP_ROLES = Object.values(AppRole) as AppRole[];

/** Role privilege ordering (higher number = more privilege). */
export const ROLE_RANK: Record<AppRole, number> = {
  citizen: 0,
  moderator: 1,
  admin: 2,
};

export const Severity = {
  Low: 'LOW',
  Moderate: 'MODERATE',
  High: 'HIGH',
  Critical: 'CRITICAL',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];
export const SEVERITIES = Object.values(Severity) as Severity[];

/** Numeric weight per severity, used by the risk engine. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const VerificationStatus = {
  Pending: 'PENDING',
  UnderReview: 'UNDER_REVIEW',
  Verified: 'VERIFIED',
  Rejected: 'REJECTED',
  Expired: 'EXPIRED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
export const VERIFICATION_STATUSES = Object.values(VerificationStatus) as VerificationStatus[];

/** Lifecycle/operational status of an incident, distinct from verification. */
export const CrisisStatus = {
  Active: 'ACTIVE',
  Contained: 'CONTAINED',
  Resolved: 'RESOLVED',
  Expired: 'EXPIRED',
} as const;
export type CrisisStatus = (typeof CrisisStatus)[keyof typeof CrisisStatus];
export const CRISIS_STATUSES = Object.values(CrisisStatus) as CrisisStatus[];

/** Machine-readable risk band produced by the risk engine. */
export const RiskLevel = {
  Unknown: 'UNKNOWN',
  Low: 'LOW',
  Moderate: 'MODERATE',
  High: 'HIGH',
  Critical: 'CRITICAL',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];
export const RISK_LEVELS = Object.values(RiskLevel) as RiskLevel[];

export const SafeLocationType = {
  Shelter: 'SHELTER',
  Hospital: 'HOSPITAL',
  Police: 'POLICE',
  FireStation: 'FIRE_STATION',
  EvacuationCenter: 'EVACUATION_CENTER',
  ReliefCenter: 'RELIEF_CENTER',
  Other: 'OTHER',
} as const;
export type SafeLocationType = (typeof SafeLocationType)[keyof typeof SafeLocationType];
export const SAFE_LOCATION_TYPES = Object.values(SafeLocationType) as SafeLocationType[];

export const OperatingStatus = {
  Open: 'OPEN',
  Limited: 'LIMITED',
  Full: 'FULL',
  Closed: 'CLOSED',
  Unknown: 'UNKNOWN',
} as const;
export type OperatingStatus = (typeof OperatingStatus)[keyof typeof OperatingStatus];
export const OPERATING_STATUSES = Object.values(OperatingStatus) as OperatingStatus[];

export const AlertType = {
  Emergency: 'EMERGENCY',
  Warning: 'WARNING',
  Advisory: 'ADVISORY',
  Announcement: 'ANNOUNCEMENT',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];
export const ALERT_TYPES = Object.values(AlertType) as AlertType[];

export const NotificationType = {
  ReportReceived: 'REPORT_RECEIVED',
  ReportVerified: 'REPORT_VERIFIED',
  ReportRejected: 'REPORT_REJECTED',
  ReportInfoRequested: 'REPORT_INFO_REQUESTED',
  NearbyCrisis: 'NEARBY_CRISIS',
  EmergencyAlert: 'EMERGENCY_ALERT',
  SafeLocationUpdate: 'SAFE_LOCATION_UPDATE',
  System: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NOTIFICATION_TYPES = Object.values(NotificationType) as NotificationType[];

export const ModerationAction = {
  MarkUnderReview: 'MARK_UNDER_REVIEW',
  Verify: 'VERIFY',
  Reject: 'REJECT',
  RequestInfo: 'REQUEST_INFO',
  MarkDuplicate: 'MARK_DUPLICATE',
  Escalate: 'ESCALATE',
  Expire: 'EXPIRE',
  Reopen: 'REOPEN',
  AssignSeverity: 'ASSIGN_SEVERITY',
} as const;
export type ModerationAction = (typeof ModerationAction)[keyof typeof ModerationAction];
export const MODERATION_ACTIONS = Object.values(ModerationAction) as ModerationAction[];

export const EvidenceKind = {
  Image: 'IMAGE',
  Video: 'VIDEO',
  Audio: 'AUDIO',
  Document: 'DOCUMENT',
} as const;
export type EvidenceKind = (typeof EvidenceKind)[keyof typeof EvidenceKind];
export const EVIDENCE_KINDS = Object.values(EvidenceKind) as EvidenceKind[];

export const RouteRisk = {
  Safe: 'SAFE',
  Low: 'LOW',
  Moderate: 'MODERATE',
  High: 'HIGH',
  Avoid: 'AVOID',
} as const;
export type RouteRisk = (typeof RouteRisk)[keyof typeof RouteRisk];
export const ROUTE_RISKS = Object.values(RouteRisk) as RouteRisk[];

export const AccountStatus = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
  Banned: 'BANNED',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];
export const ACCOUNT_STATUSES = Object.values(AccountStatus) as AccountStatus[];
