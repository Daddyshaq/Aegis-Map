import { SEVERITY_PRESENTATION } from '@crisis/config';
import type { AdminStats } from '@crisis/types';

import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/use-admin';
import { formatDate, formatDuration, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/pages/admin/admin-layout';

/** Turn an enum label or slug ("UNDER_REVIEW", "armed-conflict") into a title. */
function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface StatDef {
  key: keyof AdminStats;
  label: string;
  icon: string;
  color?: string;
}

const HEADLINE_STATS: StatDef[] = [
  { key: 'totalReports', label: 'Total reports', icon: 'flag' },
  { key: 'activeCrises', label: 'Active crises', icon: 'triangle-alert', color: '#ea580c' },
  {
    key: 'criticalIncidents',
    label: 'Critical incidents',
    icon: 'octagon-alert',
    color: '#dc2626',
  },
  { key: 'activeAlerts', label: 'Active alerts', icon: 'megaphone', color: '#2563eb' },
];

const FUNNEL_STATS: StatDef[] = [
  { key: 'pendingReports', label: 'Pending', icon: 'circle-help' },
  { key: 'underReviewReports', label: 'Under review', icon: 'search' },
  { key: 'verifiedReports', label: 'Verified', icon: 'badge-check', color: '#16a34a' },
  { key: 'rejectedReports', label: 'Rejected', icon: 'x-circle' },
  { key: 'expiredReports', label: 'Expired', icon: 'timer-off' },
];

const RESOURCE_STATS: StatDef[] = [
  { key: 'safeLocations', label: 'Safe locations', icon: 'shield-check', color: '#0891b2' },
  { key: 'totalUsers', label: 'Registered users', icon: 'users' },
];

export function AdminDashboardPage() {
  const { data: stats, isLoading, isError, error, refetch } = useAdminStats();

  if (isLoading) {
    return (
      <div>
        <SectionHeader title="Overview" description="Operational snapshot across the platform." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div>
        <SectionHeader title="Overview" />
        <ErrorState
          error={error}
          title="Could not load statistics"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Overview"
        description="Operational snapshot across the platform. Counts reflect the current state."
      />

      <section aria-label="Headline metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HEADLINE_STATS.map((stat) => (
          <StatCard key={stat.key} def={stat} value={stats[stat.key]} />
        ))}
      </section>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Verification funnel
      </h3>
      <section
        aria-label="Verification funnel"
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {FUNNEL_STATS.map((stat) => (
          <StatCard key={stat.key} def={stat} value={stats[stat.key]} />
        ))}
      </section>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Resources
      </h3>
      <section aria-label="Resources" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCE_STATS.map((stat) => (
          <StatCard key={stat.key} def={stat} value={stats[stat.key]} />
        ))}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
              <Icon name="clock" className="size-5 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-2xl font-bold tabular-nums">
                {stats.medianVerificationMinutes == null
                  ? '—'
                  : formatDuration(stats.medianVerificationMinutes * 60)}
              </div>
              <div className="truncate text-sm text-muted-foreground">Median time to verify</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="Reports by severity"
          rows={stats.reportsBySeverity.map((row) => ({
            label: SEVERITY_PRESENTATION[row.severity]?.label ?? humanize(row.severity),
            count: row.count,
            color: SEVERITY_PRESENTATION[row.severity]?.color,
          }))}
        />
        <Breakdown
          title="Reports by status"
          rows={stats.reportsByStatus.map((row) => ({
            label: humanize(row.status),
            count: row.count,
          }))}
        />
        <Breakdown
          title="Reports by category"
          rows={stats.reportsByCategory.map((row) => ({
            label: humanize(row.categorySlug),
            count: row.count,
          }))}
        />
        <TrendCard data={stats.reportsOverTime} />
      </div>
    </div>
  );
}

function StatCard({ def, value }: { def: StatDef; value: AdminStats[keyof AdminStats] }) {
  const numeric = typeof value === 'number' ? value : 0;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: def.color ? `${def.color}1a` : undefined }}
        >
          <Icon
            name={def.icon}
            className={cn('size-5', !def.color && 'text-muted-foreground')}
            style={def.color ? { color: def.color } : undefined}
            aria-hidden
          />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums">{formatNumber(numeric)}</div>
          <div className="truncate text-sm text-muted-foreground">{def.label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BreakdownRow {
  label: string;
  count: number;
  color?: string;
}

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row) => (
              <li key={row.label} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3">
                <span className="truncate text-sm">{row.label}</span>
                <span className="h-2 rounded-full bg-muted" aria-hidden>
                  <span
                    className={cn('block h-2 rounded-full', !row.color && 'bg-primary')}
                    style={{
                      width: max > 0 ? `${Math.max((row.count / max) * 100, 2)}%` : '0%',
                      ...(row.color ? { backgroundColor: row.color } : {}),
                    }}
                  />
                </span>
                <span className="text-sm font-medium tabular-nums">{formatNumber(row.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TrendCard({ data }: { data: AdminStats['reportsOverTime'] }) {
  const max = data.reduce((acc, point) => Math.max(acc, point.count), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Reports over time</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div
            className="flex h-32 items-end gap-1"
            role="img"
            aria-label={`Daily report counts for the last ${data.length} days`}
          >
            {data.map((point) => (
              <div
                key={point.date}
                className="group relative flex-1"
                title={`${formatDate(point.date)}: ${point.count}`}
              >
                <div
                  className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: max > 0 ? `${Math.max((point.count / max) * 100, 2)}%` : '0%' }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
