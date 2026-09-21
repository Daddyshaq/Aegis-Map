import { DUPLICATE_DETECTION } from '@crisis/config';
import type { LatLng } from '@crisis/types';

import { haversineMeters } from './geo';

/** Normalise text for comparison: lowercase, strip punctuation, collapse spaces. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'to',
  'is',
  'are',
  'was',
  'were',
  'near',
  'by',
  'with',
  'for',
  'there',
  'here',
  'this',
  'that',
]);

export function tokenize(input: string): Set<string> {
  return new Set(
    normalizeText(input)
      .split(' ')
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

/** Jaccard similarity of the token sets of two strings, in [0,1]. */
export function textSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const tok of ta) if (tb.has(tok)) intersection++;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateSignals {
  distanceMeters: number;
  minutesApart: number;
  sameCategory: boolean;
  textSimilarity: number;
}

/**
 * Combine spatial, temporal, categorical and textual signals into a single
 * duplicate-likelihood score in [0,1]. Higher means more likely a duplicate.
 */
export function duplicateScore(signals: DuplicateSignals): number {
  const distanceScore = clamp01(1 - signals.distanceMeters / DUPLICATE_DETECTION.radiusMeters);
  const timeScore = clamp01(1 - signals.minutesApart / DUPLICATE_DETECTION.windowMinutes);
  const categoryScore = signals.sameCategory ? 1 : 0;
  const textScore = clamp01(signals.textSimilarity);
  // Weighted blend — proximity and category dominate, text/time refine.
  return clamp01(distanceScore * 0.4 + categoryScore * 0.25 + textScore * 0.2 + timeScore * 0.15);
}

export function computeDuplicateSignals(
  candidate: { location: LatLng; reportedAt: string; categoryId: string; text: string },
  existing: { location: LatLng; reportedAt: string; categoryId: string; text: string },
): DuplicateSignals {
  return {
    distanceMeters: haversineMeters(candidate.location, existing.location),
    minutesApart:
      Math.abs(Date.parse(candidate.reportedAt) - Date.parse(existing.reportedAt)) / 60_000,
    sameCategory: candidate.categoryId === existing.categoryId,
    textSimilarity: textSimilarity(candidate.text, existing.text),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
