# Portal UNC — Guía de Deploy en Producción

Esta guía cubre el **primer deploy** en el servidor VPS y los deploys subsiguientes
(manejados automáticamente por CI/CD). Seguila en orden — el orden importa.

---

## Requisitos previos

Antes de empezar necesitás:

- [ ] Acceso SSH al VPS (Ubuntu 22.04)
- [ ] Los secretos de producción (`.env.prod` — solicitarlos al equipo)
- [ ] Acceso de administrador al repositorio GitHub (`cavahot/unc-portal`)
- [ ] Docker Engine `>= 26.0` instalado en el servidor (ver paso 1)

---

## Parte 1 — Preparar el servidor

### Paso 1 — Instalar Docker Engine

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
newgrp docker
```

Verificar:

```bash
docker --version          # Docker version 26.x.x
docker compose version    # Docker Compose version v2.x.x
```

### Paso 2 — Crear la estructura de directorios

```bash
mkdir -p /opt/unc-portal/infrastructure/nginx/certs
```

### Paso 3 — Clonar el repositorio

```bash
cd /opt/unc-portal
git clone https://github.com/cavahot/unc-portal.git .
```

---

## Parte 2 — DNS y certificados SSL

> ⚠️ **Orden crítico**: los certificados SSL deben obtenerse ANTES de levantar
> Docker Compose. Nginx no arranca sin ellos, y certbot necesita el puerto 80 libre
> (que nginx estaría ocupando si ya estuviera corriendo).

### Paso 4 — Configurar DNS

En el panel del proveedor DNS, crear 3 registros A apuntando a la IP del VPS:

| Nombre | Tipo | Valor |
|--------|------|-------|
| `portal.unc.edu.py` | A | `<IP_DEL_VPS>` |
| `cms.unc.edu.py` | A | `<IP_DEL_VPS>` |
| `files.unc.edu.py` | A | `<IP_DEL_VPS>` |

Verificar propagación antes de continuar (puede tardar hasta 24h, usualmente minutos):

```bash
dig +short portal.unc.edu.py
dig +short cms.unc.edu.py
dig +short files.unc.edu.py
```

Los tres deben devolver la misma IP del VPS.

### Paso 5 — Obtener certificados SSL (Let's Encrypt)

Instalar certbot y obtener un certificado por dominio:

```bash
apt install -y certbot

