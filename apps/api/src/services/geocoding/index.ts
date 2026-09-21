import type { GeocodeResult } from '@crisis/types';

import { env } from '../../config/env';
import { upstreamError } from '../../lib/errors';

export interface GeocodingProvider {
  readonly name: string;
  search(query: string, limit?: number): Promise<GeocodeResult[]>;
  reverse(lat: number, lng: number): Promise<GeocodeResult | null>;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  boundingbox?: [string, string, string, string];
}

/** Nominatim (OpenStreetMap) geocoder. Respects usage policy via User-Agent. */
class NominatimProvider implements GeocodingProvider {
  readonly name = 'nominatim';
  constructor(private readonly baseUrl: string) {}

  private headers(): Record<string, string> {
    return { 'User-Agent': 'AegisMap/1.0 (+https://aegismap.example)', 'Accept-Language': 'en' };
  }

  async search(query: string, limit = 5): Promise<GeocodeResult[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=${limit}&addressdetails=0`;
    try {
      const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const items = (await res.json()) as NominatimItem[];
      return items.map(toResult);
    } catch (err) {
      throw upstreamError(`Geocoding failed: ${(err as Error).message}`);
    }
  }

  async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
    const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lng}&format=jsonv2`;
    try {
      const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const item = (await res.json()) as NominatimItem & { error?: string };
      if (item.error) return null;
      return toResult(item);
    } catch (err) {
      throw upstreamError(`Reverse geocoding failed: ${(err as Error).message}`);
    }
  }
}

function toResult(item: NominatimItem): GeocodeResult {
  const bb = item.boundingbox;
  return {
    displayName: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    type: item.type,
    boundingBox: bb
      ? {
          minLat: Number(bb[0]),
          maxLat: Number(bb[1]),
          minLng: Number(bb[2]),
          maxLng: Number(bb[3]),
        }
      : undefined,
  };
}

let provider: GeocodingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (provider) return provider;
  switch (env.GEOCODING_PROVIDER) {
    case 'nominatim':
    default:
      provider = new NominatimProvider(env.GEOCODING_BASE_URL);
      break;
  }
  return provider;
}
