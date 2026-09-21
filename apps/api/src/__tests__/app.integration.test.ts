import { ApiErrorCode } from '@crisis/types';
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Mock ONLY the database boundary — the external Supabase client. Everything
 * else under test is the real application: bootstrap, plugins, the auth guard,
 * RBAC, routing, validation, and the success/error envelopes. This is the
 * standard integration seam: stub the third-party dependency, exercise all of
 * our own code end-to-end. No API responses or business logic are faked.
 *
 * The stub returns an ACTIVE `citizen` profile for the auth guard's profile
 * lookup, which is the single DB call on the authenticated request path.
 */
vi.mock('../lib/supabase', () => {
  function makeStub(responses: Record<string, { data: unknown; error: unknown }>) {
    const resultFor = (table: string) => responses[table] ?? { data: null, error: null };
    function chain(table: string) {
      const c: Record<string, unknown> = {};
      const passthrough = [
        'select',
        'eq',
        'neq',
        'or',
        'order',
        'range',
        'limit',
        'gte',
        'lte',
        'insert',
        'update',
        'upsert',
        'delete',
        'match',
        'in',
        'filter',
        'contains',
      ];
      for (const m of passthrough) c[m] = () => c;
      c.maybeSingle = async () => resultFor(table);
      c.single = async () => resultFor(table);
      // Make the builder itself awaitable for terminal list queries.
      c.then = (resolve: (v: unknown) => unknown) => resolve(resultFor(table));
      return c;
    }
    return {
      from: (table: string) => chain(table),
      rpc: async () => ({ data: null, error: null }),
    };
  }

  const admin = makeStub({
    profiles: { data: { role: 'citizen', account_status: 'ACTIVE' }, error: null },
  });
  return {
    supabaseAdmin: admin,
    supabaseForUser: () => admin,
  };
});

const { buildApp } = await import('../app');

/**
 * Integration tests exercising the real Fastify app end-to-end via `inject`,
 * with only the Supabase boundary stubbed. Covers bootstrap + plugin
 * registration, security headers, the versioned route surface, the auth guard
 * (accept + every rejection path), RBAC denial, request validation, the 404
 * handler, and the standard success/error envelopes.
 */
describe('API integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Sign an HS256 JWT with the same secret the auth plugin verifies against. */
  async function signToken(sub = '11111111-1111-1111-1111-111111111111'): Promise<string> {
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
    return new SignJWT({ email: 'user@test.dev' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);
  }

  describe('health', () => {
    it('GET /api/v1/health returns the standard success envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toMatchObject({
        success: true,
        data: { status: 'ok', service: 'aegis-map-api' },
        message: null,
      });
      expect(body.meta).toBeDefined();
    });

    it('GET /api/v1/ready reports readiness', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/ready' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true, data: { status: 'ready' } });
    });

    it('applies security headers (helmet) to responses', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('not-found handler', () => {
    it('returns a NOT_FOUND error envelope with a request id', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/does-not-exist' });
      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.NotFound);
      expect(typeof body.error.requestId).toBe('string');
      expect(body.error.requestId.length).toBeGreaterThan(0);
    });
  });

  describe('authentication guard', () => {
    it('rejects a protected route with no token (401 UNAUTHORIZED)', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/me' });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe(ApiErrorCode.Unauthorized);
    });

    it('rejects a malformed bearer token (401)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { authorization: 'Bearer not-a-real-jwt' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe(ApiErrorCode.Unauthorized);
    });

    it('rejects a token signed with the wrong secret (401)', async () => {
      const wrongSecret = new TextEncoder().encode('a-completely-different-secret-value');
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('11111111-1111-1111-1111-111111111111')
        .setExpirationTime('1h')
        .sign(wrongSecret);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('accepts a validly-signed token and reaches a DB-free handler (200)', async () => {
      // A correctly-signed token clears JWT verification and the profile lookup
      // (stubbed ACTIVE citizen). `/me/push/key` needs no further DB access, so
      // it returns 200 — proving the guard admits genuine tokens.
      const token = await signToken();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me/push/key',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // VAPID keys are unset in tests, so push is disabled and the key is null.
      expect(body.data).toEqual({ publicKey: null });
    });

    it('rejects an unauthenticated write to a protected route (POST /reports)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reports',
        payload: {},
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe(ApiErrorCode.Unauthorized);
    });
  });

  describe('role-based access control', () => {
    it('denies a citizen access to a moderator-only route (403 FORBIDDEN)', async () => {
      // `GET /reports/:id/verifications` is guarded by [authenticate, requireModerator].
      // The stubbed profile is a citizen, so RBAC rejects before any handler runs.
      const token = await signToken();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/22222222-2222-2222-2222-222222222222/verifications',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe(ApiErrorCode.Forbidden);
    });
  });

  describe('request validation', () => {
    it('returns VALIDATION_ERROR with field details for a bad query param', async () => {
      // `/reports` uses optional auth, so with no token the handler runs and
      // validates the query BEFORE any DB access. `categoryId` must be a UUID.
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports?categoryId=not-a-uuid',
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.ValidationError);
      expect(Array.isArray(body.error.details)).toBe(true);
      expect(body.error.details.some((d: { field?: string }) => d.field === 'categoryId')).toBe(
        true,
      );
    });
  });

  describe('What3Words and Geocoding APIs', () => {
    it('converts What3Words address to coordinates', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/w3w/convert-to-coordinates?words=filled.count.soap',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.words).toBe('///filled.count.soap');
      expect(typeof body.data.lat).toBe('number');
      expect(typeof body.data.lng).toBe('number');
    });

    it('converts coordinates to 3-word address', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/w3w/convert-to-3wa?lat=9.0765&lng=7.3986',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.words).toMatch(/^\/\/\/[a-z]+\.[a-z]+\.[a-z]+$/);
    });

    it('autosuggests What3Words addresses', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/w3w/autosuggest?input=bridge.lake',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('resolves What3Words in /geo/search transparently', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/geo/search?q=///bridge.lake.river',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].what3words).toBe('///bridge.lake.river');
    });
  });
});
