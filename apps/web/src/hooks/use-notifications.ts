import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export interface NotificationsQuery {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export function useNotifications(params?: NotificationsQuery) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => api.notifications.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

/** Polled lightweight count for the header bell. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => api.notifications.unreadCount(),
    enabled,
    refetchInterval: 10_000,
    select: (data) => data.count,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      void invalidate();
      toast.success('All notifications marked as read.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
