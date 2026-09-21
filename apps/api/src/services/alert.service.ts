import { PAGINATION } from '@crisis/config';
import { mapAlert } from '@crisis/database';
import type { Alert, AuthUser, Paginated } from '@crisis/types';
import type { CreateAlertInput } from '@crisis/validation';

import { writeAudit } from '../lib/audit';
import { notFound } from '../lib/errors';
import { paginated, pageRange } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';

import { fanoutEmergencyAlert } from './notification.service';

export async function listAlerts(
  opts: { activeOnly?: boolean; page?: number; pageSize?: number } = {},
): Promise<Paginated<Alert>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? PAGINATION.defaultPageSize;
  const { from, to } = pageRange(page, pageSize);
  let q = supabaseAdmin.from('alerts').select('*', { count: 'exact' });
  if (opts.activeOnly) {
    q = q.eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }
  const { data, error, count } = await q
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return paginated((data ?? []).map(mapAlert), page, pageSize, count ?? 0);
}

export async function getAlert(id: string): Promise<Alert> {
  const { data, error } = await supabaseAdmin.from('alerts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Alert not found');
  return mapAlert(data);
}

export async function createAlert(input: CreateAlertInput, user: AuthUser): Promise<Alert> {
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .insert({
      type: input.type,
      title: input.title,
      body: input.body,
      severity: input.severity,
      center_lat: input.centerLat ?? null,
      center_lng: input.centerLng ?? null,
      radius_km: input.radiusKm ?? null,
      is_active: true,
      published_by: user.id,
      published_at: new Date().toISOString(),
      expires_at: input.expiresAt ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'alert.publish',
    resourceType: 'alert',
    resourceId: data.id,
    metadata: { type: data.type, severity: data.severity },
  });

  // Push emergency/warning alerts out to opted-in users (best-effort).
  if (data.type === 'EMERGENCY' || data.type === 'WARNING') {
    await fanoutEmergencyAlert(data).catch(() => undefined);
  }
  return mapAlert(data);
}

export async function deactivateAlert(id: string, user: AuthUser): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Alert not found');
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'alert.deactivate',
    resourceType: 'alert',
    resourceId: id,
  });
}
