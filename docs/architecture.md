# Architecture

Aegis Map is a full-stack, TypeScript monorepo for crisis reporting and safe-location
mapping. This document describes how the pieces fit together, the boundaries between
them, and the decisions behind the layout.

## 1. High-level shape

```
┌──────────────────────────────────────────────────────────────────────┐
│                              Browser (SPA)                             │
│  React + Vite + Tailwind + shadcn/ui + TanStack Query + MapLibre GL    │
│                                                                        │
│   ┌──────────────────┐         ┌───────────────────────────────────┐  │
│   │  Supabase client │         │        Typed `api` client         │  │
│   │  (ANON key only) │         │  (fetch wrapper, standard envelope)│  │
│   └────────┬─────────┘         └──────────────────┬────────────────┘  │
└────────────┼──────────────────────────────────────┼───────────────────┘
             │ auth · storage upload · realtime      │ HTTPS (Bearer JWT)
             │ (anon key, RLS-guarded)               │
             ▼                                        ▼
   ┌────────────────────┐              ┌──────────────────────────────┐
   │      Supabase      │◄─────────────┤        Fastify API           │
   │  Postgres+PostGIS  │  service     │  routes → services → lib     │
   │  Auth · Realtime   │  role key    │  auth · rbac · errorHandler  │
   │  Storage · RLS     │  (server)    │  (Node 20, ESM, tsup bundle) │
   └────────────────────┘              └──────────────────────────────┘
```

There are **two** paths from the browser to data, and the split is deliberate:

1. **Direct to Supabase** — only for **authentication**, **Storage uploads**, and
   **Realtime subscriptions**, using the **anon (public) key**. These operations are
   guarded by Row-Level Security (RLS) policies in the database, so the public key is
   safe to ship to the browser.
2. **Through the API** — everything else (reads, writes, moderation, admin, routing,
   geocoding, notifications) goes through the typed `api` client to the Fastify server.
   The server holds the **service-role key** and enforces authorization on top of RLS.

The service-role key, JWT secret, and all provider API keys **never** leave the server.
See [security.md](./security.md) for the full trust model.

## 2. Repository layout

A pnpm workspace orchestrated by Turborepo.

```
aegis-map/
├── apps/
│   ├── api/          Fastify HTTP API (Node 20, ESM). Bundled with tsup.
│   └── web/          React SPA + PWA. Built with Vite.
├── packages/
│   ├── config/       Shared build/tooling config (tsconfig, eslint presets).
│   ├── database/     Supabase client factories + generated DB types.
│   ├── types/        Domain types shared across API and web.
│   ├── ui/           Shared UI primitives / design tokens.
│   ├── utils/        Framework-agnostic helpers (geo, formatting, result).
│   └── validation/   Zod schemas shared by client and server.
├── supabase/
│   ├── migrations/   Ordered, reproducible SQL migrations (0001–0007).
│   ├── seed/         seed.sql — baseline + demo data.
│   └── config.toml   Local Supabase stack configuration.
├── scripts/          Repo scripts (seed.mjs).
├── docs/             This documentation.
└── docker-compose.yml
```

### Why packages ship TypeScript source

The six workspace packages have no build step. Their `package.json` points `main`,
`types`, and `exports` directly at `./src/index.ts`. Consumers resolve them through
Vite aliases (web) and `tsconfig` path mappings (typecheck), and the API's `tsup`
bundle inlines them via `noExternal: [/^@crisis\//]`. This keeps the dev loop fast
(no watch-rebuild of intermediate packages) and means there is exactly one compiler
that turns source into artifacts per app.

## 3. The API (`apps/api`)

A layered Fastify application. `buildApp()` in `src/app.ts` composes the server and is
the single entry point used by both the runtime (`src/index.ts`) and the tests — it
registers plugins and routes but **does not** touch the database at boot, so it is cheap
to instantiate in unit tests.

**Layers:**

- **`routes/v1/*`** — HTTP concerns only: parse/validate input (Zod), call a service,
  shape the response envelope. Thirteen route groups are mounted under `/api/v1`:
  `health`, `me`, `reports`, `map`, `categories`, `safe-locations`, `routing`,
  `alerts`, `notifications`, `moderation`, `admin`, `guides`, `geo`.
- **`services/*`** — business logic and all database access. One service per domain
  (`report`, `moderation`, `alert`, `notification`, `push`, `safeLocation`, `route`,
  `guide`, `admin`, `user`), plus provider abstractions for `geocoding` and `routing`.
- **`lib/*`** — infrastructure: Supabase client construction, envelope helpers.
- **`plugins/*`** — cross-cutting Fastify plugins:
  - `auth` — verifies the Supabase access token (JWT) with `jose` and attaches the
    caller's identity/role to the request.
  - `rbac` — role gates (`citizen` < `moderator` < `admin`) for protected routes.
  - `errorHandler` — maps thrown errors to the standard error envelope.

