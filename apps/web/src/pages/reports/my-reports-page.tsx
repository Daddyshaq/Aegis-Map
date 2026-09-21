import { VERIFICATION_PRESENTATION } from '@crisis/config';
import { VERIFICATION_STATUSES } from '@crisis/types';
import type { VerificationStatus } from '@crisis/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Container, PageHeader } from '@/components/page';
import { Pagination } from '@/components/pagination';
import { ReportCard } from '@/components/reports/report-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyReports } from '@/hooks/use-reports';
import { routes } from '@/lib/routes';

const ALL = 'ALL';

export function MyReportsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<VerificationStatus | typeof ALL>(ALL);

  const { data, isLoading, isError, error, refetch, isFetching } = useMyReports({
    page,
    status: status === ALL ? undefined : status,
  });

  const items = data?.items ?? [];

  return (
    <Container className="py-8">
      <PageHeader
        title="My reports"
        description="Track the reports you've submitted and their verification status."
        actions={
          <Button asChild>
            <Link to={routes.report}>
              <Icon name="plus" className="mr-2 size-4" aria-hidden />
              New report
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm text-muted-foreground">
          Filter
        </label>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as VerificationStatus | typeof ALL);
            setPage(1);
          }}
        >
          <SelectTrigger id="status-filter" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {VERIFICATION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {VERIFICATION_PRESENTATION[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching && (
          <Icon name="loader" className="size-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="flag"
          title={status === ALL ? 'No reports yet' : 'No reports with this status'}
          description={
            status === ALL
              ? 'When you report an incident, it will appear here so you can follow its review.'
              : 'Try a different status filter.'
          }
          action={
            status === ALL ? (
              <Button asChild>
                <Link to={routes.report}>Report an incident</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 p-4">
              {items.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </CardContent>
          </Card>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </Container>
  );
}
