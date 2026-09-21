# Deployment

Aegis Map ships two application containers — the **API** and the **web** SPA — and depends
on a **Supabase** project for the data plane. This document covers building the images,
wiring configuration, and the sequence for a production release.

> **Container images have not been built in this repository's CI to date.** The Dockerfiles
> and compose file are provided and the pnpm-based build/prune mechanics have been validated
> locally, but you should build and smoke-test the images in your own environment before
> relying on them. See [security.md](./security.md) for the release checklist.

## 1. Topology

```
                    ┌───────────────────────┐
   Browser ───────► │  web container (nginx)│  static SPA on :8080
                    └───────────┬───────────┘
                                │ VITE_API_URL (baked at build)
                                ▼
                    ┌───────────────────────┐
                    │  api container (Node) │  Fastify on :4000
                    └───────────┬───────────┘
                                │ service-role key (runtime env)
                                ▼
                    ┌───────────────────────┐
                    │      Supabase         │  Cloud project or self-hosted
                    │  Postgres · Auth ·    │
                    │  Storage · Realtime   │
                    └───────────────────────┘
```

The data plane (Supabase) is **not** part of `docker-compose.yml` — it runs as its own
stack: a Supabase Cloud project, or a self-hosted Supabase deployment. The compose file
builds and runs only the two application services this repo owns.

## 2. Configuration model

There are two distinct kinds of configuration, and the distinction is a security boundary:

| Kind | Where it applies | Examples | Exposure |
|------|------------------|----------|----------|
| **Web build args (`VITE_*`)** | Baked into the SPA bundle at **build time** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_MAP_STYLE_URL`, `VITE_VAPID_PUBLIC_KEY` | Public — shipped to the browser. Only put public values here. |
| **API runtime env** | Read by the API process at **start** | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `VAPID_PRIVATE_KEY`, provider keys | **Secret** — never leaves the server. |

Because `VITE_*` values are compiled into the static bundle, changing them requires
**rebuilding** the web image — they cannot be injected at container start.

## 3. Building the images

Both Dockerfiles use the repo root as build context (they need the lockfile and all
workspace manifests for a frozen install).

**API:**

```bash
docker build -f apps/api/Dockerfile -t aegis-api:latest .
```

Multi-stage: installs the frozen workspace, runs `pnpm --filter @crisis/api build` (tsup →
single ESM bundle), then `pnpm --filter @crisis/api --prod deploy` to produce a pruned
production tree. The runtime stage is `node:20-slim`, runs as a **non-root** user, exposes
`4000`, and has a `HEALTHCHECK` hitting `/api/v1/health`. It launches `node dist/index.js`.

**Web:**

```bash
docker build -f apps/web/Dockerfile \
  --build-arg VITE_SUPABASE_URL=https://YOUR.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY \
  --build-arg VITE_API_URL=https://api.your-domain.com \
  --build-arg VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty \
  --build-arg VITE_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY \
  -t aegis-web:latest .
```

Multi-stage: builds the SPA with the `VITE_*` args, then serves the static output with
`nginx:1.27-alpine` on **:8080** (unprivileged). The nginx config does SPA history
fallback, sets security headers, never caches `sw.js`/`index.html`, and hard-caches
fingerprinted `/assets/`.

## 4. docker-compose

`docker-compose.yml` builds and runs both services and reads variables from a sibling
`.env` (copy `.env.example`). Required server secrets use the `${VAR:?message}` form, so
compose **refuses to start** if they are unset rather than booting misconfigured.

```bash
cp .env.example .env      # fill in real values
docker compose up --build
```

- `web` → `http://localhost:8080`
- `api` → `http://localhost:4000`

**Reaching a Supabase running on the host** from inside the containers (Docker Desktop):
set `SUPABASE_URL=http://host.docker.internal:54321`. Note that `VITE_SUPABASE_URL` is
browser-facing, so it must be a URL the **browser** can reach (e.g. your public Supabase
URL or `http://localhost:54321` for local), not the internal compose hostname.

## 5. Provisioning Supabase (production)

1. Create a Supabase project (Cloud) or stand up a self-hosted instance.
2. Link and push the schema:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push        # applies migrations 0001–0007
   ```
3. Seed reference data. Migration `0006_baseline_data` already inserts categories,
   settings, and guides. For additional/demo data, run the seed against the project's
   connection string:
   ```bash
   DATABASE_URL="postgresql://…prod connection…" pnpm db:seed
   ```
   (Review `supabase/seed/seed.sql` before running it against production — it may contain
   demo accounts you do not want in a live system.)
4. Configure Auth: set the Site URL and redirect URLs to your web origin, and configure the
   email provider (SMTP) so verification/reset emails are delivered.
5. Confirm Storage buckets and RLS policies from `0005`/`0004` are present (they are applied
   by the migrations).

## 6. Release sequence

1. **Migrate first.** Apply DB migrations before deploying app code that depends on them
   (`supabase db push`). Migrations are ordered and idempotent.
2. **Deploy the API.** Provide runtime env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGIN` (your web origin), and
   any provider/VAPID keys. The container health-checks `/api/v1/health`.
3. **Build & deploy the web image** with the production `VITE_*` build args, including
   `VITE_API_URL` pointing at the deployed API.
4. **Smoke test.** `GET /api/v1/health` and `/api/v1/ready` on the API; load the SPA and
   confirm sign-in, the map, and one report round-trip.

## 7. Runtime configuration reference

**API (runtime env):**

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SUPABASE_URL` | ✅ | — | Supabase project URL. |
| `SUPABASE_ANON_KEY` | ✅ | — | Public key (server also uses it for user-scoped calls). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | **Secret.** Bypasses RLS; server-only. |
| `SUPABASE_JWT_SECRET` | ✅ | — | Verifies incoming access tokens (min 16 chars). |
| `API_HOST` / `API_PORT` | — | `0.0.0.0` / `4000` | Bind address. |
| `CORS_ORIGIN` | — | — | Comma-separated allowed browser origins. |
| `LOG_LEVEL` | — | `info` | Pino level. |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | — | `100` / `1 minute` | Global rate limit. |
| `MAX_UPLOAD_BYTES` | — | `15728640` (15 MB) | Multipart upload cap. |
| `EXPIRY_SWEEP_MINUTES` | — | `15` | Report-expiry sweep interval. |
| `GEOCODING_PROVIDER` / `GEOCODING_BASE_URL` / `GEOCODING_API_KEY` | — | `nominatim` | Geocoding backend. |
| `ROUTING_PROVIDER` / `ROUTING_BASE_URL` / `ROUTING_API_KEY` | — | `osrm` | Routing backend. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | — | — | Web Push (blank disables). |

**Web (build args, baked into the bundle):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase URL the browser calls. |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key. |
| `VITE_API_URL` | ✅ | Deployed API base URL. |
| `VITE_MAP_STYLE_URL` | — | MapLibre style JSON. |
| `VITE_MAP_DEFAULT_LAT/LNG/ZOOM` | — | Initial map view. |
| `VITE_VAPID_PUBLIC_KEY` | — | Enables push subscription in the browser. |

## 8. CI

`.github/workflows/ci.yml` runs on push/PR to `main`/`master`: install → `format:check` →
`lint` → `typecheck` → `test` → `build` (with public placeholder `VITE_*`) → upload the web
build artifact; a second job installs Chromium and runs the Playwright smoke suite. **No
secrets are required** — tests stub the Supabase boundary and the build only needs public
placeholders. Wire image builds/publishing into CD once you have a registry and the images
are validated in your environment.
