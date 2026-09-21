import { describe, expect, it } from 'vitest';

import {
  boundingBoxAround,
  formatDistance,
  haversineMeters,
  isValidLatLng,
  pointToPolylineMeters,
} from '../geo';

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters({ lat: 9.07, lng: 7.39 }, { lat: 9.07, lng: 7.39 })).toBe(0);
  });

  it('approximates a known distance (Abuja → Lagos ~ 525 km)', () => {
    const abuja = { lat: 9.0765, lng: 7.3986 };
    const lagos = { lat: 6.5244, lng: 3.3792 };
    const d = haversineMeters(abuja, lagos) / 1000;
    expect(d).toBeGreaterThan(490);
    expect(d).toBeLessThan(560);
  });

  it('is symmetric', () => {
    const a = { lat: 1, lng: 2 };
    const b = { lat: 3, lng: 4 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe('pointToPolylineMeters', () => {
  it('measures distance to the nearest segment', () => {
    const line: [number, number][] = [
      [7.0, 9.0],
      [7.1, 9.0],
    ];
    // A point just north of the midpoint of the line.
    const d = pointToPolylineMeters({ lat: 9.01, lng: 7.05 }, line);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1300);
  });

  it('handles a single-point line', () => {
    expect(pointToPolylineMeters({ lat: 9, lng: 7 }, [[7, 9]])).toBe(0);
  });
});

describe('boundingBoxAround', () => {
  it('produces a box that contains the centre', () => {
    const box = boundingBoxAround({ lat: 9, lng: 7 }, 5000);
    expect(box.minLat).toBeLessThan(9);
    expect(box.maxLat).toBeGreaterThan(9);
    expect(box.minLng).toBeLessThan(7);
    expect(box.maxLng).toBeGreaterThan(7);
  });
});

describe('validation and formatting', () => {
  it('validates coordinates', () => {
    expect(isValidLatLng({ lat: 9, lng: 7 })).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: 7 })).toBe(false);
    expect(isValidLatLng({ lat: 9, lng: 181 })).toBe(false);
  });

  it('formats distances', () => {
    expect(formatDistance(500)).toBe('500 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(25_000)).toBe('25 km');
  });
});
