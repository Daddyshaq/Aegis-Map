import { RiskLevel, Severity, SafeLocationType, VerificationStatus } from '@crisis/types';

/**
 * UI presentation metadata for enums. Colour is paired with an icon, label and
 * pattern so status is never conveyed by colour alone (accessibility).
 */

export interface RiskPresentation {
  level: RiskLevel;
  label: string;
  /** Tailwind-friendly hex. */
  color: string;
  textColor: string;
  icon: string;
  description: string;
}

export const RISK_PRESENTATION: Record<RiskLevel, RiskPresentation> = {
  [RiskLevel.Critical]: {
    level: RiskLevel.Critical,
    label: 'Critical',
    color: '#dc2626',
    textColor: '#ffffff',
    icon: 'octagon-alert',
    description: 'Extreme danger. Avoid the area and follow official guidance.',
  },
  [RiskLevel.High]: {
    level: RiskLevel.High,
    label: 'High',
    color: '#ea580c',
    textColor: '#ffffff',
    icon: 'triangle-alert',
    description: 'High risk. Exercise strong caution.',
  },
  [RiskLevel.Moderate]: {
    level: RiskLevel.Moderate,
    label: 'Moderate',
    color: '#ca8a04',
    textColor: '#1a1a1a',
    icon: 'alert-circle',
    description: 'Moderate risk. Stay alert and informed.',
  },
  [RiskLevel.Low]: {
    level: RiskLevel.Low,
    label: 'Low',
    color: '#16a34a',
    textColor: '#ffffff',
    icon: 'shield-check',
    description: 'Low reported risk. Remain aware of your surroundings.',
  },
  [RiskLevel.Unknown]: {
    level: RiskLevel.Unknown,
    label: 'Unknown',
    color: '#6b7280',
    textColor: '#ffffff',
    icon: 'circle-help',
    description: 'Insufficient information to assess risk.',
  },
};

export const SEVERITY_PRESENTATION: Record<
  Severity,
  { label: string; color: string; icon: string }
> = {
  [Severity.Critical]: { label: 'Critical', color: '#dc2626', icon: 'octagon-alert' },
  [Severity.High]: { label: 'High', color: '#ea580c', icon: 'triangle-alert' },
  [Severity.Moderate]: { label: 'Moderate', color: '#ca8a04', icon: 'alert-circle' },
  [Severity.Low]: { label: 'Low', color: '#16a34a', icon: 'info' },
};

export const VERIFICATION_PRESENTATION: Record<
  VerificationStatus,
  { label: string; color: string; icon: string; description: string }
> = {
  [VerificationStatus.Verified]: {
    label: 'Verified',
    color: '#16a34a',
    icon: 'badge-check',
    description: 'Reviewed and confirmed by a moderator.',
  },
  [VerificationStatus.UnderReview]: {
    label: 'Under review',
    color: '#2563eb',
    icon: 'search',
    description: 'A moderator is currently reviewing this report.',
  },
  [VerificationStatus.Pending]: {
    label: 'Unverified',
    color: '#ca8a04',
    icon: 'clock',
    description: 'Citizen report awaiting moderation. Treat as unconfirmed.',
  },
  [VerificationStatus.Rejected]: {
    label: 'Rejected',
    color: '#6b7280',
    icon: 'x-circle',
    description: 'Reviewed and found to be false, duplicate, or unverifiable.',
  },
  [VerificationStatus.Expired]: {
    label: 'Expired',
    color: '#9ca3af',
    icon: 'timer-off',
    description: 'This incident has aged out and may no longer be active.',
  },
};

export const SAFE_LOCATION_PRESENTATION: Record<
  SafeLocationType,
  { label: string; icon: string; color: string }
> = {
  [SafeLocationType.Shelter]: { label: 'Shelter', icon: 'tent', color: '#0891b2' },
  [SafeLocationType.Hospital]: { label: 'Hospital', icon: 'cross', color: '#dc2626' },
  [SafeLocationType.Police]: { label: 'Police', icon: 'shield', color: '#1d4ed8' },
  [SafeLocationType.FireStation]: { label: 'Fire station', icon: 'flame', color: '#ea580c' },
  [SafeLocationType.EvacuationCenter]: {
    label: 'Evacuation center',
    icon: 'building',
    color: '#0d9488',
  },
  [SafeLocationType.ReliefCenter]: {
    label: 'Relief center',
    icon: 'heart-handshake',
    color: '#7c3aed',
  },
  [SafeLocationType.Other]: { label: 'Other', icon: 'map-pin', color: '#4b5563' },
};

export const APP_NAME = 'Aegis Map';
export const APP_TAGLINE = 'Crisis reporting & safe location mapping';