certbot certonly --standalone -d portal.unc.edu.py
certbot certonly --standalone -d cms.unc.edu.py
certbot certonly --standalone -d files.unc.edu.py
```

### Paso 6 — Copiar certificados al directorio de nginx

El script copia cada cert con el nombre exacto que nginx espera:

```bash
cd /opt/unc-portal
bash scripts/setup/rename-certs.sh
```

Resultado esperado:

```
✓  portal.unc.edu.py → infrastructure/nginx/certs/portal_fullchain.pem + portal_privkey.pem
✓  cms.unc.edu.py    → infrastructure/nginx/certs/cms_fullchain.pem    + cms_privkey.pem
✓  files.unc.edu.py  → infrastructure/nginx/certs/files_fullchain.pem  + files_privkey.pem
✅ Certs copiados correctamente
```

### Paso 7 — Configurar renovación automática

Certbot se renueva automáticamente via systemd. Solo hay que agregar un deploy hook
para que nginx recargue la configuración después de cada renovación:

```bash
cat > /etc/letsencrypt/renewal-hooks/deploy/unc-portal.sh << 'EOF'
#!/usr/bin/env bash
set -e
cd /opt/unc-portal
bash scripts/setup/rename-certs.sh
docker compose \
  -f infrastructure/docker/compose.prod.yaml \
  --env-file infrastructure/docker/.env.prod \
  exec nginx nginx -s reload
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/unc-portal.sh
```

---

## Parte 3 — Variables de entorno

### Paso 8 — Crear `.env.prod`

```bash
cp infrastructure/docker/.env.prod.example infrastructure/docker/.env.prod
nano infrastructure/docker/.env.prod
```

Completar **todos** los valores marcados como `REEMPLAZAR_*`. Hay un solo nombre por concepto
(DEP-10): cada variable de `.env.prod` se interpola en `compose.prod.yaml` y llega al servicio
cuyo código la lee. Si el código lee una variable que su servicio no recibe, el guard `guard-env-parity`
(`harness/guards.mjs`) y `node --test tests/deploy/dep10-env-vars.test.mjs` fallan.

#### Variables por servicio (DEP-10)

| Variable (`.env.prod`) | Servicio que la recibe | Cómo se obtiene / valor |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER` | postgres | Nombres elegidos (p. ej. `unc_portal`, `unc_cms`) |
| `POSTGRES_PASSWORD` | postgres | Secreto aleatorio (comando de abajo); **la misma** contraseña va dentro de `DATABASE_URI` |
| `DATABASE_URI` | cms, cms-migrate | `postgresql://USUARIO:CONTRASEÑA@postgres:5432/BASE`; usuario/base = `POSTGRES_USER`/`POSTGRES_DB`; si la contraseña lleva caracteres reservados, percent-encoding (`@`→`%40`, `:`→`%3A`, `/`→`%2F`, `#`→`%23`, `?`→`%3F`, `%`→`%25`). Único nombre válido (ya no existe `DATABASE_URL`) |
| `POSTGRES_SSL` | cms, cms-migrate | `false` dentro de la red de Compose; `true` solo con una BD gestionada externa con TLS |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | s3 (**opcional**, perfil `s3`) y cms | Claves del almacén S3 (SeaweedFS): mín. 16 y 32 caracteres, solo `A-Z a-z 0-9 + / = _ . -`; el contenedor se niega a arrancar si faltan o son cortas. Generar con `openssl rand -hex 16` y `openssl rand -hex 32`. Solo con `MEDIA_STORAGE=s3` (MIN-01); con `local` pueden quedar vacías. Reemplazan a `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` |
| `S3_BUCKET`, `S3_PUBLIC_READ` | s3, cms | Nombre del bucket (por defecto `unc-media`) y `1` para permitir **GET anónimo** de objetos del bucket (necesario para servir `files.unc.edu.py`; el listado, la subida y el borrado anónimos siguen denegados). Por defecto `0` |
| `MEDIA_STORAGE` | cms, cms-migrate | MIG-IMG fase 1: `local` (por defecto; volumen persistente `cms_media` en `/app/media`) o `s3` (SeaweedFS, explícito). **Quien dependía de S3 solo por tener las claves debe fijar `MEDIA_STORAGE=s3`**; tener `S3_*` ya no activa S3 |
| `MEDIA_MAX_BYTES` | cms, cms-migrate | Tope por archivo subido en bytes (por defecto `10485760` = 10 MiB; techo 11 MiB por el límite del proxy de Next). Los mayores se rechazan con 413, no se truncan |
| `S3_BUCKET` | cms | `unc-media` (debe existir; ver `POST /api/setup/create-bucket`). Solo con `MEDIA_STORAGE=s3` |
| `S3_PUBLIC_URL` | cms | `https://files.unc.edu.py` |
| `PAYLOAD_SECRET` | cms, cms-migrate | Secreto aleatorio, mínimo 32 caracteres. DEP-16: el CMS **no arranca** si falta, es corto o conserva un valor de ejemplo (`REEMPLAZAR_`, `changeme`, `change-this`…) |
| `PREVIEW_SECRET` | **portal y cms** (mismo valor) | Secreto aleatorio, mínimo 32 caracteres. DEP-16: firma tokens de preview de 5 min (nunca viaja en la URL); débil o ausente → `/api/preview` responde 503 |
| `REVALIDATION_SECRET` | **portal y cms** (mismo valor) | Secreto aleatorio, mínimo 32 caracteres. DEP-16: débil o ausente → `/api/revalidate` responde 503 |
| `PORTAL_PUBLIC_URL` | portal como `NEXT_PUBLIC_SITE_URL`; cms como `PORTAL_URL` | `https://portal.unc.edu.py` |
| `CMS_PUBLIC_URL` | portal como `NEXT_PUBLIC_CMS_URL`; cms como `NEXT_PUBLIC_SERVER_URL` | `https://cms.unc.edu.py` |
| `MEDIA_HOSTNAME` | portal | `files.unc.edu.py` (imágenes y CSP) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | portal y cms | Datos del relay de la UNC; `SMTP_SECURE=true` solo con TLS implícito (465) |
| `SMTP_USER`, `SMTP_PASSWORD` | portal y cms | Credenciales del relay; ambas vacías si no exige autenticación |
| `SMTP_FROM_ADDRESS` | portal y cms | Remitente (p. ej. `noreply@unc.edu.py`) |
| `SMTP_FROM_NAME` | cms | Nombre visible del remitente del CMS |
| `CONTACT_TO` | portal | Casilla que recibe el formulario de contacto |
| `N8N_WEBHOOK_URL` | cms (opcional) | Vacío = notificaciones por webhook desactivadas |
| `NEXT_PUBLIC_SENTRY_DSN` | portal (runtime) | DSN del proyecto de Sentry. DEP-16: el túnel `/api/monitoring` reenvía SOLO a este host/proyecto; vacío → el túnel responde 503 |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | solo build (no llegan a ningún contenedor) | Los pasa `deploy.yml` como `build-args` desde secrets de GitHub; el token se crea en Sentry |

