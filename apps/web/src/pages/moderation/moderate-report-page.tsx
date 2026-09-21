import { RISK_PRESENTATION, SEVERITY_PRESENTATION } from '@crisis/config';
import { ModerationAction, MODERATION_ACTIONS, SEVERITIES } from '@crisis/types';
import type { CrisisReport, ModerationAction as ModerationActionType } from '@crisis/types';
import { moderateReportSchema, type ModerateReportInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import { CrisisStatusBadge } from '@/components/crisis-status-badge';
import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import { Container } from '@/components/page';
import { EvidenceGallery } from '@/components/reports/evidence-gallery';
import {
  CategoryChip,
  RiskBadge,
  SeverityBadge,
  VerificationBadge,
} from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useModerateReport } from '@/hooks/use-moderation';
import { useReport, useReportVerifications } from '@/hooks/use-reports';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { MODERATION_ACTION_LABELS } from '@/lib/labels';
import { routes } from '@/lib/routes';

/** Present-tense, imperative labels + guidance for each moderation action. */
const ACTION_META: Record<
  ModerationActionType,
  { label: string; description: string; icon: string; destructive?: boolean }
> = {
  [ModerationAction.Verify]: {
    label: 'Verify report',
    description: 'Confirm the report is accurate. It will be shown to the public as verified.',
    icon: 'badge-check',
  },
  [ModerationAction.Reject]: {
    label: 'Reject report',
    description: 'Mark as false, unverifiable, or spam. It will be hidden from public views.',
    icon: 'x-circle',
    destructive: true,
  },
  [ModerationAction.MarkUnderReview]: {
    label: 'Mark under review',
    description: 'Signal that a moderator is actively investigating this report.',
    icon: 'search',
  },
  [ModerationAction.RequestInfo]: {
    label: 'Request more information',
    description: 'Notify the reporter that more detail or evidence is needed.',
    icon: 'circle-help',
  },
  [ModerationAction.MarkDuplicate]: {
    label: 'Mark as duplicate',
    description: 'Link this report to an existing report of the same incident.',
    icon: 'copy',
  },
  [ModerationAction.Escalate]: {
    label: 'Escalate',
    description: 'Raise this report for urgent attention.',
    icon: 'triangle-alert',
  },
  [ModerationAction.AssignSeverity]: {
    label: 'Adjust severity',
    description: 'Override the severity level assigned to this report.',
    icon: 'gauge',
  },
  [ModerationAction.Expire]: {
    label: 'Expire report',
    description: 'Mark the incident as no longer active. It is removed from live views.',
    icon: 'timer-off',
    destructive: true,
  },
  [ModerationAction.Reopen]: {
    label: 'Reopen',
    description: 'Return a closed or expired report to the active queue.',
    icon: 'refresh',
  },
};

export function ModerateReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, isError, error, refetch } = useReport(id);

  return (
    <Container size="wide" className="py-8">
      <Link
        to={routes.moderation}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Icon name="arrow-left" className="size-4" aria-hidden />
        Back to queue
      </Link>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError || !report ? (
        <ErrorState error={error} title="Report unavailable" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <ReportContext report={report} />
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <ModerationPanel report={report} />
            <VerificationHistory reportId={report.id} />
          </div>
        </div>
      )}
    </Container>
  );
}

