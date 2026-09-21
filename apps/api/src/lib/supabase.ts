import {
  createServiceSupabase,
  createUserScopedSupabase,
  type TypedSupabaseClient,
} from '@crisis/database';

import { env } from '../config/env';

/**
 * Singleton service-role client. BYPASSES RLS — only used by trusted, audited
 * server code. Never exposed to clients.
 */
export const supabaseAdmin: TypedSupabaseClient = createServiceSupabase(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Build a client that executes under a specific end-user's RLS context. Used
 * for user-scoped reads where we want RLS to be the backstop.
 */
export function supabaseForUser(accessToken: string): TypedSupabaseClient {
  return createUserScopedSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, accessToken);
}
