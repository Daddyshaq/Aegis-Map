# Local development setup

This guide gets Aegis Map running on your machine end to end: the Supabase data plane, the
Fastify API, and the React web app.

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 (22/24 fine) | Matches the `engines` floor. |
| pnpm | ≥ 9 | The repo pins `pnpm@9.15.9` via `packageManager`; run `corepack enable` to get it automatically. |
| Supabase CLI | latest | Runs the local Postgres/Auth/Storage/Realtime stack. See <https://supabase.com/docs/guides/cli>. |
| Docker | latest | Required by the Supabase CLI to run the local stack. |
| psql | optional | Only needed for the standalone `pnpm db:seed` path. |

## 2. Install

```bash
corepack enable          # provisions the pinned pnpm
pnpm install             # installs the whole workspace
```

## 3. Configure environment

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

The API reads `.env` at the repo root (and `apps/api/.env` if present); the web app reads
`VITE_*` variables. The example file documents every variable. The ones that matter for a
first run:

- `VITE_SUPABASE_URL` / `SUPABASE_URL` — `http://127.0.0.1:54321` for the local stack.
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` — printed by `supabase start`.
- `SUPABASE_SERVICE_ROLE_KEY` — printed by `supabase start`. **Server-only.**
- `SUPABASE_JWT_SECRET` — printed by `supabase start` (min 16 chars).
- `VITE_API_URL` — `http://localhost:4000`.

> **Only `VITE_*` variables reach the browser.** The service-role key and JWT secret are
> server-only — never prefix them with `VITE_`.

## 4. Start the data plane

```bash
supabase start          # boots Postgres+PostGIS, Auth, Storage, Realtime, Studio
```

Local ports (from `supabase/config.toml`):

| Service | URL |
|---------|-----|
| API gateway | http://127.0.0.1:54321 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio (DB UI) | http://127.0.0.1:54323 |
| Inbucket (email testing) | http://127.0.0.1:54324 |

Copy the anon key, service-role key, and JWT secret printed by `supabase start` into your
`.env`.

## 5. Apply the schema and seed data

```bash
pnpm db:reset           # applies migrations 0001–0007, then runs the seed
```

`db:reset` is the recommended path locally: it recreates the database from the ordered
migrations and automatically runs `supabase/seed/seed.sql` (wired via `[db.seed]` in
`config.toml`). Other database scripts:

| Command | What it does |
|---------|--------------|
| `pnpm db:migrate` | `supabase db push` — apply pending migrations to the linked DB. |
| `pnpm db:reset` | Recreate the local DB from migrations + seed. **Destructive** (drops local data). |
| `pnpm db:seed` | Run `supabase/seed/seed.sql` against `DATABASE_URL` via `psql`. Needs `psql` on PATH; if it is missing the script tells you to use `pnpm db:reset` instead. |

## 6. Run the apps

```bash
pnpm dev                # runs API + web together via Turborepo
```

Or individually:

```bash
pnpm --filter @crisis/api dev     # Fastify on http://localhost:4000
pnpm --filter @crisis/web dev     # Vite on http://localhost:5173
```

Sanity check the API:

```bash
curl http://localhost:4000/api/v1/health     # { "ok": true, ... }
curl http://localhost:4000/api/v1/ready       # readiness
```

Then open the web app at **http://localhost:5173**.

## 7. Web Push (optional)

Push notifications need a VAPID key pair. Generate one and paste the values into `.env`:

```bash
pnpm --filter @crisis/api gen:vapid
# → VAPID_PUBLIC_KEY=… / VAPID_PRIVATE_KEY=…
```

Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (server) and
`VITE_VAPID_PUBLIC_KEY` (browser). Leaving them blank disables push cleanly.

## 8. Quality gates

Run the same checks CI runs, in order:

```bash
pnpm format:check       # Prettier
pnpm lint               # ESLint (0 errors required)
pnpm typecheck          # tsc --noEmit across the workspace
pnpm test               # Vitest (unit + integration) — no DB/secrets needed
pnpm build              # API bundle + web SPA
pnpm test:e2e           # Playwright smoke suite (Chromium)
```

Use `pnpm format` to auto-fix formatting. Individual packages/apps can be targeted with
`pnpm --filter <name> <script>` (e.g. `pnpm --filter @crisis/web typecheck`).

## 9. Troubleshooting

- **`vite build` succeeds but the app throws on load about missing env.** Expected: env is
  validated at browser runtime, not build time. Provide the `VITE_*` values.
- **API exits immediately at boot.** The env schema (`apps/api/src/config/env.ts`) fails
  fast on invalid/missing config. Read the error — it names the offending variable.
- **E2E `webServer` times out on Windows.** The Playwright config binds Vite to
  `127.0.0.1` explicitly because `localhost` can resolve to IPv6-only on some hosts; if you
  customise it, keep the explicit IPv4 host.
- **`pnpm db:seed` says psql is missing.** Use `pnpm db:reset` (no psql required) or install
  the Postgres client tools.

## 10. Next steps

- [architecture.md](../architecture.md) — how the system fits together.
- [deployment.md](../deployment.md) — containers and production.
- [security.md](../security.md) — the trust model and hardening checklist.
