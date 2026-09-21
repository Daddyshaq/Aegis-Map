# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Aegis Map — Web image (React SPA + PWA, served by nginx)
#
# A Vite SPA inlines its VITE_* configuration at BUILD time, so the public
# Supabase URL/anon key and API URL are provided as build args and baked into
# the bundle. These are public-by-design values (the anon key is safe to ship);
# no server-only secret is ever passed here. Rebuild the image per environment.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ── Builder: install the workspace and produce the static bundle ─────────────
FROM base AS builder

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validation/package.json ./packages/validation/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Public, build-time configuration. Provide real values per environment via
# `docker build --build-arg` or docker-compose `build.args`.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_MAP_STYLE_URL
ARG VITE_MAP_DEFAULT_LAT
ARG VITE_MAP_DEFAULT_LNG
ARG VITE_MAP_DEFAULT_ZOOM
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL \
    VITE_MAP_STYLE_URL=$VITE_MAP_STYLE_URL \
    VITE_MAP_DEFAULT_LAT=$VITE_MAP_DEFAULT_LAT \
    VITE_MAP_DEFAULT_LNG=$VITE_MAP_DEFAULT_LNG \
    VITE_MAP_DEFAULT_ZOOM=$VITE_MAP_DEFAULT_ZOOM \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

RUN pnpm --filter @crisis/web build

# ── Runtime: nginx serving the static build ──────────────────────────────────
FROM nginx:1.27-alpine AS runner

# SPA-aware config: history-API fallback, no-cache for the entry document and
# service worker, long-lived immutable caching for hashed assets.
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
