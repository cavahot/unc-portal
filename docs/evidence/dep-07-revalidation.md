# DEP-07 — Re-validación de D1 y D4 con Docker local

**Fecha:** 2026-10-21. **Alcance autorizado:** Postgres SINTÉTICO y AISLADO, solo para esta re-validación (AGENTS.md). No se modificó código del repo, no hubo commit, no se usó `setup/seed.dump.gz` ni ningún `.env`. Evidencia previa: `docs/evidence/dep-07-validation.md` (no se reescribe).

## Entorno

| Elemento | Valor |
|---|---|
| Docker | 28.0.4, Docker Desktop (Windows 11, Git Bash) |
| Postgres | `postgres:16-alpine` (ya local), `tmpfs` como datadir, sin puerto publicado, credenciales aleatorias en el scratchpad (borradas) |
| Recursos | contenedor `unc-dep07-synth-pg`, red `unc-dep07-synth-net`, imagen `unc-dep07-synth/migrator:d1`, proyecto compose `unc-dep07-synth-c` |
| Imagen base del build | `node:22.17.0-alpine` (solo capas en caché; no aparece en `docker images`) |
| Antes (imágenes) | postgres:16-alpine, axllent/mailpit, quay.io/minio/minio, docker/welcome-to-docker |

## Comandos y resultados

### D1 — build real

`docker build --progress=plain -f apps/cms/Dockerfile --target migrator -t unc-dep07-synth/migrator:d1 .` (contexto raíz, `-f` y `--target` como en `deploy.yml`).

- Paso `[deps 5/5] RUN npm install -g npm@11 && npm ci`: **OK**, `added 1010 packages` (≈236 s de npm). Sin `EUSAGE` ni `Missing: @swc/helpers`.
- Build completo: exit 0 en **256 s**; imagen **991 MB** (igual que la variante anterior).
- La imagen final trae npm 10.9.2 (el `npm@11` solo vive en la etapa `deps`); es esperado, `migrator` no instala nada.

### Migración real con la imagen construida (contra BD sintética)

`docker run --network unc-dep07-synth-net … unc-dep07-synth/migrator:d1` (CMD `payload migrate`):

- 1.ª ejecución: `Migrating: 20261017_021341_arch_db_02_baseline` → `Migrated (812ms)` → `Done.`, exit 0. **64 tablas**; `payload_migrations` = 1 fila (`…baseline`, `batch=1`).
- 2.ª ejecución: solo `Done.`, exit 0, sigue 1 fila (**idempotente**).
- Error no fatal `Error verifying Nodemailer transport` (SMTP inalcanzable) = D5 ya conocido.

### Fragmento SSH completo de `deploy.yml` (camino feliz)

Se extrajeron las líneas 152-252 de `deploy.yml` tal cual y se ejecutaron con `set -euo pipefail`, con solo estas sustituciones de texto: rutas de compose/env-file → archivos sintéticos, `PG=unc-postgres-prod` → `unc-dep07-synth-pg`, nombre del contenedor del migrador, nombre del volumen, y `compose up -d` + `docker image prune -f` sustituidos por un `echo` (para no tocar imágenes ajenas).

- Sin `batch=-1`: backup `pg_dump -Fc` verificado → `compose run --rm -T cms-migrate < /dev/null` (`Done.`) → comprobación anti falso verde → **llega a `REACHED_UP_D`**, exit 0.

### D4 — `batch = -1`

Fila sintética `('dev', -1)` en `payload_migrations`.

