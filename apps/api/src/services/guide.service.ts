import { mapEmergencyGuide, type EmergencyGuideRow } from '@crisis/database';
import type { AuthUser, EmergencyGuide } from '@crisis/types';
import type { EmergencyGuideInput } from '@crisis/validation';

import { writeAudit } from '../lib/audit';
import { notFound } from '../lib/errors';
import { supabaseAdmin } from '../lib/supabase';

export async function listPublishedGuides(): Promise<EmergencyGuide[]> {
  const { data, error } = await supabaseAdmin
    .from('emergency_guides')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('title');
  if (error) throw error;
  return (data ?? []).map(mapEmergencyGuide);
}

export async function listAllGuides(): Promise<EmergencyGuide[]> {
  const { data, error } = await supabaseAdmin
    .from('emergency_guides')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title');
  if (error) throw error;
  return (data ?? []).map(mapEmergencyGuide);
}

export async function getGuideBySlug(slug: string): Promise<EmergencyGuide> {
  const { data, error } = await supabaseAdmin
    .from('emergency_guides')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Guide not found');
  return mapEmergencyGuide(data);
}

export async function createGuide(
  input: EmergencyGuideInput,
  actor: AuthUser,
): Promise<EmergencyGuide> {
  const { data, error } = await supabaseAdmin
    .from('emergency_guides')
    .insert({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      icon: input.icon,
      category_slug: input.categorySlug ?? null,
      sort_order: input.sortOrder,
      is_published: input.isPublished,
    })
    .select('*')
    .single();
  if (error) throw error;
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'guide.create',
    resourceType: 'emergency_guide',
    resourceId: data.id,
    metadata: { slug: data.slug },
  });
  return mapEmergencyGuide(data);
}

export async function updateGuide(
  id: string,
  input: Partial<EmergencyGuideInput>,
  actor: AuthUser,
): Promise<EmergencyGuide> {
  const patch: Partial<EmergencyGuideRow> = {};
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.title !== undefined) patch.title = input.title;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.content !== undefined) patch.content = input.content;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.categorySlug !== undefined) patch.category_slug = input.categorySlug;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.isPublished !== undefined) patch.is_published = input.isPublished;

  const { data, error } = await supabaseAdmin
    .from('emergency_guides')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Guide not found');
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'guide.update',
    resourceType: 'emergency_guide',
    resourceId: id,
    metadata: { fields: Object.keys(patch) },
  });
  return mapEmergencyGuide(data);
}

export async function deleteGuide(id: string, actor: AuthUser): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('emergency_guides')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Guide not found');
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'guide.delete',
    resourceType: 'emergency_guide',
    resourceId: id,
  });
}
