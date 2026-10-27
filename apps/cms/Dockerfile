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
# VERIF-DOCKER-03: `next build` evalúa payload.config.ts, que exige DATABASE_URI (config/database.ts) y lanza
# si falta. En CI no existe apps/cms/.env, así que sin esto el build fallaba (solo pasaba en una máquina con ese
# .env, que además se filtraba a la imagen: ver .dockerignore). Se pasa un valor de relleno SOLO a este comando
# (no es ENV/ARG: no queda en la imagen ni en el entorno de ejecución). Amenaza que evita: build roto en CI y
# secretos de dev en capas. Límite: no abre conexión (el build solo importa módulos); la URI real llega en runtime.
RUN DATABASE_URI=postgresql://build:build@localhost:5432/build npm run build:cms

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

# MIG-IMG fase 1: directorio de los archivos de `media` (MEDIA_STORAGE=local). Se crea AQUÍ con dueño
# nextjs:nodejs (uid 1001) porque la raíz de /app es de root y el usuario sin privilegios no podría
# crearlo en la primera subida (hipótesis H-PERM). Al montar el volumen nombrado cms_media en esta ruta,
# Docker copia el dueño y los permisos de este directorio al volumen vacío. Límite: un volumen que ya
# tenga contenido con otro dueño (o un bind a una carpeta del host) NO hereda estos permisos y habrá que
# corregirlos a mano (chown 1001:1001).
ENV MEDIA_DIR=/app/media
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media

# VERIF-DOCKER-01: con outputFileTracingRoot = raíz del monorepo, Next replica la estructura del monorepo
# dentro de standalone: el servidor queda en apps/cms/server.js (NO en la raíz) y sirve los estáticos desde
# apps/cms/.next/static. Verificado construyendo la imagen real (2026-10-23): `node server.js` en /app daba
# MODULE_NOT_FOUND y el CMS no arrancaba. Límite: si se quita outputFileTracingRoot, hay que revertir ambas rutas.
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/static     ./apps/cms/.next/static

# VERIF-DOCKER-05: el tracer de Next copia el .node de sharp pero NO libvips-cpp.so (se carga con dlopen). Sin esto
# `import sharp` falla (ERR_DLOPEN_FAILED) y en el CMS toda ruta de Payload responde 500; en el portal falla el
# optimizador de imágenes. Se copia el paquete de libvips (musl/x64) desde `deps`. Límite: solo esta plataforma.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@img/sharp-libvips-linuxmusl-x64 ./node_modules/@img/sharp-libvips-linuxmusl-x64

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/cms/server.js"]