| Caso | Resultado |
|---|---|
| Script completo (con precheck) | backup verificado → `::error::payload_migrations contiene filas batch = -1 …` → **exit 1**, no llega a migrate ni a `up -d` |
| Solo el envoltorio `timeout --kill-after=30 20 docker compose … run --rm -T cms-migrate < /dev/null` (precheck omitido a propósito, líneas 219-235) | El CLI imprime el prompt «It looks like you've run Payload in dev mode … (y/N)» y **cuelga**. `timeout` actúa a los **20 s** (21 s medidos) → `MIGRATE_RC=124` → `::error::cms-migrate excedió el timeout de 20s …` → **exit 1** sin `up -d` |
| ¿137? | No se produjo: el cliente `docker compose` murió con SIGTERM; la rama 137 no se ejercitó |
| Contenedor huérfano tras el timeout | **SÍ queda vivo**: `unc-dep07-synth-c-cms-migrate-run-<hash>` (Up) |
| ¿`docker rm -f <container_name>` lo limpia? | **NO.** `docker compose run` ignora `container_name`; el huérfano se llama `<proyecto>-cms-migrate-run-<hash>`. `docker rm -f` de un nombre inexistente devuelve exit 0, así que la rama «Aviso: no se pudo eliminar…» tampoco se activa: falla en silencio |
| Hipótesis de arreglo (solo scratchpad) | `run --rm -T --name <nombre fijo> cms-migrate`: tras el timeout queda un contenedor con ese nombre y `docker rm -f` **sí lo elimina**. Alternativa: `docker ps -aq --filter label=com.docker.compose.service=cms-migrate \| xargs -r docker rm -f` (verificada) |

### Resultado por ítem

| Ítem | Resultado |
|---|---|
| D1: `npm ci` pasa con npm@11 y el build `--target migrator` termina (256 s, 991 MB) | **CONFIRMADO (arreglo válido)** |
| Migración real: 64 tablas, 1 fila batch=1, 2.ª ejecución idempotente | **CONFIRMADO** |
| D4: el prompt cuelga sin el timeout | **CONFIRMADO** |
| D4: `timeout` devuelve 124 y el script aborta con exit 1 antes de `up -d` | **CONFIRMADO** |
| D4: el `docker rm -f unc-cms-migrate-prod` limpia el huérfano | **REFUTADO** (D7) |
| Rama 137 | **NO CONCLUYENTE** |
| Camino feliz end-to-end del fragmento SSH | **CONFIRMADO** (hasta `up -d`, neutralizado) |

## Defectos nuevos

| ID | Severidad | Defecto | Arreglo sugerido (no aplicado) |
|---|---|---|---|
| D7 | **MEDIA** | `docker compose run` no usa `container_name`; tras un timeout el migrador colgado sigue vivo (con conexión abierta a la BD) y `docker rm -f unc-cms-migrate-prod` no lo toca ni avisa (exit 0 con `-f`). Los comentarios de `deploy.yml` (líneas 217-218) asumen lo contrario. | Añadir `--name unc-cms-migrate-prod` al `run` (verificado) o limpiar por label de compose; actualizar el comentario y el test `dep07-deploy-script.test.mjs` para que verifique el nombre real del contenedor. |

## Lo que no se reprodujo fielmente

- No se usó `compose.prod.yaml` real ni `.env.prod`: compose sintético con el mismo servicio (`image`, `restart: "no"`, `environment`, red externa), sin `depends_on: postgres` ni el proyecto `unc-prod`. El huérfano real se llamaría `unc-prod-cms-migrate-run-<hash>`.
- `up -d`, `image prune`, `docker login`/`pull` no se ejecutaron.
- Docker Desktop en Windows, no un host Linux con ssh-action; `set -euo pipefail` sí se respetó.

## Limpieza (verificada)

`docker rm -fv` de los contenedores con prefijo, `docker network rm unc-dep07-synth-net`, `docker rmi unc-dep07-synth/migrator:d1`; borrados del scratchpad compose, env, scripts extraídos, backups sintéticos y contraseña.

```
docker ps -a      : unc-mailpit-local, unc-minio-local, unc-postgres-local, welcome-to-docker
docker network ls : bridge, host, none, unc-local_default
docker volume ls  : unc_mailpit_data, unc_minio_data, unc_postgres_data
docker images     : postgres:16-alpine, axllent/mailpit, quay.io/minio/minio, docker/welcome-to-docker
recursos con prefijo unc-dep07-synth: 0
```

Residual: la caché de BuildKit (capas de `node:22.17.0-alpine`, `apk`, `npm ci`) no se purgó porque `docker builder prune` afectaría la caché de otros builds. `test_write.txt` ya existía sin seguimiento en el repo; esta tarea no lo creó ni lo tocó.

## Rollback

Borrar este archivo y revertir la tabla «Estado de defectos» de `docs/specs/deploy/DEP-07-via-unica-de-esquema.md`. No hubo más cambios.
