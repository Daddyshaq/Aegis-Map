import { PAGINATION } from '@crisis/config';
import { mapCategory, mapProfile, type CrisisCategoryRow } from '@crisis/database';
import type {
  AdminStats,
  AppRole,
  AuditLog,
  AuthUser,
  CrisisCategory,
  Paginated,
  Profile,
  SystemSetting,
} from '@crisis/types';
import type {
  AuditLogQueryInput,
  CrisisCategoryInput,
  SuspendUserInput,
  SystemSettingInput,
  UpdateCrisisCategoryInput,
} from '@crisis/validation';

import { writeAudit } from '../lib/audit';
import { badRequest, notFound } from '../lib/errors';
import { paginated, pageRange } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';
import { invalidateProfileCache } from '../plugins/auth';

export async function getDashboardStats(): Promise<AdminStats> {
  const { data, error } = await supabaseAdmin.rpc('admin_dashboard_stats');
  if (error) throw error;
  return data as AdminStats;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(
  opts: { page?: number; pageSize?: number; q?: string; role?: AppRole } = {},
): Promise<Paginated<Profile>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? PAGINATION.defaultPageSize;
  const { from, to } = pageRange(page, pageSize);
  let q = supabaseAdmin.from('profiles').select('*', { count: 'exact' });
  if (opts.role) q = q.eq('role', opts.role);
  if (opts.q) q = q.or(`email.ilike.%${opts.q}%,full_name.ilike.%${opts.q}%`);
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return paginated((data ?? []).map(mapProfile), page, pageSize, count ?? 0);
}

export async function updateUserRole(
  userId: string,
  role: AppRole,
  actor: AuthUser,
  ipHash: string | null,
): Promise<Profile> {
  if (userId === actor.id) throw badRequest('You cannot change your own role');
  const { data: before } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (!before) throw notFound('User not found');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  invalidateProfileCache(userId);

  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'user.role_change',
    resourceType: 'profile',
    resourceId: userId,
    previousValue: { role: before.role },
    newValue: { role },
    ipHash,
  });
  return mapProfile(data);
}

export async function setUserStatus(
  userId: string,
  input: SuspendUserInput,
  actor: AuthUser,
  ipHash: string | null,
): Promise<Profile> {
  if (userId === actor.id) throw badRequest('You cannot change your own account status');
  const { data: before } = await supabaseAdmin
    .from('profiles')
    .select('account_status')
    .eq('id', userId)
    .maybeSingle();
  if (!before) throw notFound('User not found');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ account_status: input.status })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  invalidateProfileCache(userId);

  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'user.status_change',
    resourceType: 'profile',
    resourceId: userId,
    metadata: { reason: input.reason ?? null },
    previousValue: { account_status: before.account_status },
    newValue: { account_status: input.status },
    ipHash,
  });
  return mapProfile(data);
}

// ---------------------------------------------------------------------------
// Crisis categories
// ---------------------------------------------------------------------------

export async function listCategories(includeInactive = false): Promise<CrisisCategory[]> {
  let q = supabaseAdmin.from('crisis_categories').select('*');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q.order('sort_order', { ascending: true }).order('name');
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function createCategory(
  input: CrisisCategoryInput,
  actor: AuthUser,
): Promise<CrisisCategory> {
  const { data, error } = await supabaseAdmin
    .from('crisis_categories')
    .insert({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon,
      color: input.color,
      default_ttl_hours: input.defaultTtlHours,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    })
    .select('*')
    .single();
  if (error) throw error;
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'category.create',
    resourceType: 'crisis_category',
    resourceId: data.id,
    metadata: { slug: data.slug },
  });
  return mapCategory(data);
}

export async function updateCategory(
  id: string,
  input: UpdateCrisisCategoryInput,
  actor: AuthUser,
): Promise<CrisisCategory> {
  const patch: Partial<CrisisCategoryRow> = {};
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.color !== undefined) patch.color = input.color;
  if (input.defaultTtlHours !== undefined) patch.default_ttl_hours = input.defaultTtlHours;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const { data, error } = await supabaseAdmin
    .from('crisis_categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Category not found');
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'category.update',
    resourceType: 'crisis_category',
    resourceId: id,
    metadata: { fields: Object.keys(patch) },
  });
  return mapCategory(data);
}

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

function mapSetting(row: {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}): SystemSetting {
  return {
    key: row.key,
    value: row.value,
    description: row.description,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function listSettings(): Promise<SystemSetting[]> {
  const { data, error } = await supabaseAdmin.from('system_settings').select('*').order('key');
  if (error) throw error;
  return (data ?? []).map(mapSetting);
}

export async function updateSetting(
  key: string,
  input: SystemSettingInput,
  actor: AuthUser,
): Promise<SystemSetting> {
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .upsert(
      {
        key,
        value: input.value,
        description: input.description ?? null,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    .select('*')
    .single();
  if (error) throw error;
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'setting.update',
    resourceType: 'system_setting',
    resourceId: key,
    newValue: { value: input.value },
  });
  return mapSetting(data);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function listAuditLogs(query: AuditLogQueryInput): Promise<Paginated<AuditLog>> {
  const { from, to } = pageRange(query.page, query.pageSize);
  let q = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });
  if (query.action) q = q.eq('action', query.action);
  if (query.resourceType) q = q.eq('resource_type', query.resourceType);
  if (query.actorId) q = q.eq('actor_id', query.actorId);
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  const items: AuditLog[] = (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata,
    previousValue: row.previous_value,
    newValue: row.new_value,
    ipHash: row.ip_hash,
    createdAt: row.created_at,
  }));
  return paginated(items, query.page, query.pageSize, count ?? 0);
}
