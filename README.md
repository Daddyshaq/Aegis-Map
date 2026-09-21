# Aegis Map

**Web-based crisis reporting and safe-location mapping.** Aegis Map lets citizens report
crises with evidence, see verified incidents on a live map, find and navigate to nearby safe
locations, and receive location-based alerts — while moderators and admins verify reports,
manage alerts, and keep the map trustworthy.

Built for the Nigerian context (map defaults to Abuja) on a globally deployable
architecture.

> **Status:** production-grade build. All static checks, unit/integration tests, and the
> Playwright smoke suite pass. Container **images** have not yet been built in CI — see
> [docs/deployment.md](./docs/deployment.md) and [docs/security.md](./docs/security.md#9-what-is-not-claimed)
> for exactly what is and isn't validated.

## Features

- 🗺️ **Interactive map** of verified crisis reports and safe locations (MapLibre GL).
- 📝 **Crisis reporting** with categories, severity, geolocation, and evidence upload.
- ✅ **Verification & moderation** workflow — a queue, verification records, and an audit
  trail.
- 🏥 **Safe locations** — hospitals, shelters, police, and more, with operating status.
- 🧭 **Safe routing** — directions that account for reported hazards.
- 🔔 **Alerts & notifications** — location-based alerts with Web Push and in-app delivery.
- 👤 **Role-based access** — `citizen`, `moderator`, `admin`, each with a tailored surface.
- 🛠️ **Admin console** — categories, guides, users, alerts, settings, and audit logs.
- 📖 **Emergency guides** — DB-driven, editable safety guidance.
- 📱 **Installable PWA** with offline-aware service worker.
- ♿ **Accessible** (WCAG-minded), fully keyboarded forms, dark mode.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo, TypeScript (strict) |
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, MapLibre GL, VitePWA |
| Backend | Node 20, Fastify (layered), Zod, `jose`, tsup (ESM bundle) |
| Data | Supabase — Postgres + PostGIS, Auth, Realtime, Storage, RLS, SQL migrations |
| Quality | ESLint, Prettier, Vitest, Playwright, GitHub Actions CI |
| Delivery | Docker (multi-stage), docker-compose, nginx |

## Repository layout

```
apps/
  api/          Fastify HTTP API (routes → services → lib)
  web/          React SPA + PWA
packages/
  config/       Shared tooling/build config
  database/     Supabase client factories + generated DB types
  types/        Shared domain types
  ui/           Shared UI primitives
  utils/        Framework-agnostic helpers
  validation/   Zod schemas shared by client & server
supabase/
  migrations/   Ordered, reproducible SQL (0001–0007)
  seed/         seed.sql
scripts/        seed.mjs
docs/           Architecture, setup, deployment, security
```

See [docs/architecture.md](./docs/architecture.md) for how it all fits together.

## Quick start

**Prerequisites:** Node ≥ 20, pnpm ≥ 9 (`corepack enable`), the Supabase CLI, and Docker.

```bash
# 1. Install
corepack enable
pnpm install

# 2. Configure
cp .env.example .env        # fill in values from `supabase start` output

# 3. Data plane
supabase start              # Postgres+PostGIS, Auth, Storage, Realtime, Studio
pnpm db:reset               # apply migrations 0001–0007 + seed

# 4. Run
pnpm dev                    # API on :4000, web on :5173
```

Open **http://localhost:5173**. Full walkthrough (env vars, ports, Web Push, troubleshooting)
in [docs/development/setup.md](./docs/development/setup.md).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API + web together (Turborepo). |
| `pnpm build` | Build the API bundle and the web SPA. |
| `pnpm lint` | ESLint across the workspace. |
| `pnpm typecheck` | `tsc --noEmit` across the workspace. |
| `pnpm test` | Vitest unit + integration (no DB/secrets needed). |
| `pnpm test:e2e` | Playwright smoke suite (Chromium). |
| `pnpm format` / `format:check` | Prettier write / verify. |
| `pnpm db:migrate` | `supabase db push`. |
| `pnpm db:reset` | Recreate local DB from migrations + seed (**destructive**). |
| `pnpm db:seed` | Run `supabase/seed/seed.sql` via `psql` against `DATABASE_URL`. |

Target one workspace with `pnpm --filter <name> <script>`, e.g.
`pnpm --filter @crisis/web test:e2e`.

## Testing & CI

- **Unit/integration** (Vitest) stub the Supabase boundary and inject their own env — they
  need **no database and no secrets**.
- **E2E** (Playwright) is a backend-free smoke suite: it boots the SPA with public
  placeholder config and asserts the shell, routing, the not-found page, and the accessible
  sign-in form.
- **CI** ([.github/workflows/ci.yml](./.github/workflows/ci.yml)) runs
  `format:check → lint → typecheck → test → build` plus the E2E job on every push/PR to
  `main`/`master`, with no secrets required.

## Security model (in one paragraph)

The browser holds only the Supabase **anon (public) key** and talks to Supabase directly
**only** for auth, Storage uploads, and Realtime — all guarded by Row-Level Security.
Everything else goes through the typed `api` client to the Fastify server, which verifies
the caller's JWT, enforces role-based access, and holds the **service-role key** and all
provider secrets server-side. Full details, trust boundaries, and a production hardening
checklist are in [docs/security.md](./docs/security.md).

## Documentation

- [Architecture](./docs/architecture.md) — system shape, layers, contracts.
- [Development setup](./docs/development/setup.md) — run it locally.
- [Production Setup Guide](./docs/PRODUCTION_SETUP.md) — complete production guide for Supabase (Database & Auth), Render (Backend API), and Vercel (Frontend Web & PWA).
- [Deployment](./docs/deployment.md) — containers, Supabase, release sequence.
- [Security](./docs/security.md) — trust model, secrets, RLS, hardening.

## Deployment

Deploy the frontend to **Vercel**, the backend API to **Render**, and connect both to your **Supabase** database project. Follow the step-by-step [Production Setup Guide](./docs/PRODUCTION_SETUP.md).

## License

MIT.
