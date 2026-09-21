import type {
  NotificationPreferencesInput,
  SavedLocationInput,
  UpdateProfileInput,
} from '@crisis/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.me.updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.me, profile);
      toast.success('Profile updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function usePreferences(enabled = true) {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => api.me.getPreferences(),
    enabled,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferencesInput) => api.me.updatePreferences(input),
    onSuccess: (prefs) => {
      queryClient.setQueryData(queryKeys.preferences, prefs);
      toast.success('Notification preferences saved.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSavedLocations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.savedLocations,
    queryFn: () => api.me.listSavedLocations(),
    enabled,
  });
}

export function useAddSavedLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SavedLocationInput) => api.me.addSavedLocation(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedLocations });
      toast.success('Location saved.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRemoveSavedLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.me.removeSavedLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedLocations });
      toast.success('Location removed.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
