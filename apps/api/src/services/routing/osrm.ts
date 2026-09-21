import type { LatLng, Position } from '@crisis/types';

import { upstreamError } from '../../lib/errors';

import type { RawRoute, RoutingProvider } from './types';

const OSRM_PROFILE: Record<string, string> = {
  driving: 'driving',
  walking: 'walking',
  cycling: 'cycling',
};

interface OsrmResponse {
  code: string;
  routes?: {
    geometry: { coordinates: Position[]; type: 'LineString' };
    distance: number;
    duration: number;
  }[];
}

/**
 * OSRM routing provider. Works against the public demo server or any
 * self-hosted OSRM instance (configured via ROUTING_BASE_URL).
 */
export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = 'osrm';

  constructor(private readonly baseUrl: string) {}

  async getRoutes(
    origin: LatLng,
    destination: LatLng,
    profile: 'driving' | 'walking' | 'cycling',
  ): Promise<RawRoute[]> {
    const osrmProfile = OSRM_PROFILE[profile] ?? 'driving';
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${this.baseUrl}/route/v1/${osrmProfile}/${coords}?overview=full&geometries=geojson&alternatives=true&steps=false`;

    let payload: OsrmResponse;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AegisMap/1.0 (+https://aegismap.example)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`OSRM responded ${res.status}`);
      payload = (await res.json()) as OsrmResponse;
    } catch (err) {
      throw upstreamError(`Routing provider unavailable: ${(err as Error).message}`);
    }

    if (payload.code !== 'Ok' || !payload.routes?.length) {
      throw upstreamError('No route could be found between those points');
    }

    return payload.routes.map((r) => ({
      geometry: r.geometry.coordinates,
      distanceMeters: r.distance,
      durationSeconds: r.duration,
    }));
  }
}
