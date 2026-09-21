import type { CrisisReportRow } from '@crisis/database';
import { mapReport } from '@crisis/database';
import type {
  AuthUser,
  CrisisReport,
  Paginated,
  Severity,
  VerificationStatus,
} from '@crisis/types';
import { SEVERITY_WEIGHT } from '@crisis/types';
import { calculateRisk } from '@crisis/utils';
import type { ModerateReportInput, ReportQueryInput } from '@crisis/validation';

import { writeAudit } from '../lib/audit';
import { badRequest, notFound } from '../lib/errors';
import { paginated, pageRange } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';

import { fanoutNearbyCrisis, notifyReportStatusChanged } from './notification.service';

/** A patch applied to the report row plus the notification status to emit. */
interface ActionOutcome {
  patch: Partial<CrisisReportRow>;
  notifyStatus?: string;
  fanout?: boolean;
}

function resolveAction(
  report: CrisisReportRow,
  input: ModerateReportInput,
  moderatorId: string,
  now: string,
): ActionOutcome {
  switch (input.action) {
    case 'MARK_UNDER_REVIEW':
      return { patch: { verification_status: 'UNDER_REVIEW' } };
    case 'VERIFY':
      return {
        patch: {
          verification_status: 'VERIFIED',
          verified_by: moderatorId,
          verified_at: now,
          verification_notes: input.notes ?? report.verification_notes,
        },
        notifyStatus: 'VERIFIED',
        fanout: true,
      };
    case 'REJECT':
      return {
        patch: {
          verification_status: 'REJECTED',
          verified_by: moderatorId,
          verified_at: now,
          verification_notes: input.notes ?? report.verification_notes,
        },
        notifyStatus: 'REJECTED',
      };
    case 'REQUEST_INFO':
      return {
        patch: { verification_status: 'UNDER_REVIEW', verification_notes: input.notes ?? null },
        notifyStatus: 'UNDER_REVIEW',
      };
    case 'MARK_DUPLICATE':
      return {
        patch: {
          verification_status: 'REJECTED',
          duplicate_of_id: input.duplicateOfId ?? null,
          verified_by: moderatorId,
          verified_at: now,
          verification_notes: input.notes ?? 'Marked as duplicate',
        },
        notifyStatus: 'REJECTED',
      };
    case 'ESCALATE':
      return { patch: { status: 'ACTIVE', verification_status: 'UNDER_REVIEW' } };
    case 'EXPIRE':
      return { patch: { verification_status: 'EXPIRED', status: 'EXPIRED' } };
    case 'REOPEN':
      return {
        patch: {
          verification_status: 'PENDING',
          status: 'ACTIVE',
          verified_by: null,
          verified_at: null,
        },
      };
    case 'ASSIGN_SEVERITY':
      if (!input.severity) throw badRequest('A severity is required for this action');
      return { patch: { severity: input.severity } };
    default:
      throw badRequest('Unsupported moderation action');
  }
}

export async function moderateReport(
  reportId: string,
  input: ModerateReportInput,
  moderator: AuthUser,
  ipHash: string | null,
): Promise<CrisisReport> {
  const { data: report, error: readErr } = await supabaseAdmin
    .from('crisis_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!report) throw notFound('Report not found');

  const now = new Date().toISOString();
  const outcome = resolveAction(report, input, moderator.id, now);

  // Recompute risk against the post-action severity/verification state.
  const nextSeverity = outcome.patch.severity ?? report.severity;
  const nextVerification = outcome.patch.verification_status ?? report.verification_status;
  const risk = calculateRisk({
    severity: nextSeverity,
    verificationStatus: nextVerification,
    reportedAt: report.reported_at,
    corroborationCount: report.corroboration_count,
  });
  const isExpiredOrRejected = nextVerification === 'EXPIRED' || nextVerification === 'REJECTED';
  outcome.patch.risk_level = isExpiredOrRejected ? 'UNKNOWN' : risk.level;
  outcome.patch.risk_score = isExpiredOrRejected ? 0 : risk.score;

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('crisis_reports')
    .update(outcome.patch)
    .eq('id', reportId)
    .select('*')
    .single();
  if (updateErr) throw updateErr;

  // Record the moderation action for the incident's audit trail.
  await supabaseAdmin.from('crisis_verifications').insert({
    report_id: reportId,
    moderator_id: moderator.id,
    action: input.action,
    notes: input.notes ?? null,
    previous_status: report.verification_status,
    new_status: updated.verification_status,
  });

  await writeAudit({
    actorId: moderator.id,
    actorRole: moderator.role,
    action: `report.${input.action.toLowerCase()}`,
    resourceType: 'crisis_report',
    resourceId: reportId,
    metadata: { reference: report.reference, notes: input.notes ?? null },
    previousValue: { verification_status: report.verification_status, severity: report.severity },
    newValue: { verification_status: updated.verification_status, severity: updated.severity },
    ipHash,
  });

  // Notify the (non-anonymous) reporter of the status change.
  if (outcome.notifyStatus && report.reported_by && !report.is_anonymous) {
    await notifyReportStatusChanged(report.reported_by, updated, outcome.notifyStatus).catch(
      () => undefined,
    );
  }

  // On verification of a significant incident, alert nearby users.
  if (outcome.fanout && SEVERITY_WEIGHT[updated.severity as Severity] >= SEVERITY_WEIGHT.MODERATE) {
    await fanoutNearbyCrisis(updated).catch(() => undefined);
  }

  return mapReport(updated);
}

export async function listModerationQueue(
  query: ReportQueryInput,
): Promise<Paginated<CrisisReport>> {
  const { from, to } = pageRange(query.page, query.pageSize);
  let q = supabaseAdmin.from('crisis_reports').select('*', { count: 'exact' });

  // Default queue = items awaiting a decision, unless a status is specified.
  if (query.status) {
    q = q.eq('verification_status', query.status);
  } else {
    q = q.in('verification_status', ['PENDING', 'UNDER_REVIEW'] as VerificationStatus[]);
  }
  if (query.categoryId) q = q.eq('category_id', query.categoryId);
  if (query.severity) q = q.eq('severity', query.severity);
  if (query.q) q = q.or(`title.ilike.%${query.q}%,location_name.ilike.%${query.q}%`);

  const { data, error, count } = await q
    // Highest severity first, then oldest — the classic triage order.
    .order('severity', { ascending: false })
    .order('reported_at', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return paginated(
    (data ?? []).map((r) => mapReport(r)),
    query.page,
    query.pageSize,
    count ?? 0,
  );
}
