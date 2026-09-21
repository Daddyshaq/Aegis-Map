# Security

This document describes Aegis Map's trust boundaries, how secrets are handled, the
authentication and authorization model, and a hardening checklist for production. It
reflects the code as built — every control below is implemented in the repository.

## 1. Trust boundaries

The single most important rule:

> **The browser holds only the Supabase *anon* (public) key. The service-role key, the JWT
> secret, and all provider API keys live only on the server and are never shipped to the
> client.**

There are two data paths from the browser, with different trust levels:

| Path | Credential | Guarded by |
|------|-----------|------------|
| Browser → Supabase (auth, Storage upload, Realtime) | anon key (public) | Row-Level Security policies |
| Browser → API → Supabase (everything else) | Bearer JWT to the API; service-role key server-side | API auth + RBAC, then RLS as backstop |

The anon key is *designed* to be public: it identifies the project but grants nothing on its
own — every table access is filtered by RLS. The service-role key **bypasses RLS** and is
therefore confined to trusted, audited server code (`supabaseAdmin` in
`apps/api/src/lib/supabase.ts`).

## 2. Secrets handling

- **Server secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
  `VAPID_PRIVATE_KEY`, provider keys) are read from the API's runtime environment and never
  serialized into responses or logs.
- **Public config** for the browser is limited to `VITE_*` variables. The `VITE_` prefix is
  the boundary: anything without it is invisible to the client bundle.
- **Env validation.** `apps/api/src/config/env.ts` validates all configuration with Zod at
  boot and **fails fast** on missing/invalid values (e.g. `SUPABASE_JWT_SECRET` must be ≥ 16
  chars), so a misconfigured server never starts serving.
- **`.env` is git-ignored**; only `.env.example` (documentation, no real values) is
  committed. `.dockerignore` also excludes `.env*` from build context (keeping only
  `.env.example`).
- **`docker-compose.yml`** declares required secrets with `${VAR:?message}`, so the stack
  refuses to start when a secret is absent rather than booting half-configured.

## 3. Authentication

Implemented in `apps/api/src/plugins/auth.ts`.

1. The web app authenticates users through Supabase Auth (anon key) and receives an access
   token (JWT).
2. The typed `api` client sends that token as `Authorization: Bearer <jwt>` on every API
   call.
3. The API verifies the token's signature and expiry with `jose` (`jwtVerify`) against
   `SUPABASE_JWT_SECRET`. An invalid or expired token is rejected with `401`.
4. The verified subject (`sub`) is used to resolve the caller's **role** and **account
   status** from the `profiles` table. This lookup is cached for 20 s and explicitly
   invalidated after admin changes (`invalidateProfileCache`), so a demotion or ban takes
   effect promptly without a per-request DB round-trip.
5. **Account status is enforced**: `BANNED`/`SUSPENDED` accounts are rejected even with a
   valid token.

Two guards are exposed:

- `authenticate` — requires a valid, active user (protected routes).
- `optionalAuth` — populates the caller if a valid token is present, but never rejects
  (used for endpoints that serve both anonymous and authenticated callers, e.g. the public
  map).

## 4. Authorization (RBAC + RLS)

Authorization is defended in **two independent layers**:

- **API RBAC** (`apps/api/src/plugins/rbac.ts`) — role gates enforce
  `citizen < moderator < admin`. Moderation routes require `moderator`+; admin routes
  require `admin`. This is the primary check and runs before any privileged DB access.
- **Row-Level Security** — every table has RLS policies (migration `0004_rls`). Even for
  user-scoped reads, the API can execute under the caller's own RLS context via
  `supabaseForUser(accessToken)` (`createUserScopedSupabase`), so RLS acts as a backstop:
  if an API check were ever wrong, the database still refuses unauthorized rows.

Service-role access (`supabaseAdmin`) is reserved for operations that legitimately need to
cross user boundaries (moderation, admin, system tasks) and is the exception, not the rule.

## 5. HTTP hardening

Registered in `apps/api/src/app.ts`:

