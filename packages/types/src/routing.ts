import type { RiskLevel, RouteRisk, Severity } from './enums';
import type { LatLng, Position } from './geo';

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  /** Travel profile; providers map this to their own vocabulary. */
  profile?: 'driving' | 'walking' | 'cycling';
  /** Whether to attempt crisis-avoiding alternatives. */
  avoidCrisisZones?: boolean;
}

export interface RouteHazard {
  reportId: string;
  title: string;
  severity: Severity;
  riskLevel: RiskLevel;
  lat: number;
  lng: number;
  /** Closest distance from the route line to the hazard, in metres. */
  distanceMeters: number;
}

export interface RouteResult {
  /** Ordered [lng, lat] positions describing the route geometry. */
  geometry: Position[];
  distanceMeters: number;
  durationSeconds: number;
  risk: RouteRisk;
  hazards: RouteHazard[];
  /** Human-readable, explicitly advisory guidance. */
  advisory: string;
  provider: string;
  /** Whether this is a re-routed alternative that avoids known hazards. */
  isAlternative: boolean;
}
