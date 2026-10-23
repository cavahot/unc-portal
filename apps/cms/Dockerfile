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

# DEP-07/D1: node 22.17.0 trae npm 10.9.2 y con él `npm ci` falla («Missing: @swc/helpers@0.5.23
# from lock file»): el package-lock.json se generó con un npm más nuevo (docs/evidence/dep-07-validation.md).
# Se fija la versión MAYOR (npm@11) y no `latest` para que el build sea reproducible: `latest` puede
# saltar a otra mayor sin aviso y reescribir la resolución del lock. No se cambia la versión de Node.
# Límite: variante validada a mano (build de ~5 min); el re-build real con este archivo está pendiente.
# Si otra etapa llegara a ejecutar `npm ci`/`npm install`, debe repetir este paso (lo vigila
# tests/deploy/dep07-dockerfile-npm.test.mjs). `migrator` no instala: copia node_modules de `deps`.
RUN npm install -g npm@11 \
 && npm ci

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

# ── Migrator (DEP-07) ─────────────────────────────────────────────────────────
# Imagen de un solo uso para `payload migrate` (servicio `cms-migrate` en compose.prod.yaml).
# Por qué existe: el standalone de Next (etapa runner) no trae el CLI de payload, tsx ni
# apps/cms/src/migrations, y `readMigrationFiles` lee el DIRECTORIO de migraciones del disco.
# Qué incluye: node_modules completo de `deps` (CLI payload + tsx para cargar payload.config.ts),
# la config y las migraciones. Se declara ANTES de `runner` para que `runner` siga siendo la
# etapa final (el build sin --target debe seguir produciendo la imagen del CMS).
# Límite: imagen más grande que el runner (DEP-13/14); no se usa para servir tráfico.
# Nunca invocar migrate:down/reset/refresh/fresh desde esta imagen en el deploy.
FROM base AS migrator
WORKDIR /app/apps/cms

ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=/app/apps/cms/src/payload.config.ts

COPY --from=deps --chown=node:node /app/node_modules /app/node_modules
COPY --chown=node:node package.json /app/package.json
COPY --chown=node:node packages /app/packages
COPY --chown=node:node apps/cms/package.json apps/cms/tsconfig.json /app/apps/cms/
COPY --chown=node:node apps/cms/src /app/apps/cms/src

USER node

# `migrate` aplica solo migraciones pendientes (idempotente). No existe flag que evite el prompt
# interactivo de `batch = -1`: deploy.yml hace un precheck SQL antes de ejecutar este contenedor.
# Corrección D4: se creyó que sin TTY el CLI «salía con 0» sin migrar; medido (docs/evidence/dep-07-validation.md,
# ítem 4) el proceso queda COLGADO esperando el prompt. Por eso deploy.yml envuelve este contenedor con `timeout`
# (código 124 = fallo que aborta antes del `up -d`). Texto original conservado arriba en la evidencia.
CMD ["node", "/app/node_modules/payload/bin.js", "migrate"]

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
