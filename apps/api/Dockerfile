# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Aegis Map — API image (Fastify, Node 20)
#
# The API is a pnpm-workspace package. tsup bundles the workspace `@crisis/*`
# packages into a single `dist/index.js` and keeps node_modules external, so the
# runtime image ships that bundle plus a pruned production dependency tree
# produced by `pnpm deploy`.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Corepack pins the exact pnpm version from the root package.json.
RUN corepack enable
WORKDIR /app

# ── Builder: install the full workspace, build + prune the API ───────────────
FROM base AS builder

# Copy the lockfile and every workspace manifest first so `pnpm install` is
# cached until a dependency actually changes. All workspace manifests must be
# present for `--frozen-lockfile` to reconcile against the lockfile.
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

# Now bring in the sources and build the API bundle.
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @crisis/api build

# Produce a self-contained deployment: the API's files (including dist/) plus a
# production-only node_modules with no symlinks into the workspace store.
RUN pnpm --filter @crisis/api --prod deploy /prod/api

# ── Runtime: minimal image with just the bundle + prod deps ──────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=4000

# Run as a non-root user.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /prod/api ./

USER nodejs
EXPOSE 4000

# Liveness/readiness against the app's own health endpoint. Uses Node (already
# present) so no extra tools like curl are needed in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
