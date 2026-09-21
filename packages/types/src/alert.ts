import type { AlertType, NotificationType, Severity } from './enums';
import type { GeoJSONPolygon } from './geo';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  severity: Severity;
  /** Optional geographic scope; when null the alert is global/regional. */
  area: GeoJSONPolygon | null;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
  isActive: boolean;
  publishedBy: string;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Arbitrary structured payload, e.g. { reportId } or { alertId }. */
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
