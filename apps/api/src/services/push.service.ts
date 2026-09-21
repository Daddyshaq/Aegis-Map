import type { PushSubscriptionRecord } from '@crisis/types';
import type { PushSubscriptionInput } from '@crisis/validation';
import webpush from 'web-push';

import { env, pushEnabled } from '../config/env';
import { supabaseAdmin } from '../lib/supabase';

let configured = false;

/** Configure VAPID details once. Safe to call when push is disabled (no-op). */
export function configurePush(): void {
  if (!pushEnabled || configured) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
}

export function getVapidPublicKey(): string | null {
  return pushEnabled ? env.VAPID_PUBLIC_KEY : null;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}

export async function savePushSubscription(
  userId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  if (error) throw error;
}

export async function listPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    createdAt: r.created_at,
  }));
}

/**
 * Deliver a Web Push message to every registered device for a user.
 * Stale subscriptions (404/410) are pruned automatically. Never throws — push
 * is best-effort and must not fail the originating request.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;
  configurePush();

  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (error || !data?.length) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    data.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        }
      }
    }),
  );
}
