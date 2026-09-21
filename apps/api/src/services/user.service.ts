import {
  mapNotificationPreferences,
  mapProfile,
  mapSavedLocation,
  type ProfileRow,
} from '@crisis/database';
import type { NotificationPreferences, Profile, SavedLocation } from '@crisis/types';
import type {
  NotificationPreferencesInput,
  SavedLocationInput,
  UpdateProfileInput,
} from '@crisis/validation';

import { notFound } from '../lib/errors';
import { supabaseAdmin } from '../lib/supabase';

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Profile not found');
  return mapProfile(data);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
  // Only self-editable presentation fields are touched here; role/status are
  // protected by a database trigger and are never accepted from this path.
  const patch: Partial<ProfileRow> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone === '' ? null : input.phone;
  if (input.avatarUrl !== undefined)
    patch.avatar_url = input.avatarUrl === '' ? null : input.avatarUrl;
  if (input.dataSaver !== undefined) patch.data_saver = input.dataSaver;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(data);
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return mapNotificationPreferences(data);

  // Lazily create defaults if the row is somehow missing.
  const { data: created, error: insertErr } = await supabaseAdmin
    .from('notification_preferences')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (insertErr) throw insertErr;
  return mapNotificationPreferences(created);
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        emergency_alerts: input.emergencyAlerts,
        nearby_crisis_alerts: input.nearbyCrisisAlerts,
        report_status_updates: input.reportStatusUpdates,
        safe_location_updates: input.safeLocationUpdates,
        system_notifications: input.systemNotifications,
        min_severity: input.minSeverity,
        radius_km: input.radiusKm,
        push_enabled: input.pushEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapNotificationPreferences(data);
}

export async function listSavedLocations(userId: string): Promise<SavedLocation[]> {
  const { data, error } = await supabaseAdmin
    .from('saved_locations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSavedLocation);
}

export async function createSavedLocation(
  userId: string,
  input: SavedLocationInput,
): Promise<SavedLocation> {
  const { data, error } = await supabaseAdmin
    .from('saved_locations')
    .insert({
      user_id: userId,
      label: input.label,
      lat: input.lat,
      lng: input.lng,
      address: input.address ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapSavedLocation(data);
}

export async function deleteSavedLocation(userId: string, id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('saved_locations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Saved location not found');
}
