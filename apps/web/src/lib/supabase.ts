import { type SupabaseClient, createClient } from '@supabase/supabase-js';

import { env } from './env';

/**
 * Browser Supabase client. Uses the public anon key ONLY — the service-role
 * key must never reach the frontend. All privileged operations go through the
 * API. The frontend uses this client for authentication, evidence/avatar
 * uploads to Storage, and Realtime subscriptions; everything else is mediated
 * by the API so Row Level Security and server-side authorization apply.
 */
export const supabase: SupabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Needed so password-reset / email-confirmation links establish a session.
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'aegis.auth',
  },
  global: {
    headers: { 'x-application': 'aegis-web' },
  },
});
