# Verificación del entorno Docker de producción (datos sintéticos) — 2026-10-23

Autorización: Product Owner, en chat, solo para esta prueba. Proyecto Compose aislado `unc-verify`, secretos
aleatorios descartables y archivos de entorno/override fuera del repositorio. Sin push, sin GHCR, sin MinIO.
No se tocaron los contenedores ni volúmenes de desarrollo.

## Resultado por paso

| # | Paso | Resultado | Evidencia breve |
|---|------|-----------|-----------------|
| 1 | `compose config` sin perfil / con `--profile s3` | OK | Sin perfil: postgres, cms-migrate, cms, portal, nginx. Con `s3`: se añade minio. |
| 2 | `nginx -t` | OK | Sintaxis válida con certificado autofirmado; sin los hosts `portal`/`cms` falla solo por ellos (`host not found in upstream "portal:3000"`), nunca por minio. `files.*` resuelve en cada petición: sin minio responde 502. |
| 3 | Migraciones en Postgres 16 vacío (`cms-migrate`, como deploy.yml) | OK | 4 migraciones aplicadas en ~16 s, rc=0, todas `batch=1`. Segunda ejecución: "Done." sin aplicar nada, rc=0. 67 tablas. Existen `noticias`, `_noticias_v`, `reconocimientos` (+`_ediciones`), `acreditaciones`, `media`, `auditoria` y los 3 índices de `perf_db_indexes`. |
| 4 | Arranque de cms + portal + nginx sin minio | OK tras corregir D1 a D5 | `up -d --no-deps --remove-orphans postgres cms portal nginx`: cms y portal `healthy`; gate de deploy.yml OK al primer intento; `MEDIA_STORAGE=local`. |
| 5 | Subidas por nginx (https remapeado, `-k`) | OK | Logo real: 201, y GET del archivo 200 `image/jpeg` con bytes idénticos. HTML renombrado `.jpg`: 400. SVG: 400 (con `image/svg+xml` y disfrazado de jpeg). 11,5 MiB: 413 JSON limpio de la **app**. 13 MiB: 413 de **nginx**. Ráfaga de 10 POST tras 45 s de reposo: 6 pasan (1 + burst 5) y de la 7.ª en adelante 429. Durante el bloqueo: login 200, GET `/api/noticias` 200, GET `/api/media` 200; `POST /api/media/` (barra final) 429. |
| 6 | Persistencia H-PERM | OK | `/app/media` pertenece a 1001:1001 (755) y es escribible por `nextjs`; volumen `unc_cms_media_prod`. `down` sin `-v` y `up`: mismo sha256 del archivo, fila `media` intacta, GET 200. Respaldo (paso 2b de `backup.sh` replicado): tar.gz legible y `sha256sum -c` OK; restaurado en un volumen vacío con el mismo sha256. |
| 7 | `encrypt-dump.sh` | OK | gpg 2.4.9 de Git Bash. `--check` OK; frase corta rc=1. `pg_dump -Fc` real (272 220 B) cifrado y verificado; `.sha256` OK; descifrado idéntico; `pg_restore --list` lista 769 entradas con las tablas esperadas; el texto plano se eliminó; frase incorrecta rc=2. |
| 8 | Home por nginx | OK | `/` 200 y `/en` 200; `/es` 307 a `/`. Sin datos no hay `id="premios"`. El head trae `icon` (favicon.ico, 192, 512) y `apple-touch-icon`. `/_next/image` 200 (con libvips corregido). http a https: 301. |
| 9 | Limpieza y entorno de desarrollo | Ver sección final | |

## Defectos encontrados

Todos son anteriores a esta sesión y quedaban ocultos porque nunca se había construido ni arrancado la imagen real.
Los D1 a D5 se corrigieron con prueba roja primero (`tests/deploy/docker-cms-image.test.mjs`, 10 pruebas, y `tests/unit/portal-health.spec.ts`).

