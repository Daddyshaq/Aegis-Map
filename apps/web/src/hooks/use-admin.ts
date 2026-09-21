import type {
  AuditLogQueryInput,
  EmergencyGuideInput,
  SuspendUserInput,
  SystemSettingInput,
  UpdateUserRoleInput,
} from '@crisis/validation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => api.admin.stats(),
    enabled,
    staleTime: 30_000,
  });
}

export interface AdminUsersQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: string;
}

export function useAdminUsers(params?: AdminUsersQuery) {
  return useQuery({
    queryKey: queryKeys.admin.users(params),
    queryFn: () => api.admin.listUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRoleInput }) =>
      api.admin.setUserRole(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User role updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SuspendUserInput }) =>
      api.admin.setUserStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User status updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSystemSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: () => api.admin.listSettings(),
    enabled,
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: SystemSettingInput }) =>
      api.admin.updateSetting(key, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
      toast.success('Setting saved.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAuditLog(params?: Partial<AuditLogQueryInput>) {
  return useQuery({
    queryKey: queryKeys.admin.audit(params),
    queryFn: () => api.admin.audit(params),
    placeholderData: keepPreviousData,
  });
}

// --- Emergency guide management (admin) ---

export function useAdminGuides(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.guides,
    queryFn: () => api.admin.listGuides(),
    enabled,
  });
}

function useInvalidateGuides() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.guides });
    void queryClient.invalidateQueries({ queryKey: queryKeys.guides.all });
  };
}

export function useCreateGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({
    mutationFn: (input: EmergencyGuideInput) => api.admin.createGuide(input),
    onSuccess: () => {
      invalidate();
      toast.success('Guide created.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EmergencyGuideInput> }) =>
      api.admin.updateGuide(id, input),
    onSuccess: () => {
      invalidate();
      toast.success('Guide updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({
    mutationFn: (id: string) => api.admin.removeGuide(id),
    onSuccess: () => {
      invalidate();
      toast.success('Guide deleted.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