**Provider abstractions.** Geocoding and routing are behind interfaces selected by env
(`GEOCODING_PROVIDER`, `ROUTING_PROVIDER`), so Nominatim/OSRM (the free defaults) can be
swapped for MapTiler/Google/OpenRouteService/GraphHopper without touching call sites.

**Build.** `tsup` produces a single ESM `dist/index.js` targeting `node20`, bundling the
`@crisis/*` packages but keeping npm dependencies external (`skipNodeModulesBundle`).
The runtime image therefore needs only `dist/index.js` plus pruned production
`node_modules`.

## 4. The web app (`apps/web`)

A React 18 single-page app built with Vite, styled with Tailwind + shadcn/ui.

- **Data fetching** — TanStack Query over a typed `api` client. The client attaches the
  Supabase access token as a Bearer header, unwraps the standard success envelope, and
  throws typed errors on failure envelopes.
- **Forms** — React Hook Form + Zod resolvers, using the `@crisis/validation` schemas
  that the API validates against, so client and server agree on shape and rules.
- **Maps** — MapLibre GL with a configurable style URL; centre/zoom default to Nigeria
  (Abuja) and are env-overridable.
- **Auth/session** — an auth provider wraps the Supabase JS client (anon key) and exposes
  session state; realtime subscriptions and Storage uploads use the same client.
- **PWA** — VitePWA with an injected service worker (`injectManifest`). The SW is disabled
  in dev to keep the reload loop clean.
- **Routing** — React Router. Twenty-eight pages spanning the public map, reporting,
  safe locations, routing, alerts, guides, notifications, profile, moderation queue, and
  the admin console.

**Runtime configuration** is read in `src/lib/env.ts`, which throws at browser runtime if
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or `VITE_API_URL` are missing. Because this
check runs at module load (not build time), `vite build` succeeds without them — a
production image bakes the `VITE_*` values in as **build args**.

## 5. Data plane (Supabase)

Postgres with the PostGIS extension. Schema is defined by seven ordered, idempotent
migrations:

| Migration | Contents |
|-----------|----------|
| `0001_extensions_and_enums` | PostGIS + extensions; 10 enums (`app_role`, `severity`, `crisis_status`, `verification_status`, `risk_level`, `safe_location_type`, …) |
| `0002_core_tables` | 14 tables: `profiles`, `crisis_categories`, `crisis_reports`, `crisis_evidence`, `crisis_verifications`, `safe_locations`, `alerts`, `notifications`, `notification_preferences`, `saved_locations`, `push_subscriptions`, `audit_logs`, `system_settings`, `emergency_guides` |
| `0003_functions_and_triggers` | DB functions + triggers (risk scoring, duplicate detection, expiry, `updated_at`) |
| `0004_rls` | Row-Level Security policies for every table |
| `0005_realtime_and_storage` | Realtime publication + Storage buckets/policies |
| `0006_baseline_data` | Reference data (categories, settings, guides) |
| `0007_admin_functions` | Admin/moderation RPCs |

Migrations are applied with `supabase db push` (or `supabase db reset` locally, which also
runs the seed). Because they are ordered and idempotent, the schema is fully reproducible
from an empty database.

**Geospatial.** Reports and safe locations carry PostGIS geometry; proximity queries
(nearby reports, safe locations within radius, alert targeting) run in the database.

## 6. Cross-cutting contracts

- **API envelope.** Every response is either `{ ok: true, data }` or
  `{ ok: false, error: { code, message, details? } }`. The web `api` client depends on
  this shape; the API's `errorHandler` guarantees it.
- **Shared validation.** `@crisis/validation` Zod schemas are the single source of truth
  for request shapes, imported by both the API routes and the web forms.
- **Shared types.** `@crisis/types` carries domain types; `@crisis/database` carries the
  generated Postgres types, so a schema change surfaces as a type error at compile time.
- **Strict TypeScript.** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noUnusedLocals/Parameters` across the repo.

## 7. Build & test orchestration

Turborepo runs `build`, `lint`, `typecheck`, `test`, and `test:e2e` across the workspace
with task-graph awareness and caching. The full gate (see
[development/setup.md](./development/setup.md)) is:

```
format:check → lint → typecheck → test → build → test:e2e
```

- **Unit/integration** — Vitest. API tests inject their own env and stub only the Supabase
  boundary, so **no database or secrets are required** to run them.
- **E2E** — Playwright (Chromium). A backend-free smoke suite boots the SPA against Vite
  with public placeholder config and asserts the shell, routing, the not-found page, and
  the sign-in form. Full-stack journeys require a provisioned API + Supabase and are kept
  out of the default suite by design.

## 8. Related documents

- [development/setup.md](./development/setup.md) — get it running locally.
- [deployment.md](./deployment.md) — containers, Supabase, and going to production.
- [security.md](./security.md) — trust boundaries, secrets, RLS, and hardening.
