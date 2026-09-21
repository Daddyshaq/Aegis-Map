import { ROUTE_HAZARD_BUFFER_METERS } from '@crisis/config';
import type { CrisisReportRow } from '@crisis/database';
import type {
  Position,
  RiskLevel,
  RouteHazard,
  RouteResult,
  RouteRisk,
  Severity,
} from '@crisis/types';
import { SEVERITY_WEIGHT } from '@crisis/types';
import { pointToPolylineMeters } from '@crisis/utils';
import type { RouteRequestInput } from '@crisis/validation';

import { supabaseAdmin } from '../lib/supabase';

import { getRoutingProvider } from './routing';
import type { RawRoute } from './routing';

/** Per-severity multiplier on the base hazard buffer (metres). */
const SEVERITY_BUFFER_MULT: Record<Severity, number> = {
  LOW: 0.6,
  MODERATE: 1,
  HIGH: 1.5,
  CRITICAL: 2.2,
};

const RISK_RANK: Record<RouteRisk, number> = {
  SAFE: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  AVOID: 4,
};

const GLOBAL_CAVEAT =
  'Routes are advisory and based on reported incidents only. No route can be guaranteed safe — conditions may change without notice. Stay alert and follow official guidance.';

function bboxOfRoutes(
  routes: RawRoute[],
  padMeters: number,
): {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
} {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const route of routes) {
    for (const [lng, lat] of route.geometry) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  // Pad by an approximate degree delta for the buffer distance.
  const latPad = (padMeters / 111_320) * 1.1;
  const lngPad = latPad / Math.max(0.2, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function assessRoute(
  route: RawRoute,
  reports: CrisisReportRow[],
): { risk: RouteRisk; hazards: RouteHazard[] } {
  const hazards: RouteHazard[] = [];
  let score = 0;
  let criticalClose = false;

  for (const r of reports) {
    const severity = r.severity as Severity;
    const hazardRadius = ROUTE_HAZARD_BUFFER_METERS * SEVERITY_BUFFER_MULT[severity];
    const distance = pointToPolylineMeters({ lat: r.lat, lng: r.lng }, route.geometry);
    if (distance > hazardRadius) continue;

    hazards.push({
      reportId: r.id,
      title: r.title,
      severity,
      riskLevel: r.risk_level as RiskLevel,
      lat: r.lat,
      lng: r.lng,
      distanceMeters: Math.round(distance),
    });

    const proximity = Math.max(0, 1 - distance / hazardRadius);
    score += SEVERITY_WEIGHT[severity] * proximity * 8;
    if (severity === 'CRITICAL' && distance < 150) criticalClose = true;
  }

  let risk: RouteRisk;
  if (hazards.length === 0) risk = 'SAFE';
  else if (criticalClose || score >= 60) risk = 'AVOID';
  else if (score >= 40) risk = 'HIGH';
  else if (score >= 18) risk = 'MODERATE';
  else risk = 'LOW';

  hazards.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { risk, hazards };
}

function advisoryFor(risk: RouteRisk, hazardCount: number): string {
  switch (risk) {
    case 'SAFE':
      return `No reported incidents were found near this route. ${GLOBAL_CAVEAT}`;
    case 'AVOID':
      return `This route passes very close to a serious reported incident. Consider an alternative if possible. ${GLOBAL_CAVEAT}`;
    default:
      return `This route passes near ${hazardCount} reported incident${hazardCount === 1 ? '' : 's'}. ${GLOBAL_CAVEAT}`;
  }
}

/**
 * Fetch candidate routes from the routing provider and overlay known crisis
 * reports, scoring each route and ordering the safest first. Never claims a
 * route is absolutely safe.
 */
export async function getSafeRoutes(request: RouteRequestInput): Promise<RouteResult[]> {
  const provider = getRoutingProvider();
  const rawRoutes = await provider.getRoutes(request.origin, request.destination, request.profile);

  let reports: CrisisReportRow[] = [];
  if (request.avoidCrisisZones !== false) {
    const box = bboxOfRoutes(rawRoutes, ROUTE_HAZARD_BUFFER_METERS * 2.5);
    const { data, error } = await supabaseAdmin.rpc('reports_in_bbox', {
      min_lat: box.minLat,
      min_lng: box.minLng,
      max_lat: box.maxLat,
      max_lng: box.maxLng,
    });
    if (error) throw error;
    reports = data ?? [];
  }

  const assessed = rawRoutes.map((route) => {
    const { risk, hazards } = assessRoute(route, reports);
    return { route, risk, hazards };
  });

  // Safest first, then fastest. Preserve provider order as the final tiebreak.
  assessed.sort((a, b) => {
    const byRisk = RISK_RANK[a.risk] - RISK_RANK[b.risk];
    if (byRisk !== 0) return byRisk;
    return a.route.durationSeconds - b.route.durationSeconds;
  });

  const results: RouteResult[] = assessed.map((a, index): RouteResult => {
    const geometry: Position[] = a.route.geometry;
    return {
      geometry,
      distanceMeters: Math.round(a.route.distanceMeters),
      durationSeconds: Math.round(a.route.durationSeconds),
      risk: a.risk,
      hazards: a.hazards,
      advisory: advisoryFor(a.risk, a.hazards.length),
      provider: provider.name,
      isAlternative: index > 0,
    };
  });

  return results;
}
