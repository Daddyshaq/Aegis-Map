import { randomUUID } from 'node:crypto';

import {
  ALL_ALLOWED_UPLOAD_TYPES,
  DEFAULT_TTL_HOURS,
  DUPLICATE_DETECTION,
  REPORT_THROTTLE,
  STORAGE_BUCKETS,
  UPLOAD_LIMITS,
} from '@crisis/config';
import { mapEvidence, mapReport, mapVerification } from '@crisis/database';
import type {
  AuthUser,
  CrisisEvidence,
  CrisisMapFeature,
  CrisisReport,
  CrisisVerification,
  DuplicateCandidate,
  EvidenceKind,
  Paginated,
} from '@crisis/types';
import { calculateRisk, computeDuplicateSignals, duplicateScore, isModerator } from '@crisis/utils';
import type {
  CreateReportInput,
  MapBoundsInput,
  RegisterEvidenceInput,
  ReportQueryInput,
} from '@crisis/validation';

import { AppError, badRequest, forbidden, notFound, tooManyRequests } from '../lib/errors';
import { paginated, pageRange } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';
import { getProfile } from './user.service';

import { notifyReportReceived } from './notification.service';

async function loadCategoryTtl(categoryId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('crisis_categories')
    .select('default_ttl_hours, is_active')
    .eq('id', categoryId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw badRequest('Unknown crisis category');
  if (!data.is_active) throw badRequest('This crisis category is no longer active');
  return data.default_ttl_hours;
}

/** Find recent, nearby reports that plausibly describe the same incident. */
export async function checkDuplicates(input: CreateReportInput): Promise<DuplicateCandidate[]> {
  const reportedAt = input.reportedAt ?? new Date().toISOString();
  const { data, error } = await supabaseAdmin.rpc('reports_near', {
    p_lat: input.lat,
    p_lng: input.lng,
    p_radius_m: DUPLICATE_DETECTION.radiusMeters,
    p_min_severity: 'LOW',
  });
  if (error) throw error;

  const candidates: DuplicateCandidate[] = [];
  for (const row of data ?? []) {
    const minutesApart = Math.abs(Date.parse(reportedAt) - Date.parse(row.reported_at)) / 60_000;
    if (minutesApart > DUPLICATE_DETECTION.windowMinutes) continue;
    const signals = computeDuplicateSignals(
      {
        location: { lat: input.lat, lng: input.lng },
        reportedAt,
        categoryId: input.categoryId,
        text: `${input.title} ${input.description}`,
      },
      {
        location: { lat: row.lat, lng: row.lng },
        reportedAt: row.reported_at,
        categoryId: row.category_id,
        text: `${row.title} ${row.description}`,
      },
    );
    const score = duplicateScore(signals);
    if (score >= DUPLICATE_DETECTION.similarityThreshold) {
      candidates.push({
        report: mapReport(row),
        distanceMeters: Math.round(signals.distanceMeters),
        minutesApart: Math.round(minutesApart),
        similarityScore: Number(score.toFixed(2)),
      });
    }
  }
  return candidates.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5);
}

async function enforceThrottle(userId: string): Promise<void> {
  const since = new Date(Date.now() - REPORT_THROTTLE.windowMinutes * 60_000).toISOString();
  const { count, error } = await supabaseAdmin
    .from('crisis_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_by', userId)
    .gte('created_at', since);
  if (error) throw error;
  if ((count ?? 0) >= REPORT_THROTTLE.maxReports) {
    throw tooManyRequests(
      `You have reached the limit of ${REPORT_THROTTLE.maxReports} reports per hour. Please wait before reporting again.`,
    );
  }
}

