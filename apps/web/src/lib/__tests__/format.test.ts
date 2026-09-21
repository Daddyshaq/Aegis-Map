import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatCompactNumber,
  formatCoordinate,
  formatDate,
  formatDateTime,
  formatDistanceMeters,
  formatDuration,
  formatNumber,
  formatRelativeTime,
} from '@/lib/format';

describe('formatDistanceMeters', () => {
  it('shows whole metres under 1 km', () => {
    expect(formatDistanceMeters(0)).toBe('0 m');
    expect(formatDistanceMeters(950.4)).toBe('950 m');
  });

  it('shows one decimal for distances under 10 km', () => {
    expect(formatDistanceMeters(1500)).toBe('1.5 km');
  });

  it('drops the decimal at 10 km and beyond', () => {
    expect(formatDistanceMeters(12000)).toBe('12 km');
  });

  it('returns an em dash for nullish or non-finite input', () => {
    expect(formatDistanceMeters(null)).toBe('—');
    expect(formatDistanceMeters(undefined)).toBe('—');
    expect(formatDistanceMeters(Number.NaN)).toBe('—');
    expect(formatDistanceMeters(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes, and hours', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(720)).toBe('12 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(3900)).toBe('1 h 5 min');
  });

  it('returns an em dash for nullish or non-finite input', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('number formatting', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(null)).toBe('0');
  });

  it('compacts large numbers', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(null)).toBe('0');
  });
});

describe('formatCoordinate', () => {
  it('renders four decimals', () => {
    expect(formatCoordinate(9.0765, 7.3986)).toBe('9.0765, 7.3986');
    expect(formatCoordinate(9, 7)).toBe('9.0000, 7.0000');
  });
});

describe('formatBytes', () => {
  it('scales across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });
});

describe('date formatting', () => {
  it('uses a stable local-time format', () => {
    // Constructed and formatted in local time, so the output is deterministic
    // regardless of the machine's timezone.
    const date = new Date(2026, 0, 15, 14, 32);
    expect(formatDate(date)).toBe('15 Jan 2026');
    expect(formatDateTime(date)).toBe('15 Jan 2026, 14:32');
  });

  it('returns an em dash for nullish or invalid input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatRelativeTime('not-a-date')).toBe('—');
    expect(formatRelativeTime(null)).toBe('—');
  });

  it('describes relative time with a suffix', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toMatch(/ago$/);
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(inTwoDays)).toMatch(/^in /);
  });
});
