import { SEVERITY_PRESENTATION, VERIFICATION_PRESENTATION } from '@crisis/config';
import { SEVERITIES, VERIFICATION_STATUSES } from '@crisis/types';
import type { CrisisReport, Severity, VerificationStatus } from '@crisis/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { CrisisStatusBadge } from '@/components/crisis-status-badge';
import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Container, PageHeader } from '@/components/page';
import { Pagination } from '@/components/pagination';
import {
  CategoryChip,
  RiskBadge,
  SeverityBadge,
  VerificationBadge,
} from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/use-categories';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useModerationQueue } from '@/hooks/use-moderation';
import { formatRelativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';

const ALL = 'ALL';

export function ModerationQueuePage() {
  const [status, setStatus] = useState<VerificationStatus | typeof ALL>(ALL);
  const [severity, setSeverity] = useState<Severity | typeof ALL>(ALL);
  const [categoryId, setCategoryId] = useState<string | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 400);
  const { data: categories } = useCategories();

  const { data, isLoading, isError, error, refetch, isFetching } = useModerationQueue({
    status: status === ALL ? undefined : status,
    severity: severity === ALL ? undefined : severity,
    categoryId: categoryId === ALL ? undefined : categoryId,
    q: debouncedSearch.trim() || undefined,
    page,
  });

  const items = data?.items ?? [];
  const resetPage = () => setPage(1);

  return (
    <Container size="wide" className="py-8">
      <PageHeader
        title="Moderation queue"
        description="Review citizen reports and record a verification decision. Unverified reports are shown to the public as unconfirmed."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <Icon
              name="refresh"
              className={`mr-2 size-4 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden
            />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Search title or reference"
            className="pl-8"
            aria-label="Search reports"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as VerificationStatus | typeof ALL);
            resetPage();
          }}
        >
          <SelectTrigger aria-label="Filter by verification status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            {VERIFICATION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {VERIFICATION_PRESENTATION[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severity}
          onValueChange={(value) => {
            setSeverity(value as Severity | typeof ALL);
            resetPage();
          }}
        >
          <SelectTrigger aria-label="Filter by severity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any severity</SelectItem>
            {SEVERITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {SEVERITY_PRESENTATION[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value);
            resetPage();
          }}
        >
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any category</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="check-check"
          title="Nothing to review"
          description="There are no reports matching these filters. New citizen reports will appear here for verification."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((report) => (
              <li key={report.id}>
                <QueueRow report={report} />
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </Container>
  );
}

function QueueRow({ report }: { report: CrisisReport }) {
  const place = report.locationName ?? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`;
  const evidenceCount = report.evidence?.length ?? 0;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {report.category && (
              <CategoryChip
                name={report.category.name}
                icon={report.category.icon}
                color={report.category.color}
                size="sm"
              />
            )}
            <SeverityBadge severity={report.severity} size="sm" />
            <VerificationBadge status={report.verificationStatus} size="sm" />
            <CrisisStatusBadge status={report.status} size="sm" />
            <RiskBadge level={report.riskLevel} size="sm" />
          </div>

          <h2 className="mt-2 font-semibold leading-snug">
            <Link
              to={routes.moderationReport(report.id)}
              className="hover:underline focus-visible:underline"
            >
              {report.title}
            </Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{report.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="hash" className="size-3.5" aria-hidden />
              {report.reference}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="map-pin" className="size-3.5" aria-hidden />
              <span className="max-w-[16rem] truncate">{place}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" aria-hidden />
              {formatRelativeTime(report.reportedAt)}
            </span>
            {report.corroborationCount > 0 && (
              <span className="inline-flex items-center gap-1" title="Corroborating reports">
                <Icon name="users" className="size-3.5" aria-hidden />
                {report.corroborationCount}
              </span>
            )}
            {evidenceCount > 0 && (
              <span className="inline-flex items-center gap-1" title="Attached evidence">
                <Icon name="image" className="size-3.5" aria-hidden />
                {evidenceCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm">
            <Link to={routes.moderationReport(report.id)}>
              <Icon name="shield-check" className="mr-1.5 size-4" aria-hidden />
              Review
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
