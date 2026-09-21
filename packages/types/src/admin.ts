import type { Severity, VerificationStatus } from './enums';

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  /** Coarse request metadata; never full request bodies or secrets. */
  metadata: Record<string, unknown>;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipHash: string | null;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface EmergencyGuide {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** Markdown body, editable by administrators. */
  content: string;
  icon: string;
  categorySlug: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedLocation {
  id: string;
  userId: string;
  label: string;
  lat: number;
  lng: number;
  address: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  verifiedReports: number;
  rejectedReports: number;
  expiredReports: number;
  activeCrises: number;
  criticalIncidents: number;
  activeAlerts: number;
  safeLocations: number;
  totalUsers: number;
  reportsByCategory: { categorySlug: string; count: number }[];
  reportsBySeverity: { severity: Severity; count: number }[];
  reportsByStatus: { status: VerificationStatus; count: number }[];
  reportsOverTime: { date: string; count: number }[];
  medianVerificationMinutes: number | null;
}
