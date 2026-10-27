# DEP-07 (vía C) — Validación empírica en Postgres sintético

**Fecha:** 2026-10-20. **Alcance autorizado por el dueño:** Postgres SINTÉTICO y AISLADO en Docker local, solo para esta validación (AGENTS.md: sin producción, sin datos reales, sin servicios existentes). **Spec:** `docs/specs/deploy/DEP-07-via-unica-de-esquema.md`. **RDD:** RDD-DEP-16 … RDD-DEP-22. No se modificó código de producción del repo ni se hizo commit.

## Entorno

| Elemento | Valor |
|---|---|
| Docker | 28.0.4 (linux), Docker Desktop en Windows 11 |
| Postgres | `postgres:16-alpine` (ya local, sin pull), servidor 16.14; credenciales aleatorias generadas al vuelo; `tmpfs` como datadir (sin volumen); puerto solo `127.0.0.1:55432` |
| Recursos | contenedor `unc-dep07-synth-pg`, red `unc-dep07-synth-net`, imagen `unc-dep07-synth/migrator:*`; todo con prefijo |
| Pre-existentes (no tocados) | `unc-postgres-local`, `unc-minio-local`, `unc-mailpit-local`, `welcome-to-docker`, red `unc-local_default`, volúmenes `unc_*` |
| Seed real | `setup/seed.dump.gz` → descomprimido en el scratchpad solo para `pg_restore --list` y `--schema-only` hacia una BD sintética; **sus datos no se restauraron ni se imprimieron**; borrado al terminar |
| Datos | exclusivamente sintéticos (`*@example.invalid`, nombres inventados) |

Método de las pruebas dinámicas: cada escenario usa una BD nueva en el mismo Postgres sintético; `payload migrate` corre en contenedores `docker run --network unc-dep07-synth-net` con `DATABASE_URI` y `PAYLOAD_SECRET` sintéticos (no se leyó ningún `.env`). Migraciones alternativas (fallo, pendiente) se inyectaron montando una COPIA del directorio en `/app/apps/cms/src/migrations` (solo lectura); el repo no se tocó. El script real `scripts/setup/restore-data-prod.sh` se ejecutó SIN modificar, desde un directorio temporal, con un shim de `docker` que sustituye `unc-postgres-prod` por el contenedor sintético (y convierte la ruta de `docker cp` por Git Bash en Windows; en el servidor Linux no hace falta). El fragmento de `deploy.yml` (de `ENV_FILE=` hasta antes de `# DEP-07 (C3)`) se extrajo con `sed` del archivo real y se ejecutó con `PG` y el env-file sustituidos.

## Resultado por ítem

| # | Ítem | Resultado |
|---|---|---|
| 1 | `docker build --target migrator` construye y `migrate` crea 64 tablas + 1 fila `batch=1` | **REFUTADO tal cual está; CONFIRMADO con una variante** (ver D1) |
| 2 | Idempotencia y exit code con `compose run --rm -T` | **CONFIRMADO** |
| 3 | Migración que falla: exit != 0 sin esquema parcial | **CONFIRMADO** |
| 4 | `batch=-1` sin TTY y precheck del deploy | **PARCIALMENTE REFUTADO** (cuelga, no sale con 0); precheck **CONFIRMADO** |
| 5 | `awk` de `restore-data-prod.sh` sobre `pg_restore --list` real PG16 | **CONFIRMADO** |
| 6 | Compatibilidad de esquema seed (2026-08-08) vs baseline | **REFUTADA** (hay deriva; la carga fallará en voz alta) |
| 7 | Orden de datos/FK sin `--disable-triggers` y bloque `DO $$` | **REFUTADO** para el seed `-Fc` completo (FK fuera de orden); flujo OK con dump data-only; bloque `DO $$` **CONFIRMADO** |
| 8 | `down` del baseline (vacía = 0 tablas; con filas = error sin borrar) | **CONFIRMADO** (`.rows` funciona con el driver real) |
| 9 | Backup `pg_dump -Fc` + `pg_restore --list` + permisos 700/600 en Linux | **CONFIRMADO** |
| 10 | Defectos nuevos | 4 relevantes + 2 menores (D1–D6) |

