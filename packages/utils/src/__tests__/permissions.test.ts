import { describe, expect, it } from 'vitest';

import { hasPermission, isAdmin, isModerator, roleAtLeast } from '../permissions';
import { computeDuplicateSignals, duplicateScore, textSimilarity } from '../similarity';

describe('permissions', () => {
  it('grants citizens report creation but not verification', () => {
    expect(hasPermission('citizen', 'report:create')).toBe(true);
    expect(hasPermission('citizen', 'report:verify')).toBe(false);
    expect(hasPermission('citizen', 'user:manage')).toBe(false);
  });

  it('grants moderators verification but not user management', () => {
    expect(hasPermission('moderator', 'report:verify')).toBe(true);
    expect(hasPermission('moderator', 'moderation:act')).toBe(true);
    expect(hasPermission('moderator', 'user:manage')).toBe(false);
  });

  it('grants admins full control', () => {
    expect(hasPermission('admin', 'user:manage')).toBe(true);
    expect(hasPermission('admin', 'settings:manage')).toBe(true);
    expect(hasPermission('admin', 'category:manage')).toBe(true);
  });

  it('orders roles by privilege', () => {
    expect(roleAtLeast('admin', 'moderator')).toBe(true);
    expect(roleAtLeast('moderator', 'admin')).toBe(false);
    expect(isModerator('admin')).toBe(true);
    expect(isModerator('citizen')).toBe(false);
    expect(isAdmin('moderator')).toBe(false);
  });
});

describe('duplicate detection', () => {
  it('scores identical text as fully similar', () => {
    expect(textSimilarity('flooding on main road', 'flooding on main road')).toBe(1);
  });

  it('scores disjoint text near zero', () => {
    expect(textSimilarity('flooding on main road', 'peaceful market day')).toBeLessThan(0.2);
  });

  it('rates co-located, same-category, similar reports as likely duplicates', () => {
    const signals = computeDuplicateSignals(
      {
        location: { lat: 9.05, lng: 7.49 },
        reportedAt: '2026-08-24T12:00:00Z',
        categoryId: 'flooding',
        text: 'Severe flooding blocking the highway',
      },
      {
        location: { lat: 9.051, lng: 7.491 },
        reportedAt: '2026-08-24T12:20:00Z',
        categoryId: 'flooding',
        text: 'Flooding on the highway, road blocked',
      },
    );
    expect(duplicateScore(signals)).toBeGreaterThan(0.55);
  });

  it('rates distant, different reports as not duplicates', () => {
    const signals = computeDuplicateSignals(
      {
        location: { lat: 9.05, lng: 7.49 },
        reportedAt: '2026-08-24T12:00:00Z',
        categoryId: 'flooding',
        text: 'Severe flooding',
      },
      {
        location: { lat: 6.52, lng: 3.37 },
        reportedAt: '2026-08-24T18:00:00Z',
        categoryId: 'road_accident',
        text: 'Car accident at the junction',
      },
    );
    expect(duplicateScore(signals)).toBeLessThan(0.3);
  });
});
