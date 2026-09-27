import { mapSafeLocation, type SafeLocationRow } from '@crisis/database';
import type { AuthUser, Paginated, SafeLocation } from '@crisis/types';
import { isModerator } from '@crisis/utils';
import type {
  SafeLocationInput,
  SafeLocationQueryInput,
  UpdateSafeLocationInput,
} from '@crisis/validation';

import { writeAudit } from '../lib/audit';
import { notFound } from '../lib/errors';
import { paginated, pageRange } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';
import { getProfile } from './user.service';

/** Normalise the empty-string phone (allowed by the schema) to null. */
function cleanPhone(phone: string | null | undefined): string | null {
  return phone ? phone : null;
}

export async function listSafeLocations(
  query: SafeLocationQueryInput,
): Promise<Paginated<SafeLocation>> {
  // Proximity search when a point + radius is supplied.
  if (query.lat != null && query.lng != null && query.radiusKm != null) {
    const { data, error } = await supabaseAdmin.rpc('nearby_safe_locations', {
      p_lat: query.lat,
      p_lng: query.lng,
      p_radius_m: query.radiusKm * 1000,
    });
    if (error) throw error;
    let rows = data ?? [];
    if (query.type) rows = rows.filter((r) => r.type === query.type);
    if (query.q) {
      const needle = query.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.address?.toLowerCase().includes(needle) ?? false),
      );
    }
    const total = rows.length;
    const { from, to } = pageRange(query.page, query.pageSize);
    const pageRows = rows.slice(from, to + 1);
    return paginated(pageRows.map(mapSafeLocation), query.page, query.pageSize, total);
  }

  const { from, to } = pageRange(query.page, query.pageSize);
  let q = supabaseAdmin
    .from('safe_locations')
    .select('*', { count: 'exact' })
    .eq('is_active', true);
  if (query.type) q = q.eq('type', query.type);
  if (query.q) q = q.or(`name.ilike.%${query.q}%,address.ilike.%${query.q}%`);

  const { data, error, count } = await q.order('name', { ascending: true }).range(from, to);
  if (error) throw error;
  return paginated((data ?? []).map(mapSafeLocation), query.page, query.pageSize, count ?? 0);
}

export async function getSafeLocation(id: string): Promise<SafeLocation> {
  const { data, error } = await supabaseAdmin
    .from('safe_locations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Safe location not found');
  return mapSafeLocation(data);
}

export async function createSafeLocation(
  input: SafeLocationInput,
  user: AuthUser,
): Promise<SafeLocation> {
  // Ensure creator's profile exists in the DB so the foreign key constraint is satisfied.
  await getProfile(user.id);

  // Moderators create verified entries; citizen suggestions await review.
  const moderator = isModerator(user.role);
  const { data, error } = await supabaseAdmin
    .from('safe_locations')
    .insert({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      address: input.address ?? null,
      phone: cleanPhone(input.phone),
      capacity: input.capacity ?? null,
      operating_status: input.operatingStatus,
      verification_status: moderator ? 'VERIFIED' : 'PENDING',
      opening_hours: input.openingHours ?? null,
      facilities: input.facilities,
      is_active: true,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (error) throw error;

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'safe_location.create',
    resourceType: 'safe_location',
    resourceId: data.id,
    metadata: { name: data.name, verified: moderator },
  });
  return mapSafeLocation(data);
}

export async function updateSafeLocation(
  id: string,
  input: UpdateSafeLocationInput,
  user: AuthUser,
): Promise<SafeLocation> {
  const patch: Partial<SafeLocationRow> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.type !== undefined) patch.type = input.type;
  if (input.lat !== undefined) patch.lat = input.lat;
  if (input.lng !== undefined) patch.lng = input.lng;
  if (input.address !== undefined) patch.address = input.address;
  if (input.phone !== undefined) patch.phone = cleanPhone(input.phone);
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.operatingStatus !== undefined) patch.operating_status = input.operatingStatus;
  if (input.openingHours !== undefined) patch.opening_hours = input.openingHours;
  if (input.facilities !== undefined) patch.facilities = input.facilities;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabaseAdmin
    .from('safe_locations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Safe location not found');

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'safe_location.update',
    resourceType: 'safe_location',
    resourceId: id,
    metadata: { fields: Object.keys(patch) },
  });
  return mapSafeLocation(data);
}

/** Verify a citizen-suggested safe location. */
export async function verifySafeLocation(id: string, user: AuthUser): Promise<SafeLocation> {
  const { data, error } = await supabaseAdmin
    .from('safe_locations')
    .update({ verification_status: 'VERIFIED' })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Safe location not found');
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'safe_location.verify',
    resourceType: 'safe_location',
    resourceId: id,
  });
  return mapSafeLocation(data);
}

/** Soft-delete: keep the row for audit/history but hide it from the map. */
export async function deactivateSafeLocation(id: string, user: AuthUser): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('safe_locations')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Safe location not found');
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'safe_location.deactivate',
    resourceType: 'safe_location',
    resourceId: id,
  });
}