export async function createReport(
  input: CreateReportInput,
  user: AuthUser,
): Promise<CrisisReport> {
  // Ensure creator's profile exists in the DB so the foreign key constraint is satisfied.
  await getProfile(user.id);

  await enforceThrottle(user.id);
  const ttlHours = await loadCategoryTtl(input.categoryId);
  const reportedAt = input.reportedAt ?? new Date().toISOString();

  // Duplicate guard — unless the reporter explicitly confirmed a new incident.
  if (!input.notDuplicateOf) {
    const candidates = await checkDuplicates(input);
    if (candidates.length > 0) {
      throw new AppError(
        409,
        'DUPLICATE_SUSPECTED',
        'This looks like an already-reported incident.',
        {
          details: candidates.map((c) => ({
            code: c.report.id,
            message: `${c.report.reference}: ${c.report.title} — ${c.distanceMeters}m away, ${c.minutesApart} min ago`,
          })),
        },
      );
    }
  }

  const risk = calculateRisk({
    severity: input.severity,
    verificationStatus: 'PENDING',
    reportedAt,
    corroborationCount: 0,
  });

  const expiresAt = new Date(
    Date.parse(reportedAt) + (ttlHours || DEFAULT_TTL_HOURS[input.severity]) * 3_600_000,
  ).toISOString();

  const { data, error } = await supabaseAdmin
    .from('crisis_reports')
    .insert({
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
      location_name: input.locationName ?? null,
      verification_status: 'PENDING',
      status: 'ACTIVE',
      risk_level: risk.level,
      risk_score: risk.score,
      reported_by: input.isAnonymous ? null : user.id,
      is_anonymous: input.isAnonymous,
      reported_at: reportedAt,
      expires_at: expiresAt,
    })
    .select('*')
    .single();
  if (error) throw error;

  // Notify the reporter (non-anonymous) that their report was received.
  if (!input.isAnonymous) {
    await notifyReportReceived(user.id, data).catch(() => undefined);
  }

  return mapReport(data);
}

/** Increment corroboration on an existing incident and recompute its risk. */
export async function corroborateReport(reportId: string, user: AuthUser): Promise<CrisisReport> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from('crisis_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!existing) throw notFound('Report not found');

  await enforceThrottle(user.id);

  const corroboration = existing.corroboration_count + 1;
  const risk = calculateRisk({
    severity: existing.severity,
    verificationStatus: existing.verification_status,
    reportedAt: existing.reported_at,
    corroborationCount: corroboration,
  });

  const { data, error } = await supabaseAdmin
    .from('crisis_reports')
    .update({ corroboration_count: corroboration, risk_level: risk.level, risk_score: risk.score })
    .eq('id', reportId)
    .select('*')
    .single();
  if (error) throw error;
  return mapReport(data);
}

export async function getMapFeatures(bounds: MapBoundsInput): Promise<CrisisMapFeature[]> {
  let reports: any[] = [];
  const { data, error } = await supabaseAdmin.rpc('reports_in_bbox', {
    min_lat: bounds.minLat,
    min_lng: bounds.minLng,
    max_lat: bounds.maxLat,
    max_lng: bounds.maxLng,
  });

  if (!error && data) {
    reports = data;
  } else {
    // Fallback if RPC function is missing or throws in Supabase
    const minLat = Math.min(bounds.minLat, bounds.maxLat);
    const maxLat = Math.max(bounds.minLat, bounds.maxLat);
    const minLng = Math.min(bounds.minLng, bounds.maxLng);
    const maxLng = Math.max(bounds.minLng, bounds.maxLng);

    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('crisis_reports')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .neq('verification_status', 'REJECTED')
      .neq('status', 'RESOLVED');

    if (fallbackError) {
      const { data: allActive } = await supabaseAdmin
        .from('crisis_reports')
        .select('*')
        .neq('verification_status', 'REJECTED')
        .neq('status', 'RESOLVED')
        .limit(200);
      reports = allActive ?? [];
    } else {
      reports = fallbackData ?? [];
    }
  }

  // The RPC returns raw report rows without the joined category slug. Resolve
  // slugs in a single lookup (there are only a handful of categories) so the map
  // gets its per-category styling key without an N+1 per feature.
  const { data: cats, error: catError } = await supabaseAdmin
    .from('crisis_categories')
    .select('id, slug');
  if (catError) throw catError;
  const slugById = new Map<string, string>((cats ?? []).map((c) => [c.id, c.slug]));

  const severityRank: Record<string, number> = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };
  const minRank = bounds.minSeverity ? (severityRank[bounds.minSeverity] ?? 0) : 0;

  return (reports ?? [])
    .filter((r) => (bounds.categoryId ? r.category_id === bounds.categoryId : true))
    .filter((r) => (bounds.verifiedOnly ? r.verification_status === 'VERIFIED' : true))
    .filter((r) => severityRank[r.severity]! >= minRank)
    .map((r) => ({
      id: r.id,
      reference: r.reference,
      categoryId: r.category_id,
      categorySlug: slugById.get(r.category_id) ?? '',
      title: r.title,
      severity: r.severity,
      status: r.status,
      verificationStatus: r.verification_status,
      riskLevel: r.risk_level,
      lat: r.lat,
      lng: r.lng,
      reportedAt: r.reported_at,
      expiresAt: r.expires_at,
    }));
}

