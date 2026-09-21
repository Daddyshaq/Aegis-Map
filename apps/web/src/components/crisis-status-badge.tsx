import { CrisisStatus } from '@crisis/types';
import type { CrisisStatus as CrisisStatusType } from '@crisis/types';

import { Icon } from '@/components/icon';
import { hexToRgba } from '@/lib/color';
import { cn } from '@/lib/utils';

const CRISIS_STATUS_META: Record<
  CrisisStatusType,
  { label: string; icon: string; color: string; description: string }
> = {
  [CrisisStatus.Active]: {
    label: 'Active',
    icon: 'activity',
    color: '#dc2626',
    description: 'This incident is ongoing.',
  },
  [CrisisStatus.Contained]: {
    label: 'Contained',
    icon: 'shield-check',
    color: '#ca8a04',
    description: 'The situation is being brought under control.',
  },
  [CrisisStatus.Resolved]: {
    label: 'Resolved',
    icon: 'circle-check',
    color: '#16a34a',
    description: 'This incident has been resolved.',
  },
  [CrisisStatus.Expired]: {
    label: 'Expired',
    icon: 'timer-off',
    color: '#6b7280',
    description: 'This incident has aged out and may no longer be relevant.',
  },
};

export function CrisisStatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: CrisisStatusType;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = CRISIS_STATUS_META[status];
  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm'
          ? 'px-2 py-0.5 text-xs [&_svg]:size-3'
          : 'px-2.5 py-0.5 text-xs [&_svg]:size-3.5',
        className,
      )}
      style={{
        color: meta.color,
        backgroundColor: hexToRgba(meta.color, 0.12),
        borderColor: hexToRgba(meta.color, 0.4),
      }}
    >
      <Icon name={meta.icon} />
      {meta.label}
    </span>
  );
}
