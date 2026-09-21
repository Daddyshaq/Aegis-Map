import type { BoundingBox, LatLng, Position } from '@crisis/types';

const EARTH_RADIUS_M = 6_371_008.8;
const DEG_TO_RAD = Math.PI / 180;

export function toRadians(deg: number): number {
  return deg * DEG_TO_RAD;
}

/**
 * Great-circle distance between two points in metres (haversine).
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Shortest distance (metres) from point `p` to the segment `a`–`b`.
 * Uses a local equirectangular projection which is accurate for the short
 * distances relevant to hazard/route proximity checks.
 */
export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const latRef = toRadians((a.lat + b.lat) / 2);
  const project = (pt: LatLng): [number, number] => [
    toRadians(pt.lng) * Math.cos(latRef) * EARTH_RADIUS_M,
    toRadians(pt.lat) * EARTH_RADIUS_M,
  ];
  const [px, py] = project(p);
  const [ax, ay] = project(a);
  const [bx, by] = project(b);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Minimum distance (metres) from a point to a polyline described by an ordered
 * list of GeoJSON [lng, lat] positions.
 */
export function pointToPolylineMeters(p: LatLng, line: Position[]): number {
  if (line.length === 0) return Number.POSITIVE_INFINITY;
  if (line.length === 1) {
    const only = line[0]!;
    return haversineMeters(p, { lng: only[0], lat: only[1] });
  }
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    const start = line[i]!;
    const end = line[i + 1]!;
    const d = pointToSegmentMeters(
      p,
      { lng: start[0], lat: start[1] },
      { lng: end[0], lat: end[1] },
    );
    if (d < min) min = d;
  }
  return min;
}

/** Bounding box padded by `radiusMeters` around a centre point. */
export function boundingBoxAround(center: LatLng, radiusMeters: number): BoundingBox {
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const lngDelta =
    (radiusMeters / (EARTH_RADIUS_M * Math.cos(toRadians(center.lat)))) * (180 / Math.PI);
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isValidLatLng(p: LatLng): boolean {
  return isValidLatitude(p.lat) && isValidLongitude(p.lng);
}

/** Format a metre distance into a compact human string. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
