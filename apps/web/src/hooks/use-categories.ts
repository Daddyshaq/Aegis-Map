import type { CrisisCategoryInput, UpdateCrisisCategoryInput } from '@crisis/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.categories(includeInactive),
    queryFn: () => api.categories.list(includeInactive),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrisisCategoryInput) => api.categories.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCrisisCategoryInput }) =>
      api.categories.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
