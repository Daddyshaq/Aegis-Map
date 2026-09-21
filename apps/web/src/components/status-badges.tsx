import {
  RISK_PRESENTATION,
  SAFE_LOCATION_PRESENTATION,
  SEVERITY_PRESENTATION,
  VERIFICATION_PRESENTATION,
} from '@crisis/config';
import type { RiskLevel, SafeLocationType, Severity, VerificationStatus } from '@crisis/types';

import { Icon } from '@/components/icon';
import { hexToRgba, readableTextColor } from '@/lib/color';
import { cn } from '@/lib/utils';

interface BaseBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

/** Solid badge used for urgency signals (risk, severity). Icon + text ensure
 * meaning is never carried by colour alone. */
function SolidBadge({
  color,
  icon,
  label,
  title,
  className,
  size = 'md',
}: {
  color: string;
  icon: string;
  label: string;
  title?: string;
} & BaseBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm'
          ? 'px-2 py-0.5 text-xs [&_svg]:size-3'
          : 'px-2.5 py-0.5 text-xs [&_svg]:size-3.5',
        className,
      )}
      style={{ backgroundColor: color, color: readableTextColor(color) }}
      title={title}
    >
      <Icon name={icon} />
      {label}
    </span>
  );
}

/** Soft badge used for state signals (verification, place type). */
function SoftBadge({
  color,
  icon,
  label,
  title,
  className,
  size = 'md',
}: {
  color: string;
  icon: string;
  label: string;
  title?: string;
} & BaseBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm'
          ? 'px-2 py-0.5 text-xs [&_svg]:size-3'
          : 'px-2.5 py-0.5 text-xs [&_svg]:size-3.5',
        className,
      )}
      style={{
        color,
        backgroundColor: hexToRgba(color, 0.12),
        borderColor: hexToRgba(color, 0.4),
      }}
      title={title}
    >
      <Icon name={icon} />
      {label}
    </span>
  );
}

export function RiskBadge({ level, ...rest }: { level: RiskLevel } & BaseBadgeProps) {
  const p = RISK_PRESENTATION[level];
  return (
    <SolidBadge color={p.color} icon={p.icon} label={p.label} title={p.description} {...rest} />
  );
}

export function SeverityBadge({ severity, ...rest }: { severity: Severity } & BaseBadgeProps) {
  const p = SEVERITY_PRESENTATION[severity];
  return <SolidBadge color={p.color} icon={p.icon} label={p.label} {...rest} />;
}

export function VerificationBadge({
  status,
  ...rest
}: { status: VerificationStatus } & BaseBadgeProps) {
  const p = VERIFICATION_PRESENTATION[status];
  return (
    <SoftBadge color={p.color} icon={p.icon} label={p.label} title={p.description} {...rest} />
  );
}

export function SafeLocationTypeBadge({
  type,
  ...rest
}: { type: SafeLocationType } & BaseBadgeProps) {
  const p = SAFE_LOCATION_PRESENTATION[type];
  return <SoftBadge color={p.color} icon={p.icon} label={p.label} {...rest} />;
}

/** Chip for a crisis category using its DB-driven colour + icon. */
export function CategoryChip({
  name,
  icon,
  color,
  ...rest
}: { name: string; icon: string; color: string } & BaseBadgeProps) {
  return <SoftBadge color={color} icon={icon} label={name} {...rest} />;
}
