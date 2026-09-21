import type {
  Alert,
  AlertType,
  AppNotification,
  AppRole,
  CrisisCategory,
  CrisisEvidence,
  CrisisReport,
  CrisisStatus,
  CrisisVerification,
  EmergencyGuide,
  EvidenceKind,
  ModerationAction,
  NotificationPreferences,
  NotificationType,
  OperatingStatus,
  Profile,
  RiskLevel,
  SafeLocation,
  SafeLocationType,
  SavedLocation,
  Severity,
  VerificationStatus,
} from '@crisis/types';

import type {
  AlertRow,
  CrisisCategoryRow,
  CrisisEvidenceRow,
  CrisisReportRow,
  CrisisVerificationRow,
  EmergencyGuideRow,
  NotificationPreferencesRow,
  NotificationRow,
  ProfileRow,
  SafeLocationRow,
  SavedLocationRow,
} from './types';

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role as AppRole,
    accountStatus: row.account_status,
    reputation: row.reputation,
    dataSaver: row.data_saver,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategory(row: CrisisCategoryRow): CrisisCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    defaultTtlHours: row.default_ttl_hours,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReport(
  row: CrisisReportRow,
  extras?: { category?: CrisisCategoryRow; evidence?: CrisisEvidenceRow[] },
): CrisisReport {
  return {
    id: row.id,
    reference: row.reference,
    categoryId: row.category_id,
    category: extras?.category ? mapCategory(extras.category) : undefined,
    title: row.title,
    description: row.description,
    severity: row.severity as Severity,
    status: row.status as CrisisStatus,
    verificationStatus: row.verification_status as VerificationStatus,
    lat: row.lat,
    lng: row.lng,
    locationName: row.location_name,
    corroborationCount: row.corroboration_count,
    riskLevel: row.risk_level as RiskLevel,
    riskScore: row.risk_score,
    reportedBy: row.reported_by,
    isAnonymous: row.is_anonymous,
    verifiedBy: row.verified_by,
    verificationNotes: row.verification_notes,
    reportedAt: row.reported_at,
    verifiedAt: row.verified_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evidence: extras?.evidence?.map(mapEvidence),
  };
}

export function mapEvidence(row: CrisisEvidenceRow): CrisisEvidence {
  return {
    id: row.id,
    reportId: row.report_id,
    kind: row.kind as EvidenceKind,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

export function mapVerification(row: CrisisVerificationRow): CrisisVerification {
  return {
    id: row.id,
    reportId: row.report_id,
    moderatorId: row.moderator_id,
    action: row.action as ModerationAction,
    notes: row.notes,
    previousStatus: (row.previous_status as VerificationStatus | null) ?? null,
    newStatus: (row.new_status as VerificationStatus | null) ?? null,
    createdAt: row.created_at,
  };
}

export function mapSafeLocation(row: SafeLocationRow): SafeLocation {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as SafeLocationType,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    phone: row.phone,
    capacity: row.capacity,
    operatingStatus: row.operating_status as OperatingStatus,
    verificationStatus: row.verification_status as VerificationStatus,
    openingHours: row.opening_hours,
    facilities: row.facilities ?? [],
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    distanceMeters:
      'distance_meters' in row ? (row as { distance_meters?: number }).distance_meters : undefined,
  };
}

export function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    type: row.type as AlertType,
    title: row.title,
    body: row.body,
    severity: row.severity as Severity,
    area: null,
    centerLat: row.center_lat,
    centerLng: row.center_lng,
    radiusKm: row.radius_km,
    isActive: row.is_active,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function mapNotificationPreferences(
  row: NotificationPreferencesRow,
): NotificationPreferences {
  return {
    userId: row.user_id,
    emergencyAlerts: row.emergency_alerts,
    nearbyCrisisAlerts: row.nearby_crisis_alerts,
    reportStatusUpdates: row.report_status_updates,
    safeLocationUpdates: row.safe_location_updates,
    systemNotifications: row.system_notifications,
    minSeverity: row.min_severity as Severity,
    radiusKm: row.radius_km,
    pushEnabled: row.push_enabled,
    updatedAt: row.updated_at,
  };
}

export function mapSavedLocation(row: SavedLocationRow): SavedLocation {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    createdAt: row.created_at,
  };
}

export function mapEmergencyGuide(row: EmergencyGuideRow): EmergencyGuide {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    icon: row.icon,
    categorySlug: row.category_slug,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
