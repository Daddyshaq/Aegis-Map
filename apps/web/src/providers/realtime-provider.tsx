import { REALTIME_CHANNELS } from '@crisis/config';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';

/**
 * Subscribes to Supabase Realtime and invalidates the affected React Query
 * caches so open views (map, lists, detail) refresh automatically. This is
 * intentionally coarse: a change signals "refetch", the API remains the source
 * of truth (RLS + server shaping still apply).
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    const reports = supabase
      .channel(REALTIME_CHANNELS.crisisReports)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_reports' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
        void queryClient.invalidateQueries({ queryKey: ['map'] });
      })
      .subscribe();
    channels.push(reports);

    const alerts = supabase
      .channel(REALTIME_CHANNELS.alerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      })
      .subscribe();
    channels.push(alerts);

    const safeLocations = supabase
      .channel(REALTIME_CHANNELS.safeLocations)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_locations' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.safeLocations.all });
      })
      .subscribe();
    channels.push(safeLocations);

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return <>{children}</>;
}
