import type { AppNotification } from '@crisis/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Container, PageHeader } from '@/components/page';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { hexToRgba } from '@/lib/color';
import { formatRelativeTime } from '@/lib/format';
import { NOTIFICATION_TYPE_META } from '@/lib/labels';
import { routes } from '@/lib/routes';

/** Resolves an in-app link target from a notification's structured payload. */
function linkFor(notification: AppNotification): string | null {
  const data = notification.data ?? {};
  const reportId = typeof data.reportId === 'string' ? data.reportId : null;
  const alertId = typeof data.alertId === 'string' ? data.alertId : null;
  const safeLocationId = typeof data.safeLocationId === 'string' ? data.safeLocationId : null;
  if (reportId) return routes.reportDetail(reportId);
  if (alertId) return routes.alertDetail(alertId);
  if (safeLocationId) return routes.safeLocationDetail(safeLocationId);
  return null;
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, isError, error, refetch } = useNotifications({ page, unreadOnly });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <Container className="py-8">
      <PageHeader
        title="Notifications"
        description="Alerts and updates about reports, safe locations, and your area."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || !hasUnread}
          >
            <Icon name="check-check" className="mr-2 size-4" aria-hidden />
            Mark all read
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Switch
          id="unread-only"
          checked={unreadOnly}
          onCheckedChange={(checked) => {
            setUnreadOnly(checked);
            setPage(1);
          }}
        />
        <Label htmlFor="unread-only" className="cursor-pointer text-sm">
          Unread only
        </Label>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={
            unreadOnly
              ? 'You’re all caught up.'
              : 'Updates about your reports and nearby safety alerts will appear here.'
          }
        />
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {items.map((notification) => (
              <li key={notification.id}>
                <NotificationRow
                  notification={notification}
                  onMarkRead={() => markRead.mutate(notification.id)}
                />
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </Container>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: AppNotification;
  onMarkRead: () => void;
}) {
  const meta = NOTIFICATION_TYPE_META[notification.type];
  const to = linkFor(notification);
  const unread = !notification.readAt;

  const body = (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: hexToRgba(meta.color, 0.14), color: meta.color }}
      >
        <Icon name={meta.icon} className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          {notification.title}
          {unread && (
            <span
              className="inline-block size-2 shrink-0 rounded-full bg-primary"
              aria-label="Unread"
              role="img"
            />
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2 p-4">
      {to ? (
        <Link
          to={to}
          className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            if (unread) onMarkRead();
          }}
        >
          {body}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      {unread && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkRead}
          aria-label="Mark this notification as read"
        >
          <Icon name="check" className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
