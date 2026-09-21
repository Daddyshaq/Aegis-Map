import type { ReactNode } from 'react';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

/** Neutral empty state for lists and search results. */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center',
        className,
      )}
    >
      <Icon name={icon} className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Error state for failed queries, with an optional retry. */
export function ErrorState({
  error,
  onRetry,
  title = 'Could not load data',
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-10 text-center',
        className,
      )}
    >
      <Icon name="triangle-alert" className="size-10 text-destructive" aria-hidden />
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Icon name="refresh" className="mr-2 size-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