- **Helmet** (`@fastify/helmet`) — secure response headers.
- **CORS** (`@fastify/cors`) — restricted to the origins in `CORS_ORIGIN` (comma-separated).
  Set this to your web origin(s) in production; do not leave it permissive.
- **Rate limiting** (`@fastify/rate-limit`) — global limit (`RATE_LIMIT_MAX` per
  `RATE_LIMIT_WINDOW` per IP). Health/readiness endpoints are allowlisted so probes are not
  throttled.
- **Upload limits** (`@fastify/multipart`) — evidence uploads are capped at
  `MAX_UPLOAD_BYTES` (15 MB default).
- **Standard error envelope** — the `errorHandler` plugin maps every error to
  `{ ok: false, error: { code, message } }` and does not leak stack traces or internal
  detail to clients.

The web tier (`apps/web/nginx.conf`) adds `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, a `Referrer-Policy`, and `Permissions-Policy: geolocation=(self)`.

## 6. Input validation

All request bodies, queries, and params are validated with **Zod** schemas from
`@crisis/validation` — the *same* schemas the web forms use, so validation cannot drift
between client and server. Validation failures return a `400` with a structured error
envelope. This is the first line of defence against malformed and injection-style input;
combined with the Supabase client's parameterized queries, it closes off SQL injection.

## 7. Data protection & auditing

- **Audit log.** Sensitive/administrative actions are recorded in `audit_logs`
  (migration `0002`), giving an accountability trail for moderation and admin operations.
- **Report lifecycle.** Reports carry expiry and status; a periodic sweep
  (`EXPIRY_SWEEP_MINUTES`) ages out stale reports so the public map reflects current
  conditions.
- **Storage.** Evidence lives in Supabase Storage with bucket policies (migration `0005`);
  uploads go directly browser→Storage under RLS, never through the API's memory.
- **PII.** Location data is inherently sensitive. The map and public endpoints should expose
  only what a citizen needs; keep precise reporter identity server-side and behind
  authorization.

## 8. Accessibility as a correctness concern

Form controls are programmatically associated with their labels and expose `aria-invalid`
and `aria-describedby` for errors (verified by the E2E smoke suite). This matters for
security-adjacent flows too: an unlabeled password or 2FA field is both a WCAG failure and a
usability hazard. The shared `FormControl` primitive forwards these attributes to the actual
input, and every field places the input as the direct control (not a wrapper).

## 9. What is *not* claimed

- **Container images have not been built/scanned in this repo's CI.** The Dockerfiles and
  their pnpm build/prune mechanics were validated locally, but image builds, vulnerability
  scanning, and image signing are left to your CD pipeline.
- **Full-stack E2E is not run by default.** The Playwright suite is a backend-free smoke
  test. End-to-end journeys against a live API + Supabase should be added in an
  environment-provisioned suite before launch.
- **Penetration testing / threat modelling** beyond the controls above has not been
  performed.

## 10. Production hardening checklist

- [ ] `CORS_ORIGIN` set to exact web origin(s); no wildcards.
- [ ] `SUPABASE_JWT_SECRET`, service-role key, and provider keys stored in a secrets manager,
      not committed or baked into images.
- [ ] Rate limits tuned for expected traffic; consider per-route limits for write endpoints.
- [ ] Supabase Auth Site URL / redirect URLs locked to your domain; SMTP configured.
- [ ] RLS policies reviewed against the actual endpoints (migration `0004`).
- [ ] Seed data reviewed — no demo/admin accounts leak into production.
- [ ] TLS terminated in front of both containers; HSTS enabled at the edge.
- [ ] Tighten the nginx CSP `connect-src` to your known hosts (Supabase, API, tiles,
      geocoding, routing) — it is intentionally permissive by default.
- [ ] Container image vulnerability scan in CD; run as non-root (the API image already does).
- [ ] Logging/alerting on `audit_logs` and on auth failures.

## 11. Reporting a vulnerability

Do not open a public issue for security problems. Contact the maintainers privately and
allow reasonable time to remediate before disclosure.
