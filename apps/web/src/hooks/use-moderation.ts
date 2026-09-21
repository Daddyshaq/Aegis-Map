import type { ModerateReportInput, ReportQueryInput } from '@crisis/validation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useModerationQueue(params?: Partial<ReportQueryInput>) {
  return useQuery({
    queryKey: queryKeys.moderationQueue(params),
    queryFn: () => api.moderation.queue(params),
    placeholderData: keepPreviousData,
  });
}

export function useModerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModerateReportInput }) =>
      api.moderation.moderate(id, input),
    onSuccess: (report) => {
      queryClient.setQueryData(queryKeys.reports.detail(report.id), report);
      void queryClient.invalidateQueries({ queryKey: ['moderation'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      void queryClient.invalidateQueries({ queryKey: ['map'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.verifications(report.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      toast.success('Moderation action recorded.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