export async function listReports(
  query: ReportQueryInput,
  viewer: AuthUser | null,
): Promise<Paginated<CrisisReport>> {
  const { from, to } = pageRange(query.page, query.pageSize);
  let q = supabaseAdmin.from('crisis_reports').select('*', { count: 'exact' });

  // Non-moderators cannot list others' rejected reports.
  if (!viewer || !isModerator(viewer.role)) {
    q = q.neq('verification_status', 'REJECTED');
  }
  if (query.status) q = q.eq('verification_status', query.status);
  if (query.crisisStatus) q = q.eq('status', query.crisisStatus);
  if (query.categoryId) q = q.eq('category_id', query.categoryId);
  if (query.severity) q = q.eq('severity', query.severity);
  if (query.q) q = q.or(`title.ilike.%${query.q}%,location_name.ilike.%${query.q}%`);

  const { data, error, count } = await q.order('reported_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return paginated(
    (data ?? []).map((r) => mapReport(r)),
    query.page,
    query.pageSize,
    count ?? 0,
  );
}

export async function getMyReports(
  userId: string,
  query: ReportQueryInput,
): Promise<Paginated<CrisisReport>> {
  const { from, to } = pageRange(query.page, query.pageSize);
  let q = supabaseAdmin
    .from('crisis_reports')
    .select('*', { count: 'exact' })
    .eq('reported_by', userId);
  if (query.status) q = q.eq('verification_status', query.status);
  const { data, error, count } = await q.order('reported_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return paginated(
    (data ?? []).map((r) => mapReport(r)),
    query.page,
    query.pageSize,
    count ?? 0,
  );
}

export async function getReportById(id: string, viewer: AuthUser | null): Promise<CrisisReport> {
  const { data, error } = await supabaseAdmin
    .from('crisis_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Report not found');

  const moderator = viewer ? isModerator(viewer.role) : false;
  const isOwner = viewer && data.reported_by === viewer.id;
  if (data.verification_status === 'REJECTED' && !moderator && !isOwner) {
    throw notFound('Report not found');
  }

  // Fetch the category separately — a typed embedded join needs relationship
  // metadata we don't model, and a single lookup by id is cheap.
  const { data: category } = await supabaseAdmin
    .from('crisis_categories')
    .select('*')
    .eq('id', data.category_id)
    .maybeSingle();
  const report = mapReport(data, { category: category ?? undefined });

  // Evidence is only exposed to the reporter or moderators, via short-lived signed URLs.
  if (moderator || isOwner) {
    const { data: rows } = await supabaseAdmin
      .from('crisis_evidence')
      .select('*')
      .eq('report_id', id)
      .order('created_at', { ascending: true });
    report.evidence = await Promise.all(
      (rows ?? []).map(async (row) => {
        const mapped = mapEvidence(row);
        const { data: signed } = await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.evidence)
          .createSignedUrl(row.storage_path, 3600);
        return { ...mapped, signedUrl: signed?.signedUrl };
      }),
    );
  }

  return report;
}