function ReportContext({ report }: { report: CrisisReport }) {
  const risk = RISK_PRESENTATION[report.riskLevel];

  return (
    <article className="min-w-0">
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

      <h1 className="mt-3 text-2xl font-bold tracking-tight">{report.title}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Icon name="hash" className="size-3.5" aria-hidden />
          {report.reference}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" className="size-3.5" aria-hidden />
          Reported {formatRelativeTime(report.reportedAt)}
        </span>
        {report.isAnonymous && (
          <span className="inline-flex items-center gap-1">
            <Icon name="user-x" className="size-3.5" aria-hidden />
            Anonymous
          </span>
        )}
        {report.locationName && (
          <span className="inline-flex items-center gap-1">
            <Icon name="map-pin" className="size-3.5" aria-hidden />
            {report.locationName}
          </span>
        )}
      </p>

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
          <span className="font-medium">
            {risk.label} risk (automated estimate, score {report.riskScore}).
          </span>{' '}
          {risk.description} Verify against the evidence below before deciding.
        </p>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Description</h2>
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
          {report.description}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Location</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
        </p>
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
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">
          Evidence
          {report.evidence && report.evidence.length > 0 ? ` (${report.evidence.length})` : ''}
        </h2>
        <EvidenceGallery evidence={report.evidence ?? []} />
      </section>

      <div className="mt-6">
        <Button asChild variant="outline" size="sm">
          <Link to={routes.reportDetail(report.id)}>
            <Icon name="external-link" className="mr-2 size-4" aria-hidden />
            View public report page
          </Link>
        </Button>
      </div>
    </article>
  );
}

function ModerationPanel({ report }: { report: CrisisReport }) {
  const moderate = useModerateReport();

  const form = useForm<ModerateReportInput>({
    resolver: zodResolver(moderateReportSchema),
    defaultValues: {
      action: undefined,
      notes: '',
      severity: undefined,
      duplicateOfId: undefined,
    },
  });

  const action = form.watch('action');
  const selectedMeta = action ? ACTION_META[action] : null;

  const submit = form.handleSubmit((values) => {
    moderate.mutate(
      {
        id: report.id,
        input: {
          ...values,
          notes: values.notes?.trim() ? values.notes.trim() : undefined,
        },
      },
      {
        onSuccess: () =>
          form.reset({
            action: undefined,
            notes: '',
            severity: undefined,
            duplicateOfId: undefined,
          }),
      },
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="shield-check" className="size-4" aria-hidden />
          Record a decision
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => {
                      const next = value as ModerationActionType;
                      field.onChange(next);
                      if (next !== ModerationAction.AssignSeverity) {
                        form.setValue('severity', undefined);
                      } else if (!form.getValues('severity')) {
                        form.setValue('severity', report.severity);
                      }
                      if (next !== ModerationAction.MarkDuplicate) {
                        form.setValue('duplicateOfId', undefined);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an action…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODERATION_ACTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <Icon name={ACTION_META[value].icon} className="size-4" aria-hidden />
                            {ACTION_META[value].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMeta && <FormDescription>{selectedMeta.description}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            {action === ModerationAction.AssignSeverity && (
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New severity</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITIES.map((value) => (
                          <SelectItem key={value} value={value}>
                            <span className="flex items-center gap-2">
                              <Icon
                                name={SEVERITY_PRESENTATION[value].icon}
                                className="size-4"
                                style={{ color: SEVERITY_PRESENTATION[value].color }}
                                aria-hidden
                              />
                              {SEVERITY_PRESENTATION[value].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {action === ModerationAction.MarkDuplicate && (
              <FormField
                control={form.control}
                name="duplicateOfId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canonical report ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.trim() || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Paste the ID of the report this duplicates. You can copy it from that report's
                      page URL (…/reports/&lt;id&gt;).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      maxLength={2000}
                      placeholder="Reasoning or context for this decision. Shared with other moderators."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              variant={selectedMeta?.destructive ? 'destructive' : 'default'}
              disabled={moderate.isPending}
            >
              {moderate.isPending ? (
                <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <Icon name="check" className="mr-2 size-4" aria-hidden />
              )}
              {selectedMeta ? selectedMeta.label : 'Submit decision'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function VerificationHistory({ reportId }: { reportId: string }) {
  const { data: verifications, isLoading } = useReportVerifications(reportId, true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Moderation history</CardTitle>
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
                  <Icon
                    name={ACTION_META[v.action]?.icon ?? 'shield-check'}
                    className="size-3.5"
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 text-sm">
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