Constantes del compose que **no** se configuran en `.env.prod`: `CMS_URL=http://cms:3000` (portal → CMS por la red
interna), `S3_ENDPOINT=http://s3:8333`, `S3_REGION=us-east-1`. `IMAGE_TAG` lo fija el pipeline (`sha-xxxxxxx`).
Nombres que ya **no** existen: `SMTP_PASS`, `SMTP_FROM`, `DATABASE_URL`, `MINIO_ENDPOINT`.

Para generar valores aleatorios seguros (alfanuméricos, sin caracteres que exijan percent-encoding):

```bash
openssl rand -base64 48 | tr -d '=+/' | head -c 48
```

Límites (DEP-10, sin verificar con Docker ni SMTP reales): el envío de correo (recuperación de contraseña del CMS y
formulario de contacto) debe probarse con Mailpit o el relay real antes de producción; `PORTAL_URL` usa la URL pública,
por lo que el servidor debe poder resolver su propio dominio desde el contenedor del CMS; y las variables `NEXT_PUBLIC_*`
pueden quedar fijadas en el build de la imagen (ver `docs/specs/deploy/DEP-10-variables-de-entorno.md`).

---

## Parte 4 — GitHub Actions (CI/CD)

El deploy automático se activa cada vez que pasa el CI en `main`. Para que funcione
necesitás configurar los siguientes secrets y el environment en GitHub.

### Paso 9 — Crear SSH key para el deploy

```bash
ssh-keygen -t ed25519 -C "github-deploy@unc.edu.py" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy      # <- esto es SSH_PRIVATE_KEY
```

### Paso 10 — Configurar GitHub Secrets

En GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `SSH_HOST` | IP del VPS |
| `SSH_USER` | usuario SSH (`root` o el usuario creado) |
| `SSH_PRIVATE_KEY` | contenido de `~/.ssh/github_deploy` (clave privada) |
| `SSH_PORT` | `22` (o el configurado por el proveedor) |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Solo para `backup.yml` (BKP-01): frase de paso de **≥ 20 caracteres** con la que se cifra el volcado diario antes de subirlo como artefacto (el repositorio es público). Sin ella el backup falla cerrado. Guardarla en 2 lugares por 2 personas; ver `docs/BACKUP_RECOVERY.md` («Copia diaria cifrada») |
| `DATABASE_URL` | Solo para `backup.yml`: URI de Postgres **alcanzable desde el runner de GitHub**. Si la BD solo vive en la red interna de Docker del VPS el job no puede conectarse; ver «Riesgo residual» en `docs/BACKUP_RECOVERY.md` |
| `GHCR_READ_TOKEN` | PAT de GitHub con scope `read:packages` (ver abajo) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry (puede quedar vacío si no se usa) |
| `SENTRY_AUTH_TOKEN` | Token de Sentry (puede quedar vacío si no se usa) |
| `SENTRY_ORG` | `unc` |
| `SENTRY_PROJECT` | `portal-unc` |

