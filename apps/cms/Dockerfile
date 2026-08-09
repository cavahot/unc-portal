# Portal UNC — CMS Production Dockerfile
#
# IMPORTANT: build context must be the MONOREPO ROOT, not apps/cms/.
# The package-lock.json and packages/ workspace live at the root.
#
# In CI (deploy.yml) and compose.prod.yaml (local build):
#   context:    .                    ← repo root
#   dockerfile: apps/cms/Dockerfile

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Suppress husky git hooks — no git repo inside Docker build
ENV HUSKY=0

# Copy root workspace manifests (package-lock.json is at the monorepo root)
COPY package.json package-lock.json ./

# Copy workspace manifests so npm can resolve workspace symlinks
COPY apps/cms/package.json apps/cms/
COPY packages/ packages/

RUN npm ci

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the CMS workspace. Output lands in apps/cms/.next/
# outputFileTracingRoot in apps/cms/next.config.mjs points to the monorepo
# root so that server.js appears at the top of .next/standalone/, not nested.
RUN npm run build:cms

# ── Production runner ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output is rooted at apps/cms/.next/standalone/ (server.js at top
# level because outputFileTracingRoot is set to the monorepo root).
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
