import { RISK_PRESENTATION } from '@crisis/config';
import type { CrisisEvidence } from '@crisis/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CrisisStatusBadge } from '@/components/crisis-status-badge';
import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import { Container } from '@/components/page';
import { EvidenceGallery } from '@/components/reports/evidence-gallery';
import { EvidencePicker } from '@/components/reports/evidence-picker';
import {
  CategoryChip,
  RiskBadge,
  SeverityBadge,
  VerificationBadge,
} from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  useReport,
  useReportVerifications,
  useCorroborateReport,
  useUploadEvidence,
} from '@/hooks/use-reports';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { MODERATION_ACTION_LABELS } from '@/lib/labels';
import { queryKeys } from '@/lib/query-keys';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useWhat3Words } from '@/hooks/use-w3w';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, isError, error, refetch } = useReport(id);
  const { isAuthenticated, isModerator, profile } = useAuth();
  const corroborate = useCorroborateReport();

  if (isLoading) return <ReportDetailSkeleton />;
  if (isError || !report) {
    return (
      <Container size="narrow" className="py-8">
        <BackLink />
        <ErrorState error={error} title="Report unavailable" onRetry={() => void refetch()} />
      </Container>
    );
  }

  const risk = RISK_PRESENTATION[report.riskLevel];
  const isOwner = !!profile && profile.id === report.reportedBy;
  const canCorroborate = isAuthenticated && !isOwner;
  const { data: w3w } = useWhat3Words(report.lat, report.lng);

  const copyW3W = useCallback(() => {
    if (!w3w?.words) return;
    const text = w3w.words.startsWith('///') ? w3w.words : `///${w3w.words}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied ${text}`),
      () => toast.error('Failed to copy.'),
    );
  }, [w3w]);

  return (
    <Container size="narrow" className="py-8">
      <BackLink />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
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

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{report.title}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Icon name="hash" className="size-3.5" aria-hidden />
          {report.reference}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" className="size-3.5" aria-hidden />
          Reported {formatRelativeTime(report.reportedAt)}
        </span>
        {report.locationName && (
          <span className="inline-flex items-center gap-1">
            <Icon name="map-pin" className="size-3.5" aria-hidden />
            {report.locationName}
          </span>
        )}
      </p>

      {/* Risk advisory — never presented as authoritative safety guidance. */}
      <div
        className="mt-4 flex items-start gap-2 rounded-md border p-3 text-sm"
        style={{ borderColor: `${risk.color}55`, backgroundColor: `${risk.color}10` }}
      >
        <Icon
          name={risk.icon}
          className="mt-0.5 size-4 shrink-0"
          style={{ color: risk.color }}
          aria-hidden
        />
        <p>
          <span className="font-medium">{risk.label} risk (automated estimate).</span>{' '}
          {risk.description} This is a computed signal, not a guarantee — always follow official
          guidance.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="mb-2 font-semibold">Description</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
            {report.description}
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Location</h2>
          <div className="h-64 overflow-hidden rounded-lg border">
            <MapView
              interactive={false}
              center={{ lat: report.lat, lng: report.lng }}
              zoom={14}
              markers={[
                {
                  id: report.id,
                  lat: report.lat,
                  lng: report.lng,
                  color: risk.color,
                  label: report.title,
                },
              ]}
              ariaLabel={`Map showing the location of ${report.title}`}
            />
          </div>
          {/* What3Words + coordinates row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-muted-foreground">
              Coordinates:{' '}
              <span className="font-medium text-foreground">
                {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
              </span>
            </p>
            {w3w?.words && (
              <button
                type="button"
                onClick={copyW3W}
                title="Click to copy What3Words address"
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
              >
                <Icon name="grid-3x3" className="size-3" aria-hidden />
                {w3w.words.startsWith('///') ? w3w.words : `///${w3w.words}`}
                <Icon name="copy" className="ml-0.5 size-3 opacity-60" aria-hidden />
              </button>
            )}
          </div>
        </section>

        <EvidenceSection report={report} isOwner={isOwner} />

        {/* Corroboration */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold">
                {report.corroborationCount} corroboration
                {report.corroborationCount === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-muted-foreground">
                Corroborations from other people strengthen a report's credibility.
              </p>
            </div>
            {canCorroborate ? (
              <Button
                onClick={() => corroborate.mutate(report.id)}
                disabled={corroborate.isPending}
              >
                {corroborate.isPending ? (
                  <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Icon name="users" className="mr-2 size-4" aria-hidden />
                )}
                I can confirm this
              </Button>
            ) : isOwner ? (
              <p className="text-sm text-muted-foreground">This is your report.</p>
            ) : (
              <Button asChild variant="outline">
                <Link
                  to={routes.login}
                  state={{ from: { pathname: routes.reportDetail(report.id) } }}
                >
                  Sign in to corroborate
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {isModerator && <ModeratorSection reportId={report.id} />}
      </div>
    </Container>
  );
}

function BackLink() {
  return (
    <Link
      to={routes.home}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon name="arrow-left" className="size-4" aria-hidden />
      Back to map
    </Link>
  );
}

function EvidenceSection({
  report,
  isOwner,
}: {
  report: { id: string; evidence?: CrisisEvidence[] };
  isOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const uploadEvidence = useUploadEvidence();
  const [files, setFiles] = useState<File[]>([]);
  const [adding, setAdding] = useState(false);

  const evidence = report.evidence ?? [];

  const upload = async () => {
    if (files.length === 0) return;
    setAdding(true);
    let ok = 0;
    for (const file of files) {
      try {
        await uploadEvidence.mutateAsync({ reportId: report.id, file });
        ok += 1;
      } catch {
        // toasted by the hook
      }
    }
    setAdding(false);
    setFiles([]);
    if (ok > 0) {
      toast.success(`${ok} file(s) uploaded.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.detail(report.id) });
    }
  };

  return (
    <section>
      <h2 className="mb-2 font-semibold">Evidence</h2>
      <EvidenceGallery evidence={evidence} />

      {isOwner && (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Add more evidence</p>
          <EvidencePicker files={files} onChange={setFiles} disabled={adding} />
          {files.length > 0 && (
            <Button onClick={upload} disabled={adding} size="sm">
              {adding && <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />}
              Upload {files.length} file{files.length === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function ModeratorSection({ reportId }: { reportId: string }) {
  const { data: verifications, isLoading } = useReportVerifications(reportId, true);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Moderation history</CardTitle>
        <Button asChild size="sm">
          <Link to={routes.moderationReport(reportId)}>
            <Icon name="shield-check" className="mr-1.5 size-4" aria-hidden />
            Review
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !verifications || verifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No moderation actions recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {verifications.map((v) => (
              <li key={v.id} className="flex gap-3">
                <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-muted">
                  <Icon name="shield-check" className="size-3.5" aria-hidden />
                </span>
                <div className="text-sm">
                  <p className="font-medium">{MODERATION_ACTION_LABELS[v.action] ?? v.action}</p>
                  {v.notes && <p className="text-muted-foreground">{v.notes}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(v.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ReportDetailSkeleton() {
  return (
    <Container size="narrow" className="py-8">
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="mb-3 h-6 w-40" />
      <Skeleton className="mb-2 h-9 w-3/4" />
      <Skeleton className="mb-6 h-4 w-1/2" />
      <Skeleton className="mb-4 h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </Container>
  );
}