### Ítem 1 — build y `payload migrate`

- **Comando exacto del `deploy.yml`:** `docker build --target migrator -f apps/cms/Dockerfile .` (contexto raíz). Resultado: **falla en la etapa `deps`** (`RUN npm ci`, node 22.17.0 / npm 10.9.2) tras ~25 s:
  `npm error code EUSAGE … package.json and package-lock.json … are not in sync … Missing: @swc/helpers@0.5.23 from lock file`. El lockfile fija `@swc/helpers 0.5.15` (`package-lock.json:5960`); `@swc/core` declara el peer opcional `@swc/helpers >=0.5.17` (`:12633`). npm 10 lo trata como faltante; el lock parece generado con npm 12.0.0 / node 24 (los del host). El `Dockerfile` raíz del portal usa `node:24-alpine`, por eso no le pasa.
- **Variante verificada (solo scratchpad):** copia del Dockerfile con `RUN npm i -g npm@11 && npm ci`. Construye en ~5 min (imagen 991 MB). Con ella: `payload migrate` dentro del contenedor lee `/app/apps/cms/src/migrations`, aplica `20261017_021341_arch_db_02_baseline (≈1 s)`, sale con 0. Resultado en la BD: **64 tablas**, `payload_migrations` = 1 fila (`…baseline`, `batch=1`). `payload.config.ts` carga con tsx y `PAYLOAD_CONFIG_PATH` correcto (hipótesis H6 confirmada en lo que respecta a rutas y `migrationDir`).
- Sin `SMTP_HOST` alcanzable aparece un error no fatal `Error verifying Nodemailer transport` (ECONNREFUSED) al inicializar; no altera el exit code (D5).

### Ítem 2 — idempotencia y exit code

- 2.ª y 3.ª ejecución: exit 0, log `Done.` sin `Migrating:`, `payload_migrations` sigue en 1 fila.
- Hash de `pg_dump --schema-only` normalizado (1798 líneas): BD con 3 `migrate` = BD fresca con 1 `migrate` = `53c81ed3bdb4f6cd` (y reproduce H13: dos BD migradas, mismo esquema).
- Compose temporal (`name: unc-dep07-synth-c`, red externa sintética): `docker compose run --rm -T <svc> < /dev/null` propaga el código: servicio OK → 0; servicio con `process.exit(7)` → **7**; `if ! … run --rm -T …; then` entra a la rama de error (como en `deploy.yml`).
- No se probó `up -d` relanzando `cms-migrate` (depende del compose real, que no se usó); la idempotencia que lo respalda sí está probada.

### Ítem 3 — migración que lanza error

Migración temporal (COPIA) que ejecuta `CREATE TABLE synth_partial_probe` y luego `throw`: `migrate` imprime `Error running migration … synthetic failure after partial DDL`, **exit 1**; `synth_partial_probe` no existe (transacción revertida), `payload_migrations` conserva solo el baseline, 64 tablas.

### Ítem 4 — `batch = -1`

- BD migrada + fila `('dev', -1)` + una migración pendiente (COPIA): el CLI imprime «It looks like you've run Payload in dev mode … data loss will occur … (y/N)» y **no termina**: con stdin en `/dev/null` (con y sin `-i`) el proceso quedó **colgado** (4 min; con `timeout 90` → 124). La migración pendiente no se aplicó. La hipótesis «sale con exit(0) sin migrar» (RDD-DEP-17/22) queda **refutada en esa forma**: el efecto es bloqueo, no falso verde (D4).
- Precheck real de `deploy.yml` contra la BD con `batch=-1`: tras el backup imprime `::error::payload_migrations contiene filas batch = -1 …`, **exit 1**. Contra una BD limpia: exit 0. Contra BD sin tablas: «Base sin tablas: no se requiere backup (primer deploy)», exit 0. Contra BD inexistente: aborta con error de psql (exit 2).

