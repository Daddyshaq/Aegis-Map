import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

function cleanSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1\/?$/, '');
}

/**
 * Browser/anon client. Safe for the frontend: relies entirely on RLS.
 * Persists the session so Supabase Auth survives reloads.
 */
export function createBrowserSupabase(url: string, anonKey: string): TypedSupabaseClient {
  return createClient<Database>(cleanSupabaseUrl(url), anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Server client bound to a specific end-user access token. Executes under that
 * user's RLS context — the correct choice for user-initiated writes on the API.
 */
export function createUserScopedSupabase(
  url: string,
  anonKey: string,
  accessToken: string,
): TypedSupabaseClient {
  return createClient<Database>(cleanSupabaseUrl(url), anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Service-role client. BYPASSES RLS. Server-side only — never ship this key or
 * a client built from it to the browser. Use only for trusted, audited work.
 */
export function createServiceSupabase(url: string, serviceRoleKey: string): TypedSupabaseClient {
  return createClient<Database>(cleanSupabaseUrl(url), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
