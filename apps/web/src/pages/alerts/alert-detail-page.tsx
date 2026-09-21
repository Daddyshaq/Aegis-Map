import { SEVERITY_PRESENTATION } from '@crisis/config';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import { Markdown } from '@/components/markdown';
import { Container } from '@/components/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlert } from '@/hooks/use-alerts';
import { hexToRgba } from '@/lib/color';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { ALERT_TYPE_META } from '@/lib/labels';
import { routes } from '@/lib/routes';

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: alert, isLoading, isError, error, refetch } = useAlert(id);

  return (
    <Container size="narrow" className="py-8">
      <Link
        to={routes.alerts}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Icon name="arrow-left" className="size-4" aria-hidden />
        All alerts
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !alert ? (
        <ErrorState error={error} title="Alert unavailable" onRetry={() => void refetch()} />
      ) : (
        (() => {
          const meta = ALERT_TYPE_META[alert.type];
          const severity = SEVERITY_PRESENTATION[alert.severity];
          const expired = alert.expiresAt && new Date(alert.expiresAt).getTime() < Date.now();

          return (
            <article>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: hexToRgba(meta.color, 0.14), color: meta.color }}
                >
                  <Icon name={meta.icon} className="size-4" aria-hidden />
                  {meta.label}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-sm font-medium"
                  style={{ color: severity.color }}
                >
                  <Icon name={severity.icon} className="size-4" aria-hidden />
                  {severity.label} severity
                </span>
                {(!alert.isActive || expired) && (
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    No longer active
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{alert.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Published {formatRelativeTime(alert.publishedAt)}
                {alert.expiresAt && <> · Expires {formatDateTime(alert.expiresAt)}</>}
              </p>

              <div className="mt-6">
                <Markdown content={alert.body} />
              </div>

              {alert.centerLat != null && alert.centerLng != null && (
                <section className="mt-8">
                  <h2 className="mb-2 font-semibold">Affected area</h2>
                  {alert.radiusKm != null && (
                    <p className="mb-2 text-sm text-muted-foreground">
                      Approximately within {alert.radiusKm} km of the marked point.
                    </p>
                  )}
                  <div className="h-64 overflow-hidden rounded-lg border">
                    <MapView
                      interactive={false}
                      center={{ lat: alert.centerLat, lng: alert.centerLng }}
                      zoom={11}
                      markers={[
                        {
                          id: alert.id,
                          lat: alert.centerLat,
                          lng: alert.centerLng,
                          color: meta.color,
                          label: alert.title,
                        },
                      ]}
                      ariaLabel={`Map showing the area affected by ${alert.title}`}
                    />
                  </div>
                </section>
              )}
            </article>
          );
        })()
      )}
    </Container>
  );
}