### Ítem 5 — `awk` y TOC real

`pg_restore --list` del seed real con PG16 (cabecera: creado 2026-08-09, 698 entradas, `Dump Version 1.15-0`, dumped by 16.14). Formato real: `4416; 0 16743 TABLE DATA public _noticias_v unc_cms` y `4557; 0 0 SEQUENCE SET public _noticias_v_id_seq unc_cms`. Con la lista de exclusión real:

- TOC: 64 `TABLE DATA public` y 44 `SEQUENCE SET public` → lista filtrada **95 líneas = 57 tablas + 38 secuencias**; 0 entradas `TABLE DATA` fuera de `public`.
- Excluidas (TABLE DATA, 7): `payload_kv`, `payload_locked_documents`, `payload_locked_documents_rels`, `payload_migrations`, `payload_preferences`, `payload_preferences_rels`, `users_sessions`.
- Excluidas (SEQUENCE SET, 6): `payload_kv_id_seq`, `payload_locked_documents_id_seq`, `payload_locked_documents_rels_id_seq`, `payload_migrations_id_seq`, `payload_preferences_id_seq`, `payload_preferences_rels_id_seq` (`users_sessions` no tiene secuencia).
- El contenido de `payload_migrations` del seed (¿fila `dev`?) **no se verificó** (exige leer filas): H5 queda NO CONCLUYENTE; es irrelevante para la vía C porque esa tabla se excluye.

### Ítem 6 — esquema del seed vs baseline (solo metadatos)

Seed restaurado con `--schema-only` en una BD sintética y comparado con la BD migrada:

| Métrica | Seed | Baseline |
|---|---|---|
| Tablas / columnas / secuencias | 64 / 526 / 44 | 64 / 526 / 44 |
| Tipos enum / etiquetas | 34 / 170 | 33 / 164 |
| FK / índices | 74 / 282 | 78 / 286 |

Mismas 64 tablas. Diferencias concretas (4 columnas y 1 enum; defaults y demás columnas idénticos):

| Seed | Baseline |
|---|---|
| `noticias.faculty` varchar NULL | `noticias.faculty_id` int4 NULL (FK a `facultades`) |
| `_noticias_v.version_faculty` varchar NULL | `_noticias_v.version_faculty_id` int4 NULL (FK) |
| `autoridades.faculty` varchar NULL | `autoridades.faculty_id` int4 NULL (FK) |
| `tesis.facultad` enum `enum_tesis_facultad` **NOT NULL** (6 valores: odontologia, medicina, ciencias-agrarias, ciencias-exactas, humanidades, ciencias-economicas) | `tesis.facultad_id` int4 **NOT NULL** (FK); el enum no existe |

Conclusión: `pg_restore --data-only` del seed (2026-08-08) sobre el esquema migrado **fallará**, y lo hace en voz alta. Reproducido con una fila sintética en el esquema del seed: `COPY public.noticias (…, faculty, …) FROM stdin` → `ERROR: column "faculty" of relation "noticias" does not exist`, exit 1 (con `--single-transaction`, sin datos parciales). Además de nombres, `tesis` exige una transformación (enum → id de `facultades`) que ninguna carga directa hace.

### Ítem 7 — orden, FK y secuencias con datos sintéticos

Datos sintéticos en una BD migrada (users, users_sessions, media, facultades, carreras, noticias con FK a media/facultades, noticias_tags, tesis, autoridades, paginas, más filas en tablas excluidas) y carga en otra BD migrada vacía con el script real:

