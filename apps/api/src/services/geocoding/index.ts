import type { GeocodeResult } from '@crisis/types';

import { env } from '../../config/env';
import { isWhat3Words, w3wService } from '../w3w.service';

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

interface GoogleGeocodeResult {
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types?: string[];
}

/** Google Maps Geocoding & Places API provider with resilient fallbacks. */
class GoogleGeocodingProvider implements GeocodingProvider {
  readonly name = 'google';
  constructor(private readonly apiKey: string) {}

  async search(query: string, limit = 5): Promise<GeocodeResult[]> {
    if (!this.apiKey) {
      return searchPhoton(query, limit);
    }

    // 1. Try Google Places Text Search first (handles places, businesses, landmarks, and addresses)
    try {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
      const res = await fetch(placesUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            name: string;
            formatted_address: string;
            geometry: { location: { lat: number; lng: number } };
            types?: string[];
          }>;
          status: string;
        };
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          return data.results.slice(0, limit).map((p) => {
            const displayName = p.formatted_address.startsWith(p.name)
              ? p.formatted_address
              : `${p.name}, ${p.formatted_address}`;
            return {
              displayName,
              lat: p.geometry.location.lat,
              lng: p.geometry.location.lng,
              type: p.types?.[0],
            };
          });
        }
      }
    } catch {
      // Proceed to standard geocoding
    }

    // 2. Try Google Geocoding API
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = (await res.json()) as { results?: GoogleGeocodeResult[]; status: string };
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          return data.results.slice(0, limit).map((item) => ({
            displayName: item.formatted_address,
            lat: item.geometry.location.lat,
            lng: item.geometry.location.lng,
            type: item.types?.[0],
            boundingBox: item.geometry.viewport
              ? {
                  minLat: item.geometry.viewport.southwest.lat,
                  maxLat: item.geometry.viewport.northeast.lat,
                  minLng: item.geometry.viewport.southwest.lng,
                  maxLng: item.geometry.viewport.northeast.lng,
                }
              : undefined,
          }));
        }
      }
    } catch {
      // Proceed to fallback
    }

    // 3. Fallback to Photon (OSM) so searches never fail
    try {
      const photonResults = await searchPhoton(query, limit);
      if (photonResults.length > 0) return photonResults;
    } catch {
      // Return empty
    }

    return [];
  }

  async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
    if (this.apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = (await res.json()) as { results?: GoogleGeocodeResult[]; status: string };
          if (data.status === 'OK' && data.results?.[0]) {
            const item = data.results[0];
            return {
              displayName: item.formatted_address,
              lat: item.geometry.location.lat,
              lng: item.geometry.location.lng,
              type: item.types?.[0],
            };
          }
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback to Photon reverse
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const res = await fetch(photonUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = (await res.json()) as { features?: PhotonFeature[] };
        const f = data.features?.[0];
        if (f) {
          const p = f.properties;
          const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
          return {
            displayName: parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            type: p.type,
          };
        }
      }
    } catch {
      // Fallback below
    }

    return {
      displayName: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
    };
  }
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

async function searchPhoton(query: string, limit = 5): Promise<GeocodeResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map((f) => {
    const p = f.properties;
    const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
    return {
      displayName: parts.join(', ') || 'Unknown Location',
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      type: p.type,
    };
  });
}

/** Nominatim (OpenStreetMap) geocoder with automatic Photon fallback. */
class NominatimProvider implements GeocodingProvider {
  readonly name = 'nominatim';
  constructor(private readonly baseUrl: string) {}

  private headers(): Record<string, string> {
    return {
      'User-Agent': 'AegisMap-CrisisReporting/1.0 (https://aegis-maps.vercel.app; panshak4k@gmail.com)',
      'Accept-Language': 'en',
    };
  }

  async search(query: string, limit = 5): Promise<GeocodeResult[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=${limit}&addressdetails=0`;
    try {
      const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const items = (await res.json()) as NominatimItem[];
        if (items.length > 0) return items.map(toResult);
      }
    } catch {
      // Fallback below
    }

    try {
      const photonResults = await searchPhoton(query, limit);
      if (photonResults.length > 0) return photonResults;
    } catch {
      // Fallback completed
    }

    return [];
  }

  async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
    const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lng}&format=jsonv2`;
    try {
      const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const item = (await res.json()) as NominatimItem & { error?: string };
        if (!item.error) return toResult(item);
      }
    } catch {
      // Fallback below
    }

    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const res = await fetch(photonUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = (await res.json()) as { features?: PhotonFeature[] };
        const f = data.features?.[0];
        if (f) {
          const p = f.properties;
          const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
          return {
            displayName: parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            type: p.type,
          };
        }
      }
    } catch {
      // Fallback completed
    }

    return {
      displayName: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
    };
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

class CompositeGeocodingProvider implements GeocodingProvider {
  readonly name = 'composite';
  constructor(private readonly primary: GeocodingProvider) {}

  async search(query: string, limit = 5): Promise<GeocodeResult[]> {
    // If the user entered a What3Words address, resolve it directly via What3Words
    if (isWhat3Words(query)) {
      try {
        const w3w = await w3wService.convertToCoordinates(query);
        return [
          {
            displayName: `${w3w.words} (${w3w.nearestPlace ? `${w3w.nearestPlace}, ` : ''}${w3w.country ?? 'Grid'})`,
            lat: w3w.lat,
            lng: w3w.lng,
            type: 'what3words',
            what3words: w3w.words,
          },
        ];
      } catch {
        // Fall back to general geocoding search if What3Words resolution fails
      }
    }

    return this.primary.search(query, limit);
  }

  async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
    const result = await this.primary.reverse(lat, lng);
    // Attach What3Words 3-word address to reverse geocoding result
    try {
      const w3w = await w3wService.convertTo3wa(lat, lng);
      if (result) {
        result.what3words = w3w.words;
        return result;
      }
      return {
        displayName: w3w.words,
        lat,
        lng,
        type: 'what3words',
        what3words: w3w.words,
      };
    } catch {
      return result;
    }
  }
}

let provider: GeocodingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (provider) return provider;
  let baseProvider: GeocodingProvider;
  if (env.GEOCODING_PROVIDER === 'google' || env.GOOGLE_MAPS_API_KEY) {
    baseProvider = new GoogleGeocodingProvider(env.GOOGLE_MAPS_API_KEY);
  } else {
    baseProvider = new NominatimProvider(env.GEOCODING_BASE_URL);
  }
  provider = new CompositeGeocodingProvider(baseProvider);
  return provider;
}

