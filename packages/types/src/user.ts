import type { AccountStatus, AppRole } from './enums';

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: AppRole;
  accountStatus: AccountStatus;
  /** Reputation score used for lightweight abuse mitigation (0–100). */
  reputation: number;
  /** Whether the user prefers reduced network usage. */
  dataSaver: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The authenticated principal derived from a verified Supabase JWT. */
export interface AuthUser {
  id: string;
  email: string | null;
  role: AppRole;
  accountStatus: AccountStatus;
}

export interface NotificationPreferences {
  userId: string;
  emergencyAlerts: boolean;
  nearbyCrisisAlerts: boolean;
  reportStatusUpdates: boolean;
  safeLocationUpdates: boolean;
  systemNotifications: boolean;
  /** Minimum severity that triggers a nearby-crisis alert. */
  minSeverity: import('./enums').Severity;
  /** Alert radius in kilometres. */
  radiusKm: number;
  pushEnabled: boolean;
  updatedAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  createdAt: string;
}
