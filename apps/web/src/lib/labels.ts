import {
  AccountStatus,
  AlertType,
  AppRole,
  ModerationAction,
  NotificationType,
  OperatingStatus,
  RouteRisk,
} from '@crisis/types';
import type {
  AccountStatus as AccountStatusType,
  AlertType as AlertTypeType,
  AppRole as AppRoleType,
  ModerationAction as ModerationActionType,
  NotificationType as NotificationTypeType,
  OperatingStatus as OperatingStatusType,
  RouteRisk as RouteRiskType,
} from '@crisis/types';

/**
 * Human-readable labels and presentation metadata for enums that don't have a
 * shared presentation record in `@crisis/config`. Kept on the web side because
 * they are purely UI concerns.
 */

export const MODERATION_ACTION_LABELS: Record<ModerationActionType, string> = {
  [ModerationAction.MarkUnderReview]: 'Marked under review',
  [ModerationAction.Verify]: 'Verified report',
  [ModerationAction.Reject]: 'Rejected report',
  [ModerationAction.RequestInfo]: 'Requested more information',
  [ModerationAction.MarkDuplicate]: 'Marked as duplicate',
  [ModerationAction.Escalate]: 'Escalated',
  [ModerationAction.Expire]: 'Expired',
  [ModerationAction.Reopen]: 'Reopened',
  [ModerationAction.AssignSeverity]: 'Adjusted severity',
};

export const ROLE_LABELS: Record<AppRoleType, string> = {
  [AppRole.Citizen]: 'Citizen',
  [AppRole.Moderator]: 'Moderator',
  [AppRole.Admin]: 'Administrator',
};

export const ACCOUNT_STATUS_META: Record<
  AccountStatusType,
  { label: string; icon: string; color: string }
> = {
  [AccountStatus.Active]: { label: 'Active', icon: 'circle-check', color: '#16a34a' },
  [AccountStatus.Suspended]: { label: 'Suspended', icon: 'ban', color: '#ca8a04' },
  [AccountStatus.Banned]: { label: 'Banned', icon: 'shield-x', color: '#dc2626' },
};

export const OPERATING_STATUS_META: Record<OperatingStatusType, { label: string; color: string }> =
  {
    [OperatingStatus.Open]: { label: 'Open', color: '#16a34a' },
    [OperatingStatus.Limited]: { label: 'Limited capacity', color: '#ca8a04' },
    [OperatingStatus.Full]: { label: 'At capacity', color: '#ea580c' },
    [OperatingStatus.Closed]: { label: 'Closed', color: '#dc2626' },
    [OperatingStatus.Unknown]: { label: 'Status unknown', color: '#6b7280' },
  };

export const ALERT_TYPE_META: Record<
  AlertTypeType,
  { label: string; icon: string; color: string }
> = {
  [AlertType.Emergency]: { label: 'Emergency', icon: 'octagon-alert', color: '#dc2626' },
  [AlertType.Warning]: { label: 'Warning', icon: 'triangle-alert', color: '#ea580c' },
  [AlertType.Advisory]: { label: 'Advisory', icon: 'info', color: '#2563eb' },
  [AlertType.Announcement]: { label: 'Announcement', icon: 'megaphone', color: '#6b7280' },
};

export const ROUTE_RISK_META: Record<
  RouteRiskType,
  { label: string; icon: string; color: string; description: string }
> = {
  [RouteRisk.Safe]: {
    label: 'Clear',
    icon: 'shield-check',
    color: '#16a34a',
    description: 'No reported hazards intersect this route.',
  },
  [RouteRisk.Low]: {
    label: 'Low risk',
    icon: 'shield-check',
    color: '#16a34a',
    description: 'Minor reported hazards near this route.',
  },
  [RouteRisk.Moderate]: {
    label: 'Moderate risk',
    icon: 'alert-circle',
    color: '#ca8a04',
    description: 'Some reported hazards near this route — stay alert.',
  },
  [RouteRisk.High]: {
    label: 'High risk',
    icon: 'triangle-alert',
    color: '#ea580c',
    description: 'Significant reported hazards near this route.',
  },
  [RouteRisk.Avoid]: {
    label: 'Avoid',
    icon: 'octagon-alert',
    color: '#dc2626',
    description: 'Serious reported hazards on this route — consider an alternative.',
  },
};

export const NOTIFICATION_TYPE_META: Record<NotificationTypeType, { icon: string; color: string }> =
  {
    [NotificationType.ReportReceived]: { icon: 'flag', color: '#2563eb' },
    [NotificationType.ReportVerified]: { icon: 'badge-check', color: '#16a34a' },
    [NotificationType.ReportRejected]: { icon: 'x-circle', color: '#6b7280' },
    [NotificationType.ReportInfoRequested]: { icon: 'circle-help', color: '#ca8a04' },
    [NotificationType.NearbyCrisis]: { icon: 'triangle-alert', color: '#ea580c' },
    [NotificationType.EmergencyAlert]: { icon: 'octagon-alert', color: '#dc2626' },
    [NotificationType.SafeLocationUpdate]: { icon: 'shield-check', color: '#0891b2' },
    [NotificationType.System]: { icon: 'bell', color: '#6b7280' },
  };