**Crear el GHCR_READ_TOKEN:**
1. GitHub → tu perfil → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Nombre: `unc-portal-deploy-read`
3. Scope: `Read access to packages`
4. Copiar el token como `GHCR_READ_TOKEN`

### Paso 11 — Crear el environment de producción

En GitHub → repo → **Settings → Environments → New environment**:
- Nombre: `production`
- **Required reviewers (ajuste MANUAL, DEP-09):** el job `deploy` declara `environment: production`, pero que
  GitHub exija aprobación humana antes de desplegar depende de Settings → Environments → `production` →
  *Required reviewers*. No se puede automatizar desde este repositorio y **no está configurado hasta que
  alguien con permisos lo haga**; hasta entonces cada push a `main` con CI en verde despliega sin aprobación.

---

## Parte 5 — Primer arranque

### Paso 12 — Autenticar el servidor en ghcr.io

El servidor necesita poder bajar las imágenes Docker privadas:

```bash
echo "<GHCR_READ_TOKEN>" | docker login ghcr.io -u cavahot --password-stdin
```

### Paso 13 — Descargar imágenes y migrar el esquema (DEP-07)

El esquema de la base se crea SOLO con migraciones versionadas (`apps/cms/src/migrations`), nunca
restaurando el esquema de un dump. Orden del primer deploy: **migrate → restore-data → up**.

```bash
cd /opt/unc-portal
COMPOSE="docker compose -f infrastructure/docker/compose.prod.yaml --env-file infrastructure/docker/.env.prod"

# DEP-09: las imágenes se despliegan por sha inmutable; IMAGE_TAG es OBLIGATORIO (sin él Compose falla).
# Usa el tag publicado por el último build de main (`sha-` + 7 primeros caracteres del commit).
export IMAGE_TAG=sha-xxxxxxx

$COMPOSE pull

# Levanta Postgres (si hace falta) y aplica las migraciones; sale con código != 0 si falla.
$COMPOSE run --rm -T cms-migrate < /dev/null
```

Si `cms-migrate` falla: **no continúes**. Lee el error (`docker logs unc-cms-migrate-prod` o la salida
del comando); la migración corre en una transacción, así que no queda esquema a medias. Corrige la causa
y repite. Nunca ejecutes `migrate:down`, `migrate:reset`, `migrate:refresh` ni `migrate:fresh` en
producción. Si la base tiene una fila `batch = -1` en `payload_migrations` (esquema creado por push en
dev), el deploy se rechaza: requiere intervención manual.

### Paso 14 — Inicializar el almacén S3 / SeaweedFS (OPCIONAL: solo si usas `MEDIA_STORAGE=s3`)

**MIN-01 / S3-SEAWEEDFS-01:** el almacén S3 (SeaweedFS; sustituye a MinIO, cuyas imágenes ya no se descargan) no forma parte del despliegue por defecto. Con `MEDIA_STORAGE=local` (valor por defecto) los
archivos van al volumen `cms_media` y **debes omitir este paso**: `docker compose up` no arranca ni espera al servicio `s3`,
y el CMS no depende de él. `files.unc.edu.py` responderá 502 mientras no exista el contenedor (esperado).

Para activar el almacenamiento S3 (imagen `chrislusf/seaweedfs` fijada por digest; ver `docs/specs/storage/S3-SEAWEEDFS-01.md`):

