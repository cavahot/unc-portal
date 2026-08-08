# Portal UNC — Production Docker image
# Build context: monorepo root (unc-portal/)
# Requires: output: 'standalone' in next.config.mjs
#
# Build:
#   docker build -t unc-portal:latest .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.prod unc-portal:latest

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests first for better layer caching.
# The root package.json defines the workspaces; lockfile is at the root.
COPY package.json package-lock.json ./
COPY packages/          packages/
COPY apps/cms/package.json apps/cms/

RUN npm ci --ignore-scripts

# ── Stage 2: build the portal ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Sentry build-time args — needed for source map upload during `next build`.
# NEXT_PUBLIC_SENTRY_DSN is also required at build time (embedded in client bundle).
# These are write-only / public values; they do not grant read access to Sentry data.
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Build only the portal (root Next.js app).
# CMS types are needed at build time; they live in packages/cms-types.
RUN npm run build:portal

# ── Stage 3: minimal runtime image ───────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user recommended by Next.js
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir -p .next && chown nextjs:nodejs .next

# standalone output contains a minimal node_modules and server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