| ID | Severidad | Dónde | Defecto | Estado |
|----|-----------|-------|---------|--------|
| D1 | Crítica | `apps/cms/Dockerfile` (CMD y COPY de estáticos de la etapa runner) | Con `outputFileTracingRoot` el standalone queda en `apps/cms/server.js`; `node server.js` daba MODULE_NOT_FOUND y el CMS no arrancaba. El comentario de `apps/cms/next.config.mjs` ("server.js lands at the root") es falso y sigue sin corregirse. | Corregido con TDD: CMD `apps/cms/server.js` y estáticos en `apps/cms/.next/static`. |
| D2 | Crítica | `apps/cms/Dockerfile` (`RUN npm run build:cms`) | `next build` exige `DATABASE_URI` (`config/database.ts`). En CI no existe `apps/cms/.env`, así que el build de la imagen del CMS fallaba; solo pasaba en una máquina con ese `.env`. | Corregido con TDD: valor de relleno solo para ese `RUN` (no ENV/ARG). Pendiente confirmar en un runner real. |
| D3 | Alta | `.dockerignore` (solo excluía `.env` de la raíz) | `apps/cms/.env` (secretos de desarrollo, 1392 B) entraba al contexto y quedaba en la imagen del CMS construida en local. No se leyó su contenido. Podía además inyectar variables no definidas en el compose. | Corregido con TDD: `**/.env`, `**/.env.*`, `!**/.env.example`. Las imágenes ya publicadas no se auditaron; si alguna se construyó en una máquina de desarrollo, rotar esos secretos. |
| D4 | Crítica | `apps/cms/Dockerfile` y `Dockerfile` (runner) | Falta `libvips-cpp.so.8.18.3` (nft no la traza): `import sharp` falla con ERR_DLOPEN_FAILED y **toda ruta de Payload responde 500** (`/api/users/me`, `/api/health`); en el portal falla el optimizador de imágenes. | Corregido con TDD: `COPY --from=deps` del paquete `@img/sharp-libvips-linuxmusl-x64` en ambos runners. |
| D5 | Alta | `compose.prod.yaml` (healthchecks de cms y portal) y `deploy.yml` (gate dep09) | Usaban `localhost`. Alpine lo resuelve a `::1` y el wget de busybox no reintenta, mientras Next escucha en `0.0.0.0` (solo IPv4): "Connection refused", contenedor `unhealthy` y deploy siempre revertido. Medido: `127.0.0.1` da 200 y `localhost` es rechazado. | Corregido con TDD: `127.0.0.1`. Se actualizaron 3 aserciones de `tests/deploy/dep09-deploy-rollback.test.mjs` que fijaban `localhost`. |
| D6 | Media | `app/api/health/route.ts:1-8` | La sonda del portal usaba la URL **pública** del CMS (`NEXT_PUBLIC_CMS_URL`) en lugar de la interna (`CMS_URL`). Con DNS externo ausente tardaba 3 s, superaba el `wget -T 3` del gate y marcaba el CMS como caído. | Corregido con TDD (`tests/unit/portal-health.spec.ts`). |
| D7 | Media (operativo) | `DEPLOY.md` | `POST /api/users/first-register` crea un usuario con rol `viewer`: el campo `role` solo lo puede fijar un superadmin. En producción no hay camino documentado para crear el primer superadmin (existe `apps/cms/scripts/seed/init.ts`, sin runbook). En la prueba se promovió con SQL sobre la base sintética. | Solo reportado. |
| D8 | Baja | `app/api/media` (413 de la app) | El cuerpo del 413 trae `"name":"n","data":{"size":0}` (campos poco informativos). Cosmético. | Solo reportado. |
| D9 | Baja | CMS | `Error verifying Nodemailer transport` al arrancar si el SMTP no responde (en la prueba apuntaba a un host inexistente). No es fatal. | Solo reportado. |

## No verificado

- DNS real, TLS y Let's Encrypt (certificado autofirmado, hosts forzados con `--resolve`).
- Pull de GHCR y el runner de GitHub (imágenes construidas en local con la etiqueta `unc-verify`). El build de CI con D2 corregido no se probó.
- El `deploy.yml` completo (flock, backup previo, rollback): solo se replicaron el migrador y el `up -d --no-deps`.
- Perfil `s3` y MinIO real (no se arrancó ni se descargó la imagen; solo `config`).
- El script `backup.sh` completo (su paso 1 usa el contenedor de desarrollo `unc-postgres-local`; se replicó solo el paso 2b).
- Home con datos reales y sección `premios` visible (base sintética vacía).
- Cabeceras de seguridad del archivo servido (`/api/media/file/...` no mostró `X-Content-Type-Options`; no se evaluó).
- Suite completa de vitest y `harness/check.mjs`. Se ejecutaron `tests/deploy/*.test.mjs` (150 de 152 antes de actualizar las 3 aserciones de dep09; `dep09-deploy-rollback` quedó en 21/21 después), `harness/*.test.mjs` (38/38) y `portal-health.spec.ts` (5/5).

## Comandos para repetir (sin secretos)

```bash
# Preparación (fuera del repo): env con valores aleatorios y override que remapea puertos e imágenes
#   override.yaml: nginx.ports !override [127.0.0.1:18080:80, 127.0.0.1:18443:443], volúmenes absolutos de nginx.conf y certs;
#                  image: unc-verify/{cms,cms-migrator,portal}:unc-verify
C="docker compose -p unc-verify -f infrastructure/docker/compose.prod.yaml -f override.yaml --env-file env.verify"
$C config --services ; $C --profile s3 config --services
docker run --rm --add-host portal:127.0.0.1 --add-host cms:127.0.0.1 -v <nginx.conf>:/etc/nginx/nginx.conf:ro -v <certs>:/etc/nginx/certs:ro nginx:1.27-alpine nginx -t
$C build cms-migrate cms portal
$C up -d --wait postgres
timeout --kill-after=30 600 $C run --rm -T --name unc-cms-migrate-prod cms-migrate < /dev/null   # dos veces
$C up -d --no-deps --remove-orphans postgres cms portal nginx
docker exec unc-cms-prod wget -q -O /dev/null -T 3 http://127.0.0.1:3000/api/health/ready
curl -sk --resolve cms.unc.edu.py:18443:127.0.0.1 -X POST https://cms.unc.edu.py:18443/api/users/first-register ...
curl -sk --resolve ... -X POST .../api/media -H "Authorization: JWT <token>" -F '_payload={"alt":"x"}' -F "file=@logo.jpg;type=image/jpeg"
$C down ; $C up -d --no-deps ...      # persistencia
docker exec unc-cms-prod tar -czf - -C /app/media . > media-volume.tar.gz
BACKUP_ENCRYPTION_PASSPHRASE=<>=20 chars> bash scripts/backup/encrypt-dump.sh <volcado.dump>
$C down -v --remove-orphans           # limpieza
```

En Git Bash sobre Windows usar `MSYS_NO_PATHCONV=1`, rutas `C:/...` en el override, y copiar los archivos a subir al directorio actual (curl nativo no resuelve rutas `/c/...`).

## Limpieza

Ver el mensaje final de la sesión: desmontaje del proyecto `unc-verify`, volumen `unc-verify-restore`, imágenes `unc-verify/*` y comprobación de los contenedores y volúmenes de desarrollo.
