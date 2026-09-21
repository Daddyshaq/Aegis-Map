import { RiskLevel, Severity, VerificationStatus } from '@crisis/types';
import { describe, expect, it } from 'vitest';

import { calculateRisk, recencyFactor } from '../risk-engine';

const NOW = new Date('2026-08-24T12:00:00.000Z');

describe('recencyFactor', () => {
  it('is 1 at report time and 0.5 after one half-life', () => {
    const now = NOW.getTime();
    expect(recencyFactor(now, now, 12)).toBeCloseTo(1, 5);
    expect(recencyFactor(now - 12 * 3_600_000, now, 12)).toBeCloseTo(0.5, 5);
    expect(recencyFactor(now - 24 * 3_600_000, now, 12)).toBeCloseTo(0.25, 5);
  });
});

describe('calculateRisk', () => {
  it('rates a fresh verified critical incident as CRITICAL', () => {
    const result = calculateRisk(
      {
        severity: Severity.Critical,
        verificationStatus: VerificationStatus.Verified,
        reportedAt: NOW.toISOString(),
        corroborationCount: 3,
      },
      NOW,
    );
    expect(result.level).toBe(RiskLevel.Critical);
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('discounts unverified reports relative to verified ones', () => {
    const base = {
      severity: Severity.High,
      reportedAt: NOW.toISOString(),
      corroborationCount: 0,
    };
    const verified = calculateRisk(
      { ...base, verificationStatus: VerificationStatus.Verified },
      NOW,
    );
    const unverified = calculateRisk(
      { ...base, verificationStatus: VerificationStatus.Pending },
      NOW,
    );
    expect(unverified.score).toBeLessThan(verified.score);
  });

  it('decays with age', () => {
    const fresh = calculateRisk(
      {
        severity: Severity.High,
        verificationStatus: VerificationStatus.Verified,
        reportedAt: NOW.toISOString(),
      },
      NOW,
    );
    const old = calculateRisk(
      {
        severity: Severity.High,
        verificationStatus: VerificationStatus.Verified,
        reportedAt: new Date(NOW.getTime() - 48 * 3_600_000).toISOString(),
      },
      NOW,
    );
    expect(old.score).toBeLessThan(fresh.score);
  });

  it('returns UNKNOWN for rejected or expired incidents', () => {
    expect(
      calculateRisk(
        {
          severity: Severity.Critical,
          verificationStatus: VerificationStatus.Rejected,
          reportedAt: NOW.toISOString(),
        },
        NOW,
      ).level,
    ).toBe(RiskLevel.Unknown);

    expect(
      calculateRisk(
        {
          severity: Severity.Critical,
          verificationStatus: VerificationStatus.Verified,
          reportedAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
          expiresAt: new Date(NOW.getTime() - 60_000).toISOString(),
        },
        NOW,
      ).level,
    ).toBe(RiskLevel.Unknown);
  });

  it('honours an administrator override', () => {
    const result = calculateRisk(
      {
        severity: Severity.Low,
        verificationStatus: VerificationStatus.Pending,
        reportedAt: NOW.toISOString(),
        overrideLevel: RiskLevel.Critical,
      },
      NOW,
    );
    expect(result.level).toBe(RiskLevel.Critical);
    expect(result.rationale).toMatch(/override/i);
  });

  it('clamps the score to the 0–100 range', () => {
    const result = calculateRisk(
      {
        severity: Severity.Critical,
        verificationStatus: VerificationStatus.Verified,
        reportedAt: NOW.toISOString(),
        corroborationCount: 50,
      },
      NOW,
    );
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
