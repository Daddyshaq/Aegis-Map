import { SEVERITY_PRESENTATION } from '@crisis/config';
import { SEVERITIES } from '@crisis/types';
import type { DuplicateCandidate } from '@crisis/types';
import { createReportSchema, type CreateReportInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { LocationPicker } from '@/components/map/location-picker';
import { Container, PageHeader } from '@/components/page';
import { EvidencePicker } from '@/components/reports/evidence-picker';
import { SeverityBadge } from '@/components/status-badges';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useCategories } from '@/hooks/use-categories';
import {
  useCheckDuplicates,
  useCorroborateReport,
  useCreateReport,
  useUploadEvidence,
} from '@/hooks/use-reports';
import { formatDistanceMeters } from '@/lib/format';
import { routes } from '@/lib/routes';

/** Format a Date as a `datetime-local` input value in the user's local zone. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateReportPage() {
  const navigate = useNavigate();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createReport = useCreateReport();
  const checkDuplicates = useCheckDuplicates();
  const uploadEvidence = useUploadEvidence();
  const corroborate = useCorroborateReport();

  const [files, setFiles] = useState<File[]>([]);
  const [reportedAt, setReportedAt] = useState(() => toLocalInputValue(new Date()));
  const [uploading, setUploading] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const pending = useRef<CreateReportInput | null>(null);

  const form = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: '',
      description: '',
      locationName: '',
      isAnonymous: false,
    },
  });

  const lat = form.watch('lat');
  const lng = form.watch('lng');
  const busy = checkDuplicates.isPending || createReport.isPending || uploading;

  const buildPayload = (values: CreateReportInput): CreateReportInput => ({
    ...values,
    locationName: values.locationName?.trim() ? values.locationName.trim() : undefined,
    reportedAt: reportedAt ? new Date(reportedAt).toISOString() : undefined,
  });

  const finalize = async (payload: CreateReportInput) => {
    const report = await createReport.mutateAsync(payload);

    if (files.length > 0) {
      setUploading(true);
      let failed = 0;
      for (const file of files) {
        try {
          await uploadEvidence.mutateAsync({ reportId: report.id, file });
        } catch {
          failed += 1; // individual failures are toasted by the hook
        }
      }
      setUploading(false);
      if (failed > 0) {
        toast.warning(
          `Report submitted, but ${failed} file(s) failed to upload. You can retry from the report page.`,
        );
      }
    }

    toast.success('Report submitted. Thank you for helping keep people safe.');
    navigate(routes.reportDetail(report.id));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = buildPayload(values);
    pending.current = payload;
    try {
      const found = await checkDuplicates.mutateAsync(payload);
      if (found.length > 0) {
        setCandidates(found);
        setDupOpen(true);
        return;
      }
    } catch {
      // If duplicate-check fails, don't block the report — proceed to submit.
    }
    await finalize(payload);
  });

  const submitAsNew = async () => {
    const payload = pending.current;
    if (!payload) return;
    setDupOpen(false);
    const top = candidates[0];
    await finalize({ ...payload, notDuplicateOf: top?.report.id });
  };

  const corroborateExisting = async (id: string) => {
    try {
      await corroborate.mutateAsync(id);
      setDupOpen(false);
      navigate(routes.reportDetail(id));
    } catch {
      // toasted by hook
    }
  };

  return (
    <Container size="narrow" className="py-8">
      <PageHeader
        title="Report an incident"
        description="Share what's happening so others nearby can stay safe. Reports are reviewed by moderators before being marked verified."
      />

      <Alert className="mb-6">
        <Icon name="triangle-alert" className="size-4" aria-hidden />
        <AlertTitle>In immediate danger?</AlertTitle>
        <AlertDescription>
          Call emergency services first (112 in Nigeria). This platform does not replace official
          emergency response.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <Card>
            <CardContent className="space-y-5 p-5">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              categoriesLoading ? 'Loading categories…' : 'Select a category'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories ?? []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                              <Icon
                                name={category.icon}
                                className="size-4"
                                style={{ color: category.color }}
                                aria-hidden
                              />
                              {category.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Short summary (e.g. Flooding on Herbert Macaulay Way)"
                        maxLength={160}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What's happening?</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Describe the situation, who is affected, and any details that help others stay safe."
                        maxLength={5000}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Be factual. Avoid sharing others' personal information.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How serious is it?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITIES.map((severity) => (
                          <SelectItem key={severity} value={severity}>
                            <span className="flex items-center gap-2">
                              <Icon
                                name={SEVERITY_PRESENTATION[severity].icon}
                                className="size-4"
                                style={{ color: SEVERITY_PRESENTATION[severity].color }}
                                aria-hidden
                              />
                              {SEVERITY_PRESENTATION[severity].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="reported-at">When did this happen?</Label>
                <Input
                  id="reported-at"
                  type="datetime-local"
                  value={reportedAt}
                  max={toLocalInputValue(new Date())}
                  onChange={(e) => setReportedAt(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-semibold">Location</h2>
                <p className="text-sm text-muted-foreground">
                  Pinpoint where this is happening. This drives the map and nearby alerts.
                </p>
              </div>
              <LocationPicker
                value={lat != null && lng != null ? { lat, lng } : null}
                onChange={(pos) => {
                  form.setValue('lat', pos.lat, { shouldValidate: true });
                  form.setValue('lng', pos.lng, { shouldValidate: true });
                }}
                onResolveName={(name) => {
                  if (!form.getValues('locationName')) form.setValue('locationName', name);
                }}
              />
              {(form.formState.errors.lat || form.formState.errors.lng) && (
                <p className="text-sm font-medium text-destructive">
                  Please choose a location on the map.
                </p>
              )}

              <FormField
                control={form.control}
                name="locationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Wuse Market, Abuja"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-semibold">Evidence (optional)</h2>
                <p className="text-sm text-muted-foreground">
                  Photos or clips help moderators verify faster. Don't put yourself at risk to
                  capture them.
                </p>
              </div>
              <EvidencePicker files={files} onChange={setFiles} disabled={busy} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-tight">
                      <FormLabel className="cursor-pointer">Report anonymously</FormLabel>
                      <FormDescription>
                        Your name won't be shown publicly. Moderators can still see it for safety
                        and anti-abuse purposes.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(routes.home)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />}
              {uploading
                ? 'Uploading evidence…'
                : checkDuplicates.isPending
                  ? 'Checking…'
                  : 'Submit report'}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Possible duplicate reports</DialogTitle>
            <DialogDescription>
              We found existing reports nearby around the same time. If one matches, corroborate it
              instead — that strengthens verification without creating duplicates.
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-72 space-y-2 overflow-auto">
            {candidates.map(({ report, distanceMeters, minutesApart, similarityScore }) => (
              <li key={report.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{report.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceMeters(distanceMeters)} away · {minutesApart} min apart ·{' '}
                      {Math.round(similarityScore * 100)}% similar
                    </p>
                  </div>
                  <SeverityBadge severity={report.severity} size="sm" />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => corroborateExisting(report.id)}
                    disabled={corroborate.isPending}
                  >
                    <Icon name="users" className="mr-1.5 size-3.5" aria-hidden />
                    This is the same — corroborate
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={routes.reportDetail(report.id)}>View</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDupOpen(false)}
              disabled={busy}
            >
              Keep editing
            </Button>
            <Button type="button" onClick={submitAsNew} disabled={busy}>
              {busy && <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />}
              None match — submit as new
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
