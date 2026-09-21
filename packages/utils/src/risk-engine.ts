import { DEFAULT_RISK_CONFIG, type RiskEngineConfig } from '@crisis/config';
import {
  RiskLevel,
  VerificationStatus,
  type Severity,
  type VerificationStatus as VS,
} from '@crisis/types';

export interface RiskInput {
  severity: Severity;
  verificationStatus: VS;
  /** ISO timestamp the incident was reported. */
  reportedAt: string;
  /** ISO expiry timestamp, if any. */
  expiresAt?: string | null;
  corroborationCount?: number;
  /** Optional admin override that pins the risk level. */
  overrideLevel?: RiskLevel | null;
}

export interface RiskAssessment {
  level: RiskLevel;
  /** 0–100 system-generated score. Not authoritative. */
  score: number;
  /** Human-readable, explicitly system-generated rationale. */
  rationale: string;
}

/** Exponential recency decay in [0,1] based on the configured half-life. */
export function recencyFactor(reportedAtMs: number, nowMs: number, halfLifeHours: number): number {
  const ageHours = Math.max(0, (nowMs - reportedAtMs) / 3_600_000);
  return Math.pow(0.5, ageHours / halfLifeHours);
}

function bandForScore(score: number, config: RiskEngineConfig): RiskLevel {
  for (const t of config.thresholds) {
    if (score >= t.min) return t.level;
  }
  return RiskLevel.Low;
}

/**
 * Compute a system-generated risk assessment for a crisis report.
 *
 * The result is deliberately labelled as system-generated and must never be
 * presented to users as an authoritative or scientific measure of danger.
 */
export function calculateRisk(
  input: RiskInput,
  now: Date = new Date(),
  config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
): RiskAssessment {
  // Admin override short-circuits the computation but is still explainable.
  if (input.overrideLevel && input.overrideLevel !== RiskLevel.Unknown) {
    return {
      level: input.overrideLevel,
      score: scoreForLevel(input.overrideLevel, config),
      rationale: 'Risk level set by an administrator override.',
    };
  }

  // Expired or rejected incidents carry no active risk.
  const nowMs = now.getTime();
  const expiresMs = input.expiresAt ? Date.parse(input.expiresAt) : null;
  if (
    input.verificationStatus === VerificationStatus.Rejected ||
    input.verificationStatus === VerificationStatus.Expired ||
    (expiresMs !== null && expiresMs <= nowMs)
  ) {
    return { level: RiskLevel.Unknown, score: 0, rationale: 'Incident is rejected or expired.' };
  }

  const base = config.severityPoints[input.severity] ?? 0;
  const verifiedMult =
    input.verificationStatus === VerificationStatus.Verified
      ? config.verifiedMultiplier
      : config.unverifiedMultiplier;

  const reportedMs = Date.parse(input.reportedAt);
  const recency = Number.isFinite(reportedMs)
    ? recencyFactor(reportedMs, nowMs, config.recencyHalfLifeHours)
    : 1;

  const corroboration = Math.min(
    config.maxCorroborationPoints,
    Math.max(0, input.corroborationCount ?? 0) * config.corroborationPoints,
  );

  const raw = (base * verifiedMult + corroboration) * recency;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const level = bandForScore(score, config);

  const verifiedText =
    input.verificationStatus === VerificationStatus.Verified ? 'verified' : 'unverified';
  return {
    level,
    score,
    rationale: `System estimate from ${verifiedText} ${input.severity.toLowerCase()} severity, ${input.corroborationCount ?? 0} corroborating report(s), and recency.`,
  };
}

/** Representative score used when a level is set directly (e.g. override). */
export function scoreForLevel(
  level: RiskLevel,
  config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
): number {
  const found = config.thresholds.find((t) => t.level === level);
  return found ? Math.min(100, found.min + 5) : 0;
}
