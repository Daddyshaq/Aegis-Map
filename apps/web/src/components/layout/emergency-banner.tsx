import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { useAlerts } from '@/hooks/use-alerts';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * Site-wide banner for the most urgent active alert. Emergency/Warning alerts
 * are surfaced on every page; the user can dismiss them for the session.
 */
export function EmergencyBanner() {
  const { data } = useAlerts({ activeOnly: true, pageSize: 10 });
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const urgent = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .filter((a) => a.type === 'EMERGENCY' || a.type === 'WARNING')
      .filter((a) => !dismissed.has(a.id))
      .sort((a, b) => (a.type === 'EMERGENCY' ? -1 : 1) - (b.type === 'EMERGENCY' ? -1 : 1))[0];
  }, [data, dismissed]);

  if (!urgent) return null;

  const isEmergency = urgent.type === 'EMERGENCY';

  return (
    <div
      role="alert"
      className={cn(
        'border-b px-4 py-2 text-sm',
        isEmergency
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-amber-500 text-black dark:bg-amber-500/90',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Icon
          name={isEmergency ? 'octagon-alert' : 'triangle-alert'}
          className="size-5 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <span className="font-semibold">{urgent.title}</span>{' '}
          <Link to={routes.alertDetail(urgent.id)} className="underline underline-offset-2">
            View details
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 hover:bg-black/10"
          aria-label="Dismiss alert"
          onClick={() => setDismissed((prev) => new Set(prev).add(urgent.id))}
        >
          <Icon name="x" className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
