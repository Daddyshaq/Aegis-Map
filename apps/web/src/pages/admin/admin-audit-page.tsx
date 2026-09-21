import type { AppRole, AuditLog } from '@crisis/types';
import { useEffect, useState } from 'react';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLog } from '@/hooks/use-admin';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { SectionHeader } from '@/pages/admin/admin-layout';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

function toJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(1);

  const debouncedAction = useDebouncedValue(action, 400);
  const debouncedResourceType = useDebouncedValue(resourceType, 400);
  const debouncedActorId = useDebouncedValue(actorId, 400);

  const actorIdValid = debouncedActorId.trim() === '' || UUID_RE.test(debouncedActorId.trim());

  useEffect(() => {
    setPage(1);
  }, [debouncedAction, debouncedResourceType, debouncedActorId]);

  const { data, isLoading, isError, error, refetch } = useAuditLog({
    action: debouncedAction.trim() || undefined,
    resourceType: debouncedResourceType.trim() || undefined,
    actorId: actorIdValid && debouncedActorId.trim() ? debouncedActorId.trim() : undefined,
    page,
  });

  const entries = data?.items ?? [];
  const hasFilters = !!(action || resourceType || actorId);

  const clearFilters = () => {
    setAction('');
    setResourceType('');
    setActorId('');
  };

  return (
    <div>
      <SectionHeader
        title="Audit log"
        description="An immutable record of privileged actions across the platform. Entries cannot be edited or removed."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="audit-action"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Action
          </label>
          <Input
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. report.moderated"
          />
        </div>
        <div>
          <label
            htmlFor="audit-resource"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Resource type
          </label>
          <Input
            id="audit-resource"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            placeholder="e.g. crisis_report"
          />
        </div>
        <div>
          <label
            htmlFor="audit-actor"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Actor ID
          </label>
          <Input
            id="audit-actor"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder="User UUID"
            aria-invalid={!actorIdValid}
          />
          {!actorIdValid && (
            <p className="mt-1 text-xs text-destructive">
              Enter a full user UUID to filter by actor.
            </p>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <Icon name="x-circle" className="mr-1.5 size-4" aria-hidden />
            Clear filters
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title="No audit entries"
          description={
            hasFilters
              ? 'No log entries match these filters.'
              : 'Privileged actions will appear here as they happen.'
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <AuditRow entry={entry} />
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLog }) {
  const role = entry.actorRole as AppRole | null;
  const showDetails =
    hasValue(entry.metadata) || hasValue(entry.previousValue) || hasValue(entry.newValue);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{entry.action}</code>
        <span className="text-sm text-muted-foreground">on</span>
        <span className="text-sm font-medium">
          {entry.resourceType}
          {entry.resourceId && (
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              #{entry.resourceId.slice(0, 8)}
            </span>
          )}
        </span>
        <span
          className="ml-auto text-xs text-muted-foreground"
          title={formatDateTime(entry.createdAt)}
        >
          {formatRelativeTime(entry.createdAt)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Icon name="user" className="size-3.5" aria-hidden />
          {entry.actorId ? (
            <span className="font-mono">{entry.actorId.slice(0, 8)}</span>
          ) : (
            <span>System</span>
          )}
        </span>
        {role && (
          <Badge variant="outline" className="text-[10px]">
            {ROLE_LABELS[role]}
          </Badge>
        )}
        {entry.ipHash && (
          <span className="inline-flex items-center gap-1">
            <Icon name="hash" className="size-3.5" aria-hidden />
            <span className="font-mono">{entry.ipHash.slice(0, 12)}</span>
          </span>
        )}
      </div>

      {showDetails && (
        <details className="group mt-2">
          <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <Icon
              name="chevron-right"
              className="size-3.5 transition-transform group-open:rotate-90"
              aria-hidden
            />
            Details
          </summary>
          <div className="mt-2 space-y-3">
            {hasValue(entry.metadata) && <JsonBlock label="Metadata" value={entry.metadata} />}
            {hasValue(entry.previousValue) && (
              <JsonBlock label="Previous value" value={entry.previousValue} />
            )}
            {hasValue(entry.newValue) && <JsonBlock label="New value" value={entry.newValue} />}
          </div>
        </details>
      )}
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">
        <code>{toJson(value)}</code>
      </pre>
    </div>
  );
}
