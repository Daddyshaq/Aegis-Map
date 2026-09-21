import { describe, expect, it } from 'vitest';

import { createReportSchema, moderateReportSchema } from '../crisis';
import { registerSchema, password } from '../index';
import { createAlertSchema, safeLocationSchema } from '../safe-location';

describe('auth validation', () => {
  it('enforces the password policy', () => {
    expect(password.safeParse('short').success).toBe(false);
    expect(password.safeParse('alllowercase1').success).toBe(false);
    expect(password.safeParse('ValidPass123').success).toBe(true);
  });

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'ValidPass123',
      confirmPassword: 'Different123',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });
});

describe('report validation', () => {
  it('accepts a valid report', () => {
    const result = createReportSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000001',
      title: 'Flooding on the expressway',
      description: 'Water has risen above the road surface near the bridge.',
      severity: 'HIGH',
      lat: 9.05,
      lng: 7.49,
    });
    expect(result.success).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    const result = createReportSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000001',
      title: 'Test',
      description: 'Description here',
      severity: 'HIGH',
      lat: 200,
      lng: 7.49,
    });
    expect(result.success).toBe(false);
  });

  it('requires a duplicate target when marking duplicate', () => {
    expect(moderateReportSchema.safeParse({ action: 'MARK_DUPLICATE' }).success).toBe(false);
    expect(
      moderateReportSchema.safeParse({
        action: 'MARK_DUPLICATE',
        duplicateOfId: '00000000-0000-0000-0000-000000000002',
      }).success,
    ).toBe(true);
  });
});

describe('safe location & alert validation', () => {
  it('accepts a valid safe location', () => {
    const result = safeLocationSchema.safeParse({
      name: 'General Hospital',
      type: 'HOSPITAL',
      lat: 9.05,
      lng: 7.49,
      facilities: ['medical', 'water'],
    });
    expect(result.success).toBe(true);
  });

  it('requires both or neither alert centre coordinates', () => {
    expect(
      createAlertSchema.safeParse({
        type: 'WARNING',
        title: 'Flood warning',
        body: 'Rising water levels expected.',
        severity: 'HIGH',
        centerLat: 9.05,
      }).success,
    ).toBe(false);
  });
});
