import type {
  SafeLocationInput,
  SafeLocationQueryInput,
  UpdateSafeLocationInput,
} from '@crisis/validation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useSafeLocations(params?: Partial<SafeLocationQueryInput>) {
  return useQuery({
    queryKey: queryKeys.safeLocations.list(params),
    queryFn: () => api.safeLocations.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

export function useSafeLocation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.safeLocations.detail(id ?? ''),
    queryFn: () => api.safeLocations.get(id as string),
    enabled: !!id,
  });
}

function useInvalidateSafeLocations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.safeLocations.all });
}

export function useCreateSafeLocation() {
  const invalidate = useInvalidateSafeLocations();
  return useMutation({
    mutationFn: (input: SafeLocationInput) => api.safeLocations.create(input),
    onSuccess: () => {
      void invalidate();
      toast.success('Safe location submitted for review.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateSafeLocation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSafeLocations();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSafeLocationInput }) =>
      api.safeLocations.update(id, input),
    onSuccess: (location) => {
      queryClient.setQueryData(queryKeys.safeLocations.detail(location.id), location);
      void invalidate();
      toast.success('Safe location updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useVerifySafeLocation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSafeLocations();
  return useMutation({
    mutationFn: (id: string) => api.safeLocations.verify(id),
    onSuccess: (location) => {
      queryClient.setQueryData(queryKeys.safeLocations.detail(location.id), location);
      void invalidate();
      toast.success('Safe location verified.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteSafeLocation() {
  const invalidate = useInvalidateSafeLocations();
  return useMutation({
    mutationFn: (id: string) => api.safeLocations.remove(id),
    onSuccess: () => {
      void invalidate();
      toast.success('Safe location removed.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
