import {
  ALERT_RADIUS_OPTIONS_KM,
  DEFAULT_ALERT_RADIUS_KM,
  SEVERITY_PRESENTATION,
} from '@crisis/config';
import { ALERT_TYPES, AlertType, SEVERITIES, Severity } from '@crisis/types';
import type { Alert as CrisisAlert } from '@crisis/types';
import { createAlertSchema, type CreateAlertInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Pagination } from '@/components/pagination';
import { SeverityBadge } from '@/components/status-badges';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAlerts, useCreateAlert, useDeleteAlert } from '@/hooks/use-alerts';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { ALERT_TYPE_META } from '@/lib/labels';
import { SectionHeader } from '@/pages/admin/admin-layout';

export function AdminAlertsPage() {
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useAlerts({ activeOnly, page });
  const alerts = data?.items ?? [];

  return (
    <div>
      <SectionHeader
        title="Alerts"
        description="Publish emergency alerts and advisories. Alerts can broadcast to everyone or target an area, and reach users through in-app and push notifications."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" className="mr-1.5 size-4" aria-hidden />
            New alert
          </Button>
        }
      />

      <label className="mb-4 inline-flex items-center gap-2 text-sm">
        <Switch
          checked={activeOnly}
          onCheckedChange={(checked) => {
            setActiveOnly(checked);
            setPage(1);
          }}
        />
        Active alerts only
      </label>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon="megaphone"
          title="No alerts"
          description={
            activeOnly
              ? 'There are no active alerts right now.'
              : 'No alerts have been published yet.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <AlertRow alert={alert} />
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <CreateAlertForm onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertRow({ alert }: { alert: CrisisAlert }) {
  const deleteAlert = useDeleteAlert();
  const typeMeta = ALERT_TYPE_META[alert.type];
  const targeted = alert.centerLat != null && alert.centerLng != null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: typeMeta.color }}
            >
              <Icon name={typeMeta.icon} className="size-3" aria-hidden />
              {typeMeta.label}
            </span>
            <SeverityBadge severity={alert.severity} size="sm" />
            {alert.isActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500">
                <Icon name="circle-check" className="size-3.5" aria-hidden />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="circle" className="size-3.5" aria-hidden />
                Inactive
              </span>
            )}
          </div>

          <h3 className="mt-2 font-semibold leading-snug">{alert.title}</h3>
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
            {alert.body}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name={targeted ? 'map-pin' : 'megaphone'} className="size-3.5" aria-hidden />
              {targeted
                ? `Targeted · ${alert.centerLat?.toFixed(3)}, ${alert.centerLng?.toFixed(3)}${
                    alert.radiusKm ? ` · ${alert.radiusKm} km` : ''
                  }`
                : 'Broadcast to all users'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" aria-hidden />
              Published {formatRelativeTime(alert.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="timer-off" className="size-3.5" aria-hidden />
              {alert.expiresAt ? `Expires ${formatDateTime(alert.expiresAt)}` : 'No expiry'}
            </span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Icon name="trash" className="mr-1.5 size-4" aria-hidden />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this alert?</AlertDialogTitle>
              <AlertDialogDescription>
                “{alert.title}” will be withdrawn and no longer shown to users. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteAlert.mutate(alert.id)}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function CreateAlertForm({ onDone }: { onDone: () => void }) {
  const createAlert = useCreateAlert();
  const [targeted, setTargeted] = useState(false);
  const [expiresLocal, setExpiresLocal] = useState('');

  const form = useForm<CreateAlertInput>({
    resolver: zodResolver(createAlertSchema),
    defaultValues: {
      type: AlertType.Warning,
      severity: Severity.Moderate,
      title: '',
      body: '',
      centerLat: null,
      centerLng: null,
      radiusKm: null,
    },
  });

  const submit = form.handleSubmit((values) => {
    const input: CreateAlertInput = {
      ...values,
      centerLat: targeted ? (values.centerLat ?? null) : null,
      centerLng: targeted ? (values.centerLng ?? null) : null,
      radiusKm: targeted ? (values.radiusKm ?? null) : null,
      expiresAt: expiresLocal ? new Date(expiresLocal).toISOString() : null,
    };
    createAlert.mutate(input, { onSuccess: onDone });
  });

  const toggleTargeted = (checked: boolean) => {
    setTargeted(checked);
    if (checked) {
      form.setValue('radiusKm', DEFAULT_ALERT_RADIUS_KM);
    } else {
      form.setValue('centerLat', null);
      form.setValue('centerLng', null);
      form.setValue('radiusKm', null);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Publish an alert</DialogTitle>
        <DialogDescription>
          Alerts are delivered immediately. Keep the wording clear and actionable.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALERT_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <Icon
                              name={ALERT_TYPE_META[value].icon}
                              className="size-4"
                              style={{ color: ALERT_TYPE_META[value].color }}
                              aria-hidden
                            />
                            {ALERT_TYPE_META[value].label}
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
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Flash flood warning — Lokoja" maxLength={160} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={4000}
                    placeholder="What is happening, who is affected, and what people should do."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border p-3">
            <label className="flex items-center justify-between gap-2">
              <span>
                <span className="block text-sm font-medium">Target a specific area</span>
                <span className="block text-xs text-muted-foreground">
                  Off broadcasts to everyone. On notifies only users within the radius.
                </span>
              </span>
              <Switch checked={targeted} onCheckedChange={toggleTargeted} />
            </label>

            {targeted && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="centerLat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centre latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="9.0765"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="centerLng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centre longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="7.3986"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="radiusKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Radius</FormLabel>
                      <Select
                        value={field.value != null ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Radius" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ALERT_RADIUS_OPTIONS_KM.map((km) => (
                            <SelectItem key={km} value={String(km)}>
                              {km} km
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <div>
            <FormLabel htmlFor="alert-expires">Expires (optional)</FormLabel>
            <Input
              id="alert-expires"
              type="datetime-local"
              className="mt-2"
              value={expiresLocal}
              onChange={(e) => setExpiresLocal(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty for an alert with no automatic expiry.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAlert.isPending}>
              {createAlert.isPending && (
                <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              Publish alert
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
