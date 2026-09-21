/**
 * Typed schema for the Supabase Postgres database.
 *
 * Kept in sync with `supabase/migrations`. Column names are snake_case to match
 * the database; the mappers in `mappers.ts` translate rows to camelCase domain
 * types from `@crisis/types`.
 */

import type { AdminStats } from '@crisis/types';

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'citizen' | 'moderator' | 'admin';
  account_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  reputation: number;
  data_saver: boolean;
  created_at: string;
  updated_at: string;
};

export type CrisisCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  default_ttl_hours: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CrisisReportRow = {
  id: string;
  reference: string;
  category_id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED' | 'EXPIRED';
  verification_status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  lat: number;
  lng: number;
  location_name: string | null;
  corroboration_count: number;
  risk_level: 'UNKNOWN' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  reported_by: string | null;
  is_anonymous: boolean;
  verified_by: string | null;
  verification_notes: string | null;
  duplicate_of_id: string | null;
  reported_at: string;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrisisEvidenceRow = {
  id: string;
  report_id: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type CrisisVerificationRow = {
  id: string;
  report_id: string;
  moderator_id: string;
  action: string;
  notes: string | null;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
};

export type SafeLocationRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  capacity: number | null;
  operating_status: string;
  verification_status: string;
  opening_hours: string | null;
  facilities: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AlertRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  is_active: boolean;
  published_by: string;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferencesRow = {
  user_id: string;
  emergency_alerts: boolean;
  nearby_crisis_alerts: boolean;
  report_status_updates: boolean;
  safe_location_updates: boolean;
  system_notifications: boolean;
  min_severity: string;
  radius_km: number;
  push_enabled: boolean;
  updated_at: string;
};

export type SavedLocationRow = {
  id: string;
  user_id: string;
  label: string;
  lat: number;
  lng: number;
  address: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_hash: string | null;
  created_at: string;
};

export type SystemSettingRow = {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type EmergencyGuideRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  icon: string;
  category_slug: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  // supabase-js's GenericTable requires this key; we don't rely on typed joins.
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      crisis_categories: TableDef<CrisisCategoryRow>;
      crisis_reports: TableDef<CrisisReportRow>;
      crisis_evidence: TableDef<CrisisEvidenceRow>;
      crisis_verifications: TableDef<CrisisVerificationRow>;
      safe_locations: TableDef<SafeLocationRow>;
      alerts: TableDef<AlertRow>;
      notifications: TableDef<NotificationRow>;
      notification_preferences: TableDef<NotificationPreferencesRow>;
      saved_locations: TableDef<SavedLocationRow>;
      push_subscriptions: TableDef<PushSubscriptionRow>;
      audit_logs: TableDef<AuditLogRow>;
      system_settings: TableDef<SystemSettingRow>;
      emergency_guides: TableDef<EmergencyGuideRow>;
    };
    Views: Record<string, never>;
    Functions: {
      reports_in_bbox: {
        Args: {
          min_lat: number;
          min_lng: number;
          max_lat: number;
          max_lng: number;
        };
        Returns: CrisisReportRow[];
      };
      nearby_safe_locations: {
        Args: { p_lat: number; p_lng: number; p_radius_m: number };
        Returns: (SafeLocationRow & { distance_meters: number })[];
      };
      reports_near: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m: number;
          p_min_severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
        };
        Returns: CrisisReportRow[];
      };
      expire_stale_reports: {
        Args: Record<string, never>;
        Returns: number;
      };
      admin_dashboard_stats: {
        Args: Record<string, never>;
        Returns: AdminStats;
      };
    };
    Enums: Record<string, never>;
  };
};
