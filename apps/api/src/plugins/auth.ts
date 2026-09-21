import type { AppRole, AuthUser } from '@crisis/types';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';

import { env } from '../config/env';
import { accountSuspended, unauthorized } from '../lib/errors';
import { supabaseAdmin } from '../lib/supabase';

// Supabase signs user access tokens with an asymmetric key (ES256/RS256) exposed
// via the GoTrue JWKS endpoint. Legacy anon/service keys — and the tokens our
// integration tests mint — use HS256 with the shared JWT secret. Verify each
// token against the right key material, chosen from its own `alg` header, so we
// support both the current asymmetric tokens and symmetric ones.
const JWT_SECRET = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
const jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL));

async function verifyAccessToken(token: string) {
  const { alg } = decodeProtectedHeader(token);
  if (alg?.startsWith('HS')) {
    return jwtVerify(token, JWT_SECRET);
  }
  return jwtVerify(token, jwks);
}

interface CachedProfile {
  role: AppRole;
  accountStatus: AuthUser['accountStatus'];
  expiresAt: number;
}
const profileCache = new Map<string, CachedProfile>();
const PROFILE_TTL_MS = 20_000;

async function resolveProfile(userId: string): Promise<CachedProfile> {
  const cached = profileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const entry: CachedProfile = {
    role: (data?.role as AppRole) ?? 'citizen',
    accountStatus: (data?.account_status as AuthUser['accountStatus']) ?? 'ACTIVE',
    expiresAt: Date.now() + PROFILE_TTL_MS,
  };
  profileCache.set(userId, entry);
  return entry;
}

/** Invalidate a user's cached role/status (call after admin changes). */
export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId);
}

function extractToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

async function authenticateRequest(request: FastifyRequest, required: boolean): Promise<void> {
  const token = extractToken(request);
  if (!token) {
    if (required) throw unauthorized();
    return;
  }

  let sub: string;
  let email: string | null;
  try {
    const { payload } = await verifyAccessToken(token);
    sub = String(payload.sub);
    email = typeof payload.email === 'string' ? payload.email : null;
    if (!sub) throw new Error('missing sub');
  } catch {
    if (required) throw unauthorized('Invalid or expired session');
    return;
  }

  const profile = await resolveProfile(sub);
  if (profile.accountStatus !== 'ACTIVE') {
    throw accountSuspended(
      profile.accountStatus === 'BANNED'
        ? 'This account has been banned.'
        : 'This account is suspended.',
    );
  }

  request.authUser = { id: sub, email, role: profile.role, accountStatus: profile.accountStatus };
  request.accessToken = token;
}

export const authPlugin = fp(async (fastify) => {
  fastify.decorateRequest('authUser', null);
  fastify.decorateRequest('accessToken', null);

  // Populate authUser when a valid token is present, but never reject.
  fastify.decorate('optionalAuth', async function (request: FastifyRequest) {
    await authenticateRequest(request, false);
  });

  // Require a valid, active authenticated user.
  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    await authenticateRequest(request, true);
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null;
    accessToken: string | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
  }
}