- **Dump completo `-Fc` (formato de `create-seed.sh`):** el script pasa todos sus controles previos y falla en la carga: `COPY failed for table "autoridades": … violates foreign key constraint "autoridades_faculty_id_facultades_id_fk" … Key (faculty_id)=(5) is not present in table "facultades"`; exit 1, BD destino queda vacía. Causa: `pg_restore --data-only -L` sigue el orden del TOC, que en un dump completo es alfabético, no por FK. En el TOC del seed real, **15 de las 56 FK entre tablas cargadas** quedan en orden hijo-antes-que-padre (p. ej. `autoridades`→`facultades`, `carreras`→`facultades`, `_noticias_v`→`noticias`/`media`, `navegacion_links`→`paginas`). Control directo con `pg_restore` sin el script: mismo error.
- **Dump `pg_dump -Fc --data-only` (pg_dump ordena por FK):** el script completo termina con exit 0. Conteos origen vs destino: users 2/2, media 2/2, facultades 1/1, carreras 1/1, noticias 2/2, noticias_tags 1/1, tesis 1/1, autoridades 1/1, paginas 1/1; tablas excluidas quedan en 0 (users_sessions, locked_documents, kv); `payload_migrations` = solo el baseline `batch=1`.
- **Secuencias:** el origen tenía `noticias_id_seq` atrasada a propósito (1, `is_called=false`) con `max(id)=101`. Tras la carga: `noticias_id_seq = 101/true`; users/media/facultades coinciden con el origen. El bloque `DO $$` es válido, corrige y verifica.
- **Alternativa probada con el dump completo:** `--disable-triggers` en `pg_restore` funciona (exit 0, 2 noticias, 1 autoridad); el usuario de la imagen `postgres` (`POSTGRES_USER`) es superusuario (`rolsuper = t`). Costo: no se valida la integridad referencial al cargar.

### Ítem 8 — `down`

`payload migrate:down` (CLI real, driver real) sobre BD vacía: «Migrated down … baseline», **0 tablas y 0 enums** restantes, exit 0. Con filas sintéticas en `facultades` y `noticias`: `Error migrating down … DEP-07: down rechazado, hay filas en: noticias, facultades …`, **exit 1**, 64 tablas, 1 fila en `noticias` y `payload_migrations` intactas. Confirma que `db.execute` devuelve `.rows` (H10).

### Ítem 9 — backup

Fragmento real de `deploy.yml` ejecutado contra BD migrada: `pg_dump -Fc` ≈ 249 KB, `pg_restore --list` OK, mensaje «Backup verificado: backups/pre-deploy-…dump». Permisos dentro del contenedor Linux con los mismos comandos (`umask 077; mkdir; chmod 700; : > f; chmod 600 f; pg_dump > f`): `700 /tmp/bk`, `600 /tmp/bk/x.dump`. En NTFS (host) `ls` mostró 644, como se esperaba: no es fiable allí.

## Defectos encontrados