```bash
# 1. En .env.prod: MEDIA_STORAGE=s3, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_PUBLIC_READ=1, S3_PUBLIC_URL
# 2. Levantar el perfil s3 (el perfil se activa con --profile; no basta con editar .env.prod):
$COMPOSE --profile s3 up -d s3   # el almacén aún no corre: el paso 13 solo levantó Postgres
# Crear el bucket por la API S3 (idempotente) ANTES de recrear el CMS. En prod el puerto 8333 no se publica:
# ejecutar el script desde un host/contenedor con el repo y node_modules que alcance S3_ENDPOINT (p. ej. un
# contenedor temporal unido a la red `internal`). Límite: este paso no se ha ejercitado en producción real
# (sí en un proyecto Compose aislado local, S3-SEAWEEDFS-01). Con --check solo verifica.
S3_ENDPOINT=http://s3:8333 node scripts/s3/setup-bucket.mjs
# 3. Recrear el CMS para que lea MEDIA_STORAGE=s3:
$COMPOSE up -d --no-deps cms
```

El `up -d` de `deploy.yml` **no** nombra `s3` (nombrar un servicio con perfil activaría ese perfil); un despliegue con S3 debe
arrancar/actualizar el servicio `s3` a mano con el comando de arriba. Los datos del volumen anterior de MinIO
(`unc_minio_data_prod`) **no se migran**: MinIO nunca se usó en producción; si hubiera datos, copiarlos con
`aws s3 sync` o `rclone` hacia el nuevo endpoint.

El script crea el bucket `unc-media`; la lectura pública de objetos la da `S3_PUBLIC_READ=1` (identidad anónima
con solo `Read:<bucket>`), necesaria para que los navegadores carguen las imágenes desde `files.unc.edu.py`.

### Paso 15 — Cargar los datos iniciales (solo primera vez)

El repo incluye un seed con los datos (noticias, tesis, convenios, etc.). Se cargan **solo los datos**,
sobre el esquema ya migrado y con las tablas vacías:

```bash
bash scripts/setup/restore-data-prod.sh
```

El script aborta si el esquema no está migrado, si alguna tabla de destino tiene datos o si el dump no
encaja con el esquema (la carga es una sola transacción: no deja datos parciales). Excluye
`payload_migrations`, sesiones, bloqueos, preferencias y `payload_kv` (`setup/restore-data.exclude.txt`).
Genera antes un backup verificado en `backups/pre-restore-data-<UTC>.dump`; no sustituye un backup
cifrado fuera del servidor (DEP-08). El dump versionado `setup/seed.dump.gz` requiere revisión de PII.

> **Deprecado:** `scripts/setup/restore-db-prod.sh` (restore completo con `DROP SCHEMA`) ya no es el camino
> del primer deploy porque trae el esquema de dev. Solo sirve como recuperación manual de un estado completo.
> **Hipótesis sin verificar:** que el seed (2026-08-08) sea compatible con el baseline (2026-10-17); la
> primera prueba debe hacerse en una base sintética autorizada (ver `docs/specs/deploy/DEP-07-via-unica-de-esquema.md`).

### Paso 16 — Levantar el stack

```bash
$COMPOSE up -d
docker ps
```

Deberías ver 4 contenedores con estado `healthy` (`unc-postgres-prod`, `unc-cms-prod`, `unc-portal-prod`,
`unc-nginx-prod`; `unc-s3-prod` solo si activaste el perfil `s3`, MIN-01); `unc-cms-migrate-prod` queda en estado `Exited (0)` (es un servicio de
un solo uso y `cms` no arranca sin que termine bien).

### Paso 16b — Sembrar el tag sano (DEP-09)

Una vez que el stack está `healthy`, registra el tag desplegado como «último sano». Los deploys de CI lo
leen como destino de rollback y **abortan si no existe** (primer deploy: no hay rollback posible).

```bash
echo "$IMAGE_TAG" > /opt/unc-portal/.deploy-previous-tag
```

---

## Parte 6 — Verificación

