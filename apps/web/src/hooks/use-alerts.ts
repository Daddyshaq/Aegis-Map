import type { CreateAlertInput } from '@crisis/validation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export interface AlertsQuery {
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export function useAlerts(params?: AlertsQuery) {
  return useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => api.alerts.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAlert(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.alerts.detail(id ?? ''),
    queryFn: () => api.alerts.get(id as string),
    enabled: !!id,
  });
}

function useInvalidateAlerts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
}

export function useCreateAlert() {
  const invalidate = useInvalidateAlerts();
  return useMutation({
    mutationFn: (input: CreateAlertInput) => api.alerts.create(input),
    onSuccess: () => {
      void invalidate();
      toast.success('Alert published.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteAlert() {
  const invalidate = useInvalidateAlerts();
  return useMutation({
    mutationFn: (id: string) => api.alerts.remove(id),
    onSuccess: () => {
      void invalidate();
      toast.success('Alert removed.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
