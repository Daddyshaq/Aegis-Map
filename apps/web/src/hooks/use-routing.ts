import type { RouteRequestInput } from '@crisis/validation';
import { useMutation } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';

/**
 * Route planning is a POST action (not cached state), so it is modelled as a
 * mutation. The response always carries a safety disclaimer that the UI must
 * surface — routes are never presented as "absolutely safe".
 */
export function useRoutePlanner() {
  return useMutation({
    mutationFn: (input: RouteRequestInput) => api.routes.plan(input),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
