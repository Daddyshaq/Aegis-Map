import type { CreateReportInput, ReportQueryInput } from '@crisis/validation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useReports(params?: Partial<ReportQueryInput>) {
  return useQuery({
    queryKey: queryKeys.reports.list(params),
    queryFn: () => api.reports.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyReports(params?: Partial<ReportQueryInput>) {
  return useQuery({
    queryKey: queryKeys.reports.mine(params),
    queryFn: () => api.reports.mine(params),
    placeholderData: keepPreviousData,
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reports.detail(id ?? ''),
    queryFn: () => api.reports.get(id as string),
    enabled: !!id,
  });
}

export function useReportVerifications(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.verifications(id ?? ''),
    queryFn: () => api.reports.verifications(id as string),
    enabled: !!id && enabled,
  });
}

/** Invalidate every view that shows report data (lists, map, detail). */
function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    void queryClient.invalidateQueries({ queryKey: ['map'] });
  };
}

export function useCreateReport() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (input: CreateReportInput) => api.reports.create(input),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCheckDuplicates() {
  return useMutation({
    mutationFn: (input: CreateReportInput) => api.reports.checkDuplicates(input),
  });
}

export function useUploadEvidence() {
  return useMutation({
    mutationFn: ({ reportId, file }: { reportId: string; file: File }) =>
      api.reports.uploadEvidence(reportId, file),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCorroborateReport() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (id: string) => api.reports.corroborate(id),
    onSuccess: (report) => {
      queryClient.setQueryData(queryKeys.reports.detail(report.id), report);
      invalidate();
      toast.success('Thanks — your corroboration was recorded.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