```bash
# Portal público
curl -s -o /dev/null -w "%{http_code}" https://portal.unc.edu.py/api/health
# Debe responder: 200

# CMS admin (liveness: no prueba la BD)
curl -s -o /dev/null -w "%{http_code}" https://cms.unc.edu.py/api/health
# Debe responder: 200

# CMS readiness (DEP-09): SELECT 1 a Postgres; 200 {"status":"ready"} o 503 {"status":"unavailable"}
curl -s https://cms.unc.edu.py/api/health/ready
# Está limitada a 30 peticiones/min por IP (429 si se excede) y cachea el resultado 5 s.

# Media con MEDIA_STORAGE=local (por defecto): una imagen subida se sirve por el CMS
#   curl -sI https://cms.unc.edu.py/api/media/file/<archivo>   -> 200
# Media con el perfil s3 (MIN-01; verifica el almacén S3 y nginx). Sin el perfil, files.* responde 502 a propósito
curl -sI https://files.unc.edu.py
# Debe responder: HTTP/2 200 o 403 (403 es correcto si el bucket está vacío)
```

---

## Deploys posteriores (CI/CD automático)

Una vez configurado todo, los deploys son automáticos:

1. Hacer push a `main` → el CI corre los tests
2. Si el CI pasa → el workflow de deploy construye las imágenes Docker (CMS, migrator y portal) y las publica en ghcr.io
3. El servidor (DEP-09) recibe `IMAGE_TAG=sha-<7 hex>` (el commit que pasó CI; `latest` solo es un alias de
   publicación y nunca se despliega), lo valida y exige `/opt/unc-portal/.deploy-previous-tag`
4. Baja las nuevas imágenes, hace un `pg_dump` verificado (`backups/pre-deploy-<UTC>.dump`, se omite si la base está vacía), ejecuta `cms-migrate` y solo si termina bien reinicia los contenedores
5. **Gate de readiness (DEP-09):** por la red interna (`docker exec … wget`, no la URL pública) consulta
   `unc-cms-prod` en `/api/health/ready` (`SELECT 1` a Postgres) y `unc-portal-prod` en `/api/health`, con
   reintentos (`DEP09_READY_RETRIES`, 12 por defecto, cada `DEP09_READY_INTERVAL`, 5 s ⇒ ≈ 60 s)
6. Si el gate pasa, escribe el tag nuevo en `.deploy-previous-tag`; después corre un health check externo
   (DNS, TLS, nginx) que avisa pero no revierte

Si el backup o la migración fallan, el deploy termina en rojo y la versión nueva NO se levanta (la anterior sigue sirviendo).

### Rollback (DEP-09)

Si `up -d` falla o el gate no responde, el propio deploy ejecuta
`IMAGE_TAG=<tag previo> docker compose up -d --no-deps cms portal`, vuelve a pasar el gate, informa el resultado y
**termina en rojo** (exit != 0) con `.deploy-previous-tag` sin tocar. No ejecuta `down` ni relanza `cms-migrate`.

- **El rollback es solo de imagen.** Las migraciones ya aplicadas NO se revierten. Volver al sha anterior solo es
  seguro si las migraciones del lote son retrocompatibles (patrón expandir/contraer).
- Si no lo son, la restauración de datos es **manual**, con aprobación humana, desde el `pg_dump` previo
  (`backups/pre-deploy-<UTC>.dump`; ver DEP-01/DEP-08) y se pierden las escrituras posteriores a ese dump.
- Rollback manual a un sha concreto: `IMAGE_TAG=sha-xxxxxxx $COMPOSE up -d --no-deps cms portal` y, si quedó sano,
  `echo sha-xxxxxxx > /opt/unc-portal/.deploy-previous-tag`.
- Si el mensaje dice que el rollback «NO se recuperó», hay que intervenir a mano (`docker logs unc-cms-prod`).
- Las imágenes previas deben seguir en el host: `docker image prune -f` solo borra imágenes colgantes, pero no limpies
  con `prune -a` el sha anterior. Los tags antiguos se acumulan: bórralos a mano conservando al menos el último sano.
