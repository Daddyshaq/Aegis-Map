import { SEVERITY_PRESENTATION } from '@crisis/config';
import type { Alert as AlertEntity } from '@crisis/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Container, PageHeader } from '@/components/page';
import { Pagination } from '@/components/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAlerts } from '@/hooks/use-alerts';
import { hexToRgba } from '@/lib/color';
import { formatRelativeTime } from '@/lib/format';
import { ALERT_TYPE_META } from '@/lib/labels';
import { routes } from '@/lib/routes';

export function AlertsPage() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useAlerts({ activeOnly, page });
  const items = data?.items ?? [];

  return (
    <Container className="py-8">
      <PageHeader
        title="Safety alerts"
        description="Official emergency alerts, warnings, and advisories issued for your region."
        actions={
          <div className="flex items-center gap-2">
            <Switch
              id="active-only"
              checked={activeOnly}
              onCheckedChange={(checked) => {
                setActiveOnly(checked);
                setPage(1);
              }}
            />
            <Label htmlFor="active-only" className="cursor-pointer text-sm">
              Active only
            </Label>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell-off"
          title={activeOnly ? 'No active alerts' : 'No alerts'}
          description={
            activeOnly
              ? 'There are no active safety alerts right now. That’s good news.'
              : 'No alerts have been published yet.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((alert) => (
              <li key={alert.id}>
                <AlertRow alert={alert} />
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </Container>
  );
}

function AlertRow({ alert }: { alert: AlertEntity }) {
  const meta = ALERT_TYPE_META[alert.type];
  const severity = SEVERITY_PRESENTATION[alert.severity];

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <Link to={routes.alertDetail(alert.id)} className="group flex items-start gap-3">
          <span
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: hexToRgba(meta.color, 0.14), color: meta.color }}
          >
            <Icon name={meta.icon} className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                style={{ color: meta.color, borderColor: hexToRgba(meta.color, 0.4) }}
              >
                {meta.label}
              </span>
              <span
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: severity.color }}
              >
                <Icon name={severity.icon} className="size-3.5" aria-hidden />
                {severity.label}
              </span>
              {!alert.isActive && <span className="text-xs text-muted-foreground">· Inactive</span>}
            </div>
            <h2 className="mt-1 font-semibold leading-snug group-hover:underline">{alert.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{alert.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Published {formatRelativeTime(alert.publishedAt)}
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
