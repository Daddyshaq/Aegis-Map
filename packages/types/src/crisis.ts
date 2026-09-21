import type {
  CrisisStatus,
  EvidenceKind,
  ModerationAction,
  RiskLevel,
  Severity,
  VerificationStatus,
} from './enums';

export interface CrisisCategory {
  id: string;
  /** Stable machine slug, e.g. "flooding". */
  slug: string;
  name: string;
  description: string | null;
  /** Lucide icon name used by the UI. */
  icon: string;
  /** Hex colour for map/legend rendering. */
  color: string;
  /** Default time-to-live in hours applied to new reports of this category. */
  defaultTtlHours: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrisisReport {
  id: string;
  /** Human-friendly reference code, e.g. "CR-8F2A1B". */
  reference: string;
  categoryId: string;
  category?: CrisisCategory;
  title: string;
  description: string;
  severity: Severity;
  status: CrisisStatus;
  verificationStatus: VerificationStatus;
  lat: number;
  lng: number;
  locationName: string | null;
  /** Number of independent corroborating reports linked to this incident. */
  corroborationCount: number;
  /** System-generated risk assessment (never presented as authoritative). */
  riskLevel: RiskLevel;
  riskScore: number;
  /** Author of the report. Null for anonymous submissions. */
  reportedBy: string | null;
  isAnonymous: boolean;
  verifiedBy: string | null;
  verificationNotes: string | null;
  reportedAt: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidence?: CrisisEvidence[];
}

export interface CrisisEvidence {
  id: string;
  reportId: string;
  kind: EvidenceKind;
  /** Storage object path (private bucket). */
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  /** Only present when a signed URL has been minted for an authorized viewer. */
  signedUrl?: string;
  createdAt: string;
}

export interface CrisisVerification {
  id: string;
  reportId: string;
  moderatorId: string;
  action: ModerationAction;
  notes: string | null;
  previousStatus: VerificationStatus | null;
  newStatus: VerificationStatus | null;
  createdAt: string;
}

/** Lightweight shape used by map endpoints (no PII, minimal payload). */
export interface CrisisMapFeature {
  id: string;
  reference: string;
  categoryId: string;
  categorySlug: string;
  title: string;
  severity: Severity;
  status: CrisisStatus;
  verificationStatus: VerificationStatus;
  riskLevel: RiskLevel;
  lat: number;
  lng: number;
  reportedAt: string;
  expiresAt: string | null;
}

export interface DuplicateCandidate {
  report: CrisisReport;
  distanceMeters: number;
  minutesApart: number;
  similarityScore: number;
}
