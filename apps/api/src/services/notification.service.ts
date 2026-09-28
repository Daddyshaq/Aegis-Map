import { PAGINATION } from '@crisis/config';
import type { AlertRow, CrisisReportRow, NotificationPreferencesRow } from '@crisis/database';
import { mapNotification } from '@crisis/database';
import type { AppNotification, NotificationType, Paginated, Severity } from '@crisis/types';
import { SEVERITY_WEIGHT } from '@crisis/types';
import { boundingBoxAround, haversineMeters } from '@crisis/utils';

import { paginated, pageRange } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';

import { sendPushToUser } from './push.service';

const ALERT_MAX_RADIUS_KM = 50;

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Also attempt a Web Push delivery (best-effort). */
  push?: boolean;
}

async function getPreferences(userId: string): Promise<NotificationPreferencesRow | null> {
  const { data } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

/** Persist an in-app notification and optionally deliver a push. */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data ?? {},
  });
  if (error) throw error;

  if (params.push) {
    const prefs = await getPreferences(params.userId);
    if (prefs?.push_enabled) {
      await sendPushToUser(params.userId, {
        title: params.title,
        body: params.body,
        data: params.data,
        tag: params.type,
      });
    }
  }
}

export async function notifyReportReceived(userId: string, report: CrisisReportRow): Promise<void> {
  const prefs = await getPreferences(userId);
  if (prefs && !prefs.report_status_updates) return;
  await createNotification({
    userId,
    type: 'REPORT_RECEIVED',
    title: 'Report received',
    body: `Your report ${report.reference} is now pending review.`,
    data: { reportId: report.id, reference: report.reference },
  });
}

const STATUS_MESSAGES: Record<string, { type: NotificationType; title: string; body: string }> = {
  VERIFIED: {
    type: 'REPORT_VERIFIED',
    title: 'Report verified',
    body: 'A moderator has verified your report.',
  },
  REJECTED: {
    type: 'REPORT_REJECTED',
    title: 'Report not verified',
    body: 'A moderator reviewed your report and could not verify it.',
  },
  UNDER_REVIEW: {
    type: 'REPORT_INFO_REQUESTED',
    title: 'Report under review',
    body: 'A moderator is reviewing your report.',
  },
};

export async function notifyReportStatusChanged(
  userId: string,
  report: CrisisReportRow,
  newStatus: string,
): Promise<void> {
  const template = STATUS_MESSAGES[newStatus];
  if (!template) return;
  const prefs = await getPreferences(userId);
  if (prefs && !prefs.report_status_updates) return;
  await createNotification({
    userId,
    type: template.type,
    title: template.title,
    body: `${template.body} (${report.reference})`,
    data: { reportId: report.id, reference: report.reference, status: newStatus },
    push: true,
  });
}

/**
 * Notify users who have saved a location within their configured alert radius
 * of a newly significant incident. Best-effort; failures are swallowed.
 */
export async function fanoutNearbyCrisis(report: CrisisReportRow): Promise<void> {
  const reportWeight = SEVERITY_WEIGHT[report.severity as Severity];
  const box = boundingBoxAround({ lat: report.lat, lng: report.lng }, ALERT_MAX_RADIUS_KM * 1000);

  // Candidate saved locations within the widest supported radius.
  const { data: locations } = await supabaseAdmin
    .from('saved_locations')
    .select('user_id, lat, lng')
    .gte('lat', box.minLat)
    .lte('lat', box.maxLat)
    .gte('lng', box.minLng)
    .lte('lng', box.maxLng);
  if (!locations?.length) return;

  const userIds = [...new Set(locations.map((l) => l.user_id))];
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds)
    .eq('nearby_crisis_alerts', true);
  if (!prefs?.length) return;

  const prefsByUser = new Map(prefs.map((p) => [p.user_id, p]));
  const notified = new Set<string>();

  for (const loc of locations) {
    if (notified.has(loc.user_id)) continue;
    const pref = prefsByUser.get(loc.user_id);
    if (!pref) continue;
    if (reportWeight < SEVERITY_WEIGHT[pref.min_severity as Severity]) continue;
    const distance = haversineMeters(
      { lat: report.lat, lng: report.lng },
      { lat: loc.lat, lng: loc.lng },
    );
    if (distance > pref.radius_km * 1000) continue;

    notified.add(loc.user_id);
    await createNotification({
      userId: loc.user_id,
      type: 'NEARBY_CRISIS',
      title: 'Nearby incident reported',
      body: `${report.title} was reported ${Math.round(distance / 100) / 10} km from a saved location.`,
      data: { reportId: report.id, reference: report.reference },
      push: true,
    }).catch(() => undefined);
  }
}

/** Fan an emergency alert out to all active users (unless explicitly opted out). */
export async function fanoutEmergencyAlert(alert: AlertRow): Promise<void> {
  const { data: optOuts } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id')
    .eq('emergency_alerts', false);
  const optOutSet = new Set((optOuts ?? []).map((o) => o.user_id));

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id');

  let recipients = (profiles ?? []).map((p) => p.id).filter((id) => !optOutSet.has(id));

  if (!recipients.length) return;

  // For geographically scoped alerts, if users have saved locations in the area, prioritize them
  if (alert.center_lat != null && alert.center_lng != null && alert.radius_km != null) {
    const box = boundingBoxAround(
      { lat: alert.center_lat, lng: alert.center_lng },
      alert.radius_km * 1000,
    );
    const { data: locations } = await supabaseAdmin
      .from('saved_locations')
      .select('user_id, lat, lng')
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng);

    if (locations && locations.length > 0) {
      const inRadius = new Set(
        locations
          .filter(
            (l) =>
              haversineMeters(
                { lat: alert.center_lat!, lng: alert.center_lng! },
                { lat: l.lat, lng: l.lng },
              ) <=
              alert.radius_km! * 1000,
          )
          .map((l) => l.user_id),
      );
      if (inRadius.size > 0) {
        recipients = recipients.filter((id) => inRadius.has(id));
      }
    }
  }

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        type: 'EMERGENCY_ALERT',
        title: alert.title,
        body: alert.body,
        data: { alertId: alert.id },
        push: true,
      }).catch(() => undefined),
    ),
  );
}

export async function listNotifications(
  userId: string,
  opts: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
): Promise<Paginated<AppNotification>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? PAGINATION.defaultPageSize;
  const { from, to } = pageRange(page, pageSize);
  let q = supabaseAdmin.from('notifications').select('*', { count: 'exact' }).eq('user_id', userId);
  if (opts.unreadOnly) q = q.is('read_at', null);
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return paginated((data ?? []).map(mapNotification), page, pageSize, count ?? 0);
}

export async function unreadCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(userId: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}