/** Attach an evidence record after the file has been uploaded to storage. */
export async function registerEvidence(
  reportId: string,
  input: RegisterEvidenceInput,
  user: AuthUser,
): Promise<void> {
  const { data: report, error } = await supabaseAdmin
    .from('crisis_reports')
    .select('id, reported_by, is_anonymous')
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw error;
  if (!report) throw notFound('Report not found');
  if (report.reported_by !== user.id)
    throw forbidden('You can only attach evidence to your own report');

  // Defence in depth: the storage path must live under the user's own folder.
  if (!input.storagePath.startsWith(`${user.id}/`)) {
    throw badRequest('Evidence path does not match the uploader');
  }

  const { error: insertErr } = await supabaseAdmin.from('crisis_evidence').insert({
    report_id: reportId,
    kind: input.kind,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  });
  if (insertErr) throw insertErr;
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/webm': 'weba',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};

function kindForMime(mime: string): EvidenceKind {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

/**
 * Validate and store an uploaded evidence file in the private bucket, then
 * register it against the report. Ownership and MIME/size limits are enforced
 * server-side regardless of any client-side checks.
 */
export async function uploadEvidence(
  reportId: string,
  user: AuthUser,
  file: { buffer: Buffer; mimeType: string; filename: string },
): Promise<CrisisEvidence> {
  const { data: report, error } = await supabaseAdmin
    .from('crisis_reports')
    .select('id, reported_by')
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw error;
  if (!report) throw notFound('Report not found');
  if (report.reported_by !== user.id) {
    throw forbidden('You can only attach evidence to your own report');
  }

  // Normalize incoming MIME type and fallback to filename extension if needed
  let mimeType = (file.mimeType || '').toLowerCase().trim();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!mimeType || mimeType === 'application/octet-stream') {
    const extMatch = file.filename.split('.').pop()?.toLowerCase();
    if (extMatch === 'jpg' || extMatch === 'jpeg') mimeType = 'image/jpeg';
    else if (extMatch === 'png') mimeType = 'image/png';
    else if (extMatch === 'webp') mimeType = 'image/webp';
    else if (extMatch === 'heic') mimeType = 'image/heic';
    else if (extMatch === 'mp4') mimeType = 'video/mp4';
    else if (extMatch === 'mov') mimeType = 'video/quicktime';
  }

  if (!ALL_ALLOWED_UPLOAD_TYPES.includes(mimeType) && mimeType !== 'image/jpg') {
    throw badRequest(`Unsupported file type: ${file.mimeType}`);
  }
  if (file.buffer.byteLength > UPLOAD_LIMITS.maxBytes) {
    throw badRequest('File exceeds the maximum allowed size');
  }
  const { count } = await supabaseAdmin
    .from('crisis_evidence')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId);
  if ((count ?? 0) >= UPLOAD_LIMITS.maxFiles) {
    throw badRequest(`A report may have at most ${UPLOAD_LIMITS.maxFiles} evidence files`);
  }

  // Ensure the evidence storage bucket exists in Supabase
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.id === STORAGE_BUCKETS.evidence)) {
      await supabaseAdmin.storage.createBucket(STORAGE_BUCKETS.evidence, {
        public: false,
        fileSizeLimit: UPLOAD_LIMITS.maxBytes,
      });
    }
  } catch {
    // Proceed to upload attempt
  }

  const ext = MIME_EXT[mimeType] ?? 'bin';
  const storagePath = `${user.id}/${reportId}/${randomUUID()}.${ext}`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.evidence)
    .upload(storagePath, file.buffer, { contentType: mimeType, upsert: false });
  if (uploadErr) throw uploadErr;

  const kind = kindForMime(mimeType);
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('crisis_evidence')
    .insert({
      report_id: reportId,
      kind,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: file.buffer.byteLength,
    })
    .select('*')
    .single();
  if (insertErr) {
    // Roll back the orphaned object so storage and DB stay consistent.
    await supabaseAdmin.storage.from(STORAGE_BUCKETS.evidence).remove([storagePath]);
    throw insertErr;
  }

  const mapped = mapEvidence(inserted);
  const { data: signed } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.evidence)
    .createSignedUrl(storagePath, 3600);
  return { ...mapped, signedUrl: signed?.signedUrl };
}

export async function getReportVerifications(reportId: string): Promise<CrisisVerification[]> {
  const { data, error } = await supabaseAdmin
    .from('crisis_verifications')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapVerification);
}
