import type { What3WordsResult, What3WordsSuggestion } from '@crisis/types';

import { env } from '../config/env';
import { badRequest, upstreamError } from '../lib/errors';

const W3W_REGEX =
  /^(\/{3})?([a-zA-Z\u00C0-\u017F]+)\.([a-zA-Z\u00C0-\u017F]+)\.([a-zA-Z\u00C0-\u017F]+)$/;

export function isWhat3Words(input: string): boolean {
  return W3W_REGEX.test(input.trim());
}

export function cleanWhat3Words(input: string): string {
  const match = input.trim().match(W3W_REGEX);
  if (!match) return input.trim();
  return `${match[2]}.${match[3]}.${match[4]}`.toLowerCase();
}

/** Simple word list used for deterministic offline/test fallback when no API key is provided. */
const WORD_LIST = [
  'apple',
  'bridge',
  'castle',
  'dawn',
  'eagle',
  'forest',
  'harbor',
  'island',
  'jungle',
  'knight',
  'lake',
  'mountain',
  'nest',
  'ocean',
  'path',
  'river',
  'stone',
  'tower',
  'valley',
  'water',
  'beacon',
  'breeze',
  'cloud',
  'delta',
  'echo',
  'frost',
  'glade',
  'haven',
  'meadow',
  'oasis',
  'peak',
  'ridge',
  'stream',
  'timber',
  'summit',
  'field',
];

function pseudoHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class What3WordsService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = env.W3W_API_KEY;
    this.baseUrl = env.W3W_BASE_URL.replace(/\/+$/, '');
  }

  async convertToCoordinates(rawWords: string): Promise<What3WordsResult> {
    const words = cleanWhat3Words(rawWords);
    if (!words.includes('.')) {
      throw badRequest(
        'Invalid What3Words address format. Expected word.word.word or ///word.word.word',
      );
    }

    if (this.apiKey) {
      const url = `${this.baseUrl}/convert-to-coordinates?words=${encodeURIComponent(words)}&key=${this.apiKey}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(body.error?.message ?? `What3Words API returned status ${res.status}`);
        }
        const data = (await res.json()) as {
          coordinates: { lat: number; lng: number };
          words: string;
          country: string;
          nearestPlace: string;
          map: string;
        };
        return {
          words: `///${data.words}`,
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
          country: data.country,
          nearestPlace: data.nearestPlace,
          mapUrl: data.map,
        };
      } catch (err) {
        throw upstreamError(`What3Words resolution failed: ${(err as Error).message}`);
      }
    }

    // Deterministic fallback for prototyping / offline / testing
    const parts = words.split('.');
    const h1 = pseudoHash(parts[0] || 'word');
    const h2 = pseudoHash(parts[1] || 'word');
    const h3 = pseudoHash(parts[2] || 'word');

    // Generate realistic geographic coordinates
    const lat = Number((((h1 % 1600000) - 800000) / 10000).toFixed(6));
    const lng = Number((((h2 % 3600000) - 1800000) / 10000).toFixed(6));

    return {
      words: `///${words}`,
      lat,
      lng,
      country: 'NG',
      nearestPlace: `Sector-${(h3 % 100) + 1}`,
      mapUrl: `https://what3words.com/${words}`,
    };
  }

  async convertTo3wa(lat: number, lng: number): Promise<What3WordsResult> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw badRequest('Valid latitude and longitude are required');
    }

    if (this.apiKey) {
      const url = `${this.baseUrl}/convert-to-3wa?coordinates=${lat},${lng}&key=${this.apiKey}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(body.error?.message ?? `What3Words API returned status ${res.status}`);
        }
        const data = (await res.json()) as {
          coordinates: { lat: number; lng: number };
          words: string;
          country: string;
          nearestPlace: string;
          map: string;
        };
        return {
          words: `///${data.words}`,
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
          country: data.country,
          nearestPlace: data.nearestPlace,
          mapUrl: data.map,
        };
      } catch (err) {
        throw upstreamError(`What3Words reverse lookup failed: ${(err as Error).message}`);
      }
    }

    // Deterministic 3x3m grid hashing fallback
    const latInt = Math.floor((lat + 90) * 33333);
    const lngInt = Math.floor((lng + 180) * 33333);
    const w1 = WORD_LIST[Math.abs(latInt) % WORD_LIST.length];
    const w2 = WORD_LIST[Math.abs(lngInt) % WORD_LIST.length];
    const w3 = WORD_LIST[Math.abs(latInt ^ lngInt) % WORD_LIST.length];
    const words = `${w1}.${w2}.${w3}`;

    return {
      words: `///${words}`,
      lat,
      lng,
      country: 'Crisis Area',
      nearestPlace: 'Coordinates Grid Reference',
      mapUrl: `https://what3words.com/${words}`,
    };
  }

  async autosuggest(input: string): Promise<What3WordsSuggestion[]> {
    const trimmed = input.trim().replace(/^\/{3}/, '');
    if (trimmed.length < 2) return [];

    if (this.apiKey) {
      const url = `${this.baseUrl}/autosuggest?input=${encodeURIComponent(trimmed)}&key=${this.apiKey}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const data = (await res.json()) as {
          suggestions?: Array<{ words: string; nearestPlace: string; country: string }>;
        };
        return (data.suggestions ?? []).map((s) => ({
          words: `///${s.words}`,
          nearestPlace: s.nearestPlace,
          country: s.country,
        }));
      } catch {
        return [];
      }
    }

    // Mock suggestions matching partial input
    const parts = trimmed.split('.');
    const lastPart = parts[parts.length - 1] ?? '';
    const matches = WORD_LIST.filter((w) => w.startsWith(lastPart.toLowerCase())).slice(0, 4);

    return matches.map((m) => {
      const suggestedParts = [...parts.slice(0, -1), m];
      while (suggestedParts.length < 3) {
        suggestedParts.push(WORD_LIST[suggestedParts.length * 3] ?? 'place');
      }
      return {
        words: `///${suggestedParts.slice(0, 3).join('.')}`,
        nearestPlace: 'Sample District',
        country: 'NG',
      };
    });
  }
}

export const w3wService = new What3WordsService();
