import { createHash } from 'node:crypto';

import type { AppRole } from '@crisis/types';

import { supabaseAdmin } from './supabase';

/**
 * Hash an IP address with a daily salt so audit records retain coarse
 * correlation ability without storing raw PII indefinitely.
 */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${day}:${ip}`).digest('hex').slice(0, 32);
}

export interface AuditEntry {
  actorId: string | null;
  actorRole: AppRole | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipHash?: string | null;
}

/**
 * Append an audit record. Failures are swallowed (logged by caller) so that an
 * audit write never blocks the primary operation, but they should be rare.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    metadata: entry.metadata ?? {},
    previous_value: entry.previousValue ?? null,
    new_value: entry.newValue ?? null,
    ip_hash: entry.ipHash ?? null,
  });
}