- Primer deploy automático: sin `.deploy-previous-tag` el script aborta antes de tocar nada (ver Paso 16b).

### Concurrencia, cortes y secretos del deploy (DEP-19a)

- **Disparador:** el deploy solo corre si el CI que lo dispara fue un `push` verde a `main` **de este repositorio**
  (no un PR de fork cuya rama se llame `main`).
- **Un solo deploy a la vez:** `concurrency: deploy-prod` en GitHub (sin cancelar el que está en curso) y un
  `flock -n` sobre `/opt/unc-portal/.deploy.lock` en el servidor. Si hay otro deploy en curso, el nuevo termina en
  rojo con «Hay otro deploy en curso» sin tocar nada. **Requisito del servidor:** el binario `flock` (paquete
  `util-linux`, presente en Debian/Ubuntu); sin él el deploy falla cerrado.
- **Salida anormal:** el script escribe `/opt/unc-portal/.deploy-last-failure` (`<UTC> tag=<tag> rc=<n>`) y **no**
  modifica `.deploy-previous-tag`. Un deploy sano lo borra. `command_timeout` del SSH es de 35 min (cota de peor
  caso ≈ 29 min: migrate 630 s + dos gates + pull/backup/up; si cambias `DEP07_MIGRATE_TIMEOUT` o
  `DEP09_READY_*`, recalcula).
- **Migrador residual:** antes del `run` se elimina cualquier contenedor `unc-cms-migrate-prod` heredado
  (`Exited` tras un `up` manual) y el `up -d` del deploy usa `--no-deps` con la lista de servicios **sin**
  `cms-migrate`. Si añades un servicio al compose, añádelo a esa lista en `deploy.yml`. Un `up -d` manual sin
  `--no-deps` sigue funcionando (relanza el migrador, idempotente).
- **Secretos:** `GHCR_READ_TOKEN` y el actor llegan al servidor como variables de entorno (`envs` del ssh-action) y el
  login usa `--password-stdin`; no se interpolan en el texto del script.
- Pendiente de validar con servidor real: dos deploys consecutivos, `flock` del host, propagación de `envs` y
  `command_timeout`. Detalle en `docs/specs/deploy/DEP-19a-correcciones-deploy.md`.

> **No verificado con Docker/servidor reales** (solo con un shim de `docker` en `tests/deploy/dep09-deploy-rollback.test.mjs`):
> el `wget` de las imágenes, el comportamiento de `up --no-deps` con `depends_on` y la propagación de `envs` de la acción SSH.
> Detalle y riesgos en `docs/specs/deploy/DEP-09-health-y-rollback.md`.

No es necesario acceder al servidor para deploys de rutina.

---

## Troubleshooting

### Nginx no arranca

```bash
docker logs unc-nginx-prod
```

Causa más común: certificados SSL faltantes o con nombres incorrectos.
Verificar que existan los 6 archivos en `infrastructure/nginx/certs/`.

### CMS no conecta a la base de datos

```bash
docker logs unc-cms-prod
```

Verificar que `DATABASE_URI` en `.env.prod` tenga las credenciales correctas y
que el contenedor `unc-postgres-prod` esté en estado `healthy`.

### Las imágenes no cargan

Solo con `MEDIA_STORAGE=s3` (perfil `s3`, MIN-01): verificar que `S3_PUBLIC_URL=https://files.unc.edu.py` esté en `.env.prod` y que
el bucket `unc-media` exista y `S3_PUBLIC_READ=1` esté fijado (lectura anónima solo de objetos):

```bash
S3_ENDPOINT=http://s3:8333 node scripts/s3/setup-bucket.mjs --check
```

### Ver logs en tiempo real

```bash
docker compose \
  -f infrastructure/docker/compose.prod.yaml \
  --env-file infrastructure/docker/.env.prod \
  logs -f --tail=100
```

---

## Preguntas

Equipo de desarrollo: **cesarvargas@unc.edu.py**