| ID | Severidad | Defecto | Evidencia | Arreglo sugerido (no aplicado) |
|---|---|---|---|---|
| D1 | **ALTA (bloquea el deploy)** | `npm ci` falla en la etapa `deps` de `apps/cms/Dockerfile` (node 22.17.0 / npm 10.9.2): lock desincronizado para npm 10 (`@swc/helpers`). Afecta a TODOS los targets de ese Dockerfile: `cms`, `cms-migrator` (job `build-images`) y el build local de compose. | Ítem 1 | Alinear la versión de npm: `node:24-alpine` como el Dockerfile del portal, o `npm i -g npm@11` antes de `npm ci` (verificado), o regenerar el lock con npm 10, o fijar `@swc/helpers >=0.5.17` con `overrides`. Re-validar el build exacto. |
| D2 | **CRÍTICA para la vía C** | `restore-data-prod.sh` no puede cargar un seed `pg_dump -Fc` completo: el orden del TOC viola FK (15/56). El script revierte y no deja datos, pero el primer deploy no se completa. | Ítem 7 | Regenerar el seed con `pg_dump -Fc --data-only` desde una BD migrada (verificado: carga completa); o añadir `--disable-triggers` (verificado, pierde validación de FK); o reordenar la lista `-L` por el grafo de FK. Cambiar `create-seed.sh` y documentar el formato esperado. |
| D3 | **ALTA** | El seed del 2026-08-08 es incompatible con el baseline: `faculty`/`version_faculty`/`facultad` (4 columnas) y el enum `enum_tesis_facultad`. La carga de `noticias` (271 filas) aborta. | Ítem 6 | Regenerar el seed desde una BD migrada (el dueño debe decidir cómo mapear facultad → `facultades.id`), o una migración/transformación explícita revisada por humano. No parchear el script. |
| D4 | MEDIA | Con `batch=-1` y stdin cerrado, `migrate` queda colgado (no `exit(0)`). El precheck lo evita, pero si falla o se omite, `run --rm -T cms-migrate < /dev/null` bloquea el job hasta el timeout de la acción SSH. | Ítem 4 | Envolver con `timeout` (p. ej. `timeout 600 docker compose … run …`) y tratar 124 como fallo; corregir el texto de RDD-DEP-17/22 y del comentario del Dockerfile («salga con 0»). |
| D5 | BAJA | Al inicializar Payload, el adaptador de correo intenta verificar SMTP y vuelca un stack `ECONNREFUSED` si no es alcanzable; no afecta el exit code. El migrator pesa 991 MB. | Ítem 1 | Opcional: silenciar o no cargar el email en el servicio de migración (DEP-13/14 trata tamaño). |
| D6 | BAJA | Con una BD cuyo nombre no existe, el fragmento de backup aborta con el error crudo de psql (exit 2). Aborta correctamente; solo el mensaje es poco amistoso. | Ítem 4 | Opcional. |

Notas de límite: (a) el Dockerfile exacto nunca llegó a ejecutar `migrate`; los ítems 1–4 y 8 se validaron con la variante D1 (única diferencia: `npm i -g npm@11`). (b) No se usó `compose.prod.yaml` real ni el servicio `cms-migrate` real (variables, `depends_on`, `up -d`); se simuló con un compose temporal sintético. (c) No se probó el flag `--force-accept-warning` en runtime (RDD-DEP-22 sigue por lectura de código). (d) El shim de Windows para `docker cp` es solo del entorno de prueba.

## Limpieza (verificada)

Se ejecutó `docker rm -fv` del contenedor, `docker network rm`, `docker rmi unc-dep07-synth/migrator:npm11`, y se borraron del scratchpad el seed descomprimido, su TOC, los dumps (sintéticos y de backup), el compose temporal y las contraseñas.

```
docker ps -a      : unc-mailpit-local, unc-minio-local, unc-postgres-local, welcome-to-docker
docker network ls : bridge, host, none, unc-local_default
docker volume ls  : unc_mailpit_data, unc_minio_data, unc_postgres_data
docker images     : postgres:16-alpine, axllent/mailpit, quay.io/minio/minio, docker/welcome-to-docker
recursos con prefijo unc-dep07-synth (todos los tipos): 0
```

Quedan sin prefijo: la caché de BuildKit del build (capas de `node:22.17.0-alpine` y `npm ci`; la imagen base se borró) y no se creó ningún archivo `setup/seed.dump` en el repo. `git status` no muestra archivos nuevos fuera de esta evidencia y las ediciones documentales listadas.

## Rollback

Borrar este archivo y revertir las ediciones de `docs/specs/deploy/DEP-07-via-unica-de-esquema.md` (párrafo «HIPÓTESIS pendientes» y su tabla de estado) y de las fichas RDD-DEP-16 … RDD-DEP-22 en `docs/research/evidence-register.md` (última columna). No hubo otros cambios.

## Nota de estado (post-corrección)

D1 y D4 se corrigieron en código con TDD (sin Docker): D1 en `apps/cms/Dockerfile` (`npm install -g npm@11` antes de `npm ci`), D4 en `.github/workflows/deploy.yml` (`timeout` sobre `cms-migrate`, 124 aborta antes de `up -d`). Pendiente: re-build real del migrator y timeout real con el prompt colgado. D2 y D3 siguen pendientes de decisión del dueño. Esta validación no se reescribe: el texto de arriba es la evidencia original.
