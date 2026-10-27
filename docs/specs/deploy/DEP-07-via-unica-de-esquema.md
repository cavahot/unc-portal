# DEP-07 — Camino único y reproducible de esquema y migraciones

**Estado:** **GREEN implementado — vía C elegida por el dueño (no hay producción viva: el primer deploy aún no se hizo; A′ y A descartadas).** Implementado sin Docker/Postgres/red; lo no verificable queda como HIPÓTESIS (sección «Estado GREEN»). **Backlog:** DEP-07 (hallazgo C4 de `docs/security/AUDIT-DEPLOY-2026-10-19.md`, = ARCH-DB). **Tarea:** `docs/security/TASK-DEPLOY-001-remediacion-auditoria-predeploy.md`. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-16 … RDD-DEP-22). **Formato:** SEC-005 / DEP-04.

## Problema

Hoy hay dos caminos de esquema incompatibles y ninguno es reproducible en producción:

- **Dev** crea el esquema por `push` del adaptador y deja una fila `dev` (`batch = -1`) en `payload_migrations`.
- **Prod** (`NODE_ENV=production`) **no** hace `push` ni migra al arrancar; el deploy tampoco ejecuta `migrate`. Una BD nueva queda sin tablas; la única forma documentada de poblarla es restaurar `setup/seed.dump.gz` (tomado de la BD dev), lo que trae el esquema de dev, no el del baseline versionado.
- El baseline (`apps/cms/src/migrations/20261017_021341_arch_db_02_baseline.ts`) reproduce 64 tablas en una BD vacía, pero su `down` borra todo con `DROP … CASCADE` sin precondición y la imagen del CMS no puede ejecutar `payload migrate`.

Amenaza: deploy sin retorno, esquema distinto entre entornos, pérdida de datos por un `migrate:down/reset/refresh` accidental, o un falso verde de `migrate` en CI.

## Hechos verificados (archivo:línea)

| # | Hecho | Evidencia | RDD |
|---|---|---|---|
| H1 | Con `NODE_ENV=production` no hay `push`; las migraciones al conectar solo corren si existe `prodMigrations`. | `node_modules/@payloadcms/db-postgres/dist/connect.js:109-111,116-120` | 16 |
| H2 | La config no define `push` ni `prodMigrations`; sí `migrationDir: path.resolve(dirname,'migrations')`. | `apps/cms/src/payload.config.ts:156-172` | 16 |
| H3 | El compose del CMS fija `NODE_ENV: production`. | `infrastructure/docker/compose.prod.yaml:92` | 16 |
| H4 | Dev dejó una migración histórica `dev` (batch -1); `migrate` la detecta y pregunta de forma interactiva; cancelar hace `process.exit(0)`. **Corrección D4 (2026-10-20):** medido sin TTY, el proceso queda COLGADO (no sale con 0); ver `docs/evidence/dep-07-validation.md` ítem 4. | `docs/evidence/arch-db-01-database-uri.md:64`; `node_modules/@payloadcms/drizzle/dist/migrate.js:30-45` | 17 |
| H5 | El seed se genera con `pg_dump -Fc --no-owner --no-acl` de la BD local `unc-postgres-local` (dev). El archivo versionado es del 2026-08-08, anterior al baseline (2026-10-17). | `scripts/setup/create-seed.sh:16-40`; `ls -l setup/seed.dump.gz` | 17, 18 |
| H6 | El baseline crea 33 `CREATE TYPE` y 64 `CREATE TABLE`, incluida `payload_migrations(id serial, name varchar, batch numeric, updated_at, created_at)` con defaults de fecha. | `…baseline.ts:8-` (enums), `:679-685` | 18 |
| H7 | El `down` hace 64 `DROP TABLE … CASCADE` + `DROP TYPE` sin precondición. | `…baseline.ts:1061-1160` | 18 |
| H8 | Una migración cuenta como aplicada solo por **nombre** (`path.basename(file).split('.')[0]`); no hay checksum ni comparación de esquema. | `drizzle/dist/migrate.js:54-58`; `payload/dist/database/migrations/readMigrationFiles.js:25` | 19 |
| H9 | Cada migración corre en una transacción y un fallo hace `process.exit(1)` (aborta, no deja esquema a medias). | `drizzle/dist/migrate.js:62-95` | 19 |
| H10 | `readMigrationFiles` lee el **directorio** del disco (no `index.ts`). | `readMigrationFiles.js:7-22` | 20 |
| H11 | La etapa `runner` solo copia el standalone de Next y `.next/static`. | `apps/cms/Dockerfile:56-59` | 20 |
| H12 | `deploy.yml` hace `pull` → `up -d` → `prune`, sin `pg_dump`, `migrate` ni rollback; el restore del seed hace `DROP SCHEMA public CASCADE` + `pg_restore` sin migrate. | `.github/workflows/deploy.yml:131-146`; `scripts/setup/restore-db-prod.sh:145-158` | 21 |
| H13 | Evidencia previa (sesión ARCH-DB-02, no re-ejecutada aquí): `up` → 64 tablas; dos BD vacías → mismo esquema (sha256 igual); `down` → 0 tablas. | `docs/evidence/arch-db-01-database-uri.md:76-114` | 18 |
| H14 | `migrations/README.md` quedó obsoleto (afirma que no hay baseline). | `apps/cms/src/migrations/README.md:5` | 18 |

**HIPÓTESIS (no verificables hoy: sin Postgres, Docker ni `pg_restore`):** (1) el seed contiene la fila `dev`; (2) el esquema del seed difiere del baseline; (3) sin TTY `prompts` cancela y `migrate` sale con 0 sin migrar [corregido D4: medido, cuelga; ver `docs/evidence/dep-07-validation.md`]; (4) el standalone no incluye CLI ni `src/migrations`; (5) el orden de datos de `pg_restore --data-only` respeta las FKs de Payload. Cada una se convierte en hecho o se refuta en la BD sintética del paso GREEN.

## Opciones

Nombre común: «BD destino» = Postgres de producción (volumen `unc_postgres_data_prod`).

### A. Restaurar `seed.dump` y registrar el baseline como aplicado

- **Cómo:** `restore-db-prod.sh` (con backup previo, DEP-01) → borrar fila `batch=-1` → `INSERT INTO payload_migrations(name,batch) VALUES ('20261017_021341_arch_db_02_baseline',1)` (H6/H8: basta `name` y `batch`) → `payload migrate` (no-op) en cada deploy.
- **Ventajas:** conserva todos los datos y los IDs tal cual; es lo más cercano al flujo actual; sin reimportación.
- **Costes/riesgos:** el esquema real es el del dump (push de dev, agosto), **no** el baseline. Payload no lo detecta (H8). Las migraciones futuras se generan contra el snapshot JSON del baseline: si hay deriva, fallarán tarde (en el deploy) o, peor, aplicarán sobre un esquema distinto. Arrastra estado de dev (sesiones, bloqueos, preferencias, hashes: DEP-01). Mitigación obligatoria: comparar `pg_dump --schema-only` del dump restaurado contra el de una BD migrada (misma técnica de H13) y abortar si difieren.
- **Rollback:** `pre-restore-<UTC>.dump` (DEP-01) → `pg_restore`; la fila insertada se revierte con el propio restore. Operación manual con aprobación.

### B. `payload migrate` sobre BD vacía y reimportar datos con los scripts

- **Cómo:** `migrate` → datos con `scripts/seed-*.mjs` (FAQs, convenios, tribunal, autoridades, leyes, facultades…) y similares.
- **Ventajas:** esquema 100 % del baseline; sin PII heredada en la BD; reproducible.
- **Costes/riesgos:** los seeds llaman a la REST de Payload con login (`scripts/seed-faqs.mjs:30-39`) → requieren CMS arriba y un usuario admin previo; cubren colecciones institucionales, no las **271 noticias**, media, tesis ni usuarios. `migrate-wordpress.mjs` depende de un XML phpMyAdmin que no está en el repo (HIPÓTESIS: no se buscó fuera del repo). IDs distintos a los del dump (rompe referencias externas/URLs por ID). Con el repo actual **no es viable como única fuente de datos**.
- **Rollback:** descartar el volumen y repetir (solo seguro si no hay datos propios de producción).

### C. Híbrida: BD nueva con `migrate` + solo datos del dump (`--data-only`)

- **Cómo:** `migrate` (esquema = baseline) → `pg_restore --data-only --single-transaction --no-owner -L <lista filtrada>` sobre tablas vacías. La lista `-L` (de `pg_restore -l`) excluye `payload_migrations`, `users_sessions`, `payload_locked_documents*` y `payload_kv` para no pisar el registro de migraciones ni arrastrar sesiones. (`pg_restore` en PG16 no tiene `--exclude-table-data`; por eso `-L`.)
- **Ventajas:** el esquema siempre sale de migraciones (único camino, igual en CI, staging y prod); si el dump no es compatible **falla en voz alta** y de forma atómica (COPY con lista de columnas; enum desconocido; columna extra) en vez de arrastrar deriva; conserva IDs.
- **Viabilidad real (tomada de H6/H13 + conocimiento de Postgres, sin ejecutar):** secuencias: las entradas `SEQUENCE SET` son sección de datos y se restauran (verificar `last_value ≥ max(id)`); enums: el COPY convierte texto a enum, valores ausentes del baseline abortan; FK: el orden de datos sigue las dependencias que `pg_dump` calcula, pero sin `--disable-triggers` (exige superusuario) un ciclo de FK fallaría (HIPÓTESIS 5); columnas: NOT NULL nuevas en baseline sin default rompen la carga (señal útil de deriva). Costo: una prueba obligatoria en BD sintética con una copia del dump.
- **Riesgos:** PII del dump sigue entrando (DEP-01); si la prueba sintética falla por deriva, el seed requiere regeneración desde una BD migrada, no un parche.
- **Rollback:** la BD destino es nueva y la carga es transaccional: ante error no queda nada; se descarta el volumen. Si ya hubo tráfico, restaurar el `pg_dump` previo.

### A′ (variante condicionada) — adopción in situ

Si **existe producción viva con datos propios**, ninguna de las tres aplica tal cual (A/B/C asumen BD nueva): se toma `pg_dump` verificado, se compara el esquema vivo contra el baseline, y solo si es idéntico se registra el baseline (A sin `DROP`). Si difiere, se escribe una migración de ajuste revisada por humano. Esta variante exige respuesta a la pregunta 1.

## Recomendación

**Opción C**, con A como contingencia solo si la prueba sintética de C resulta inviable y el esquema del dump coincide con el baseline.

Justificación: es la única que deja **un solo camino** (esquema = migraciones, siempre) y a la vez conserva los datos que el repo no puede regenerar (B no es viable con el repo actual). A deja la deriva dump↔baseline invisible para Payload (H8) y es justo el tipo de falla que C convierte en un error explícito. Costo aceptado: una prueba en Postgres sintético (requiere autorización) antes de tocar producción, y cambiar `restore-db-prod.sh` para que haga «migrate + carga de datos en tablas vacías» en vez de `DROP SCHEMA`. Recomendación **condicionada a las respuestas 1 y 2**: sin producción viva y con el seed como única fuente de datos, C; con producción viva, A′.

## Preguntas abiertas para el dueño

1. ¿Existe hoy una base de producción viva con datos propios (usuarios, noticias nuevas desde el 2026-08-08), o el primer deploy aún no se hizo?
2. ¿`setup/seed.dump.gz` es la única fuente de datos (noticias, media, tesis, usuarios), o hay otra BD/backup más reciente y el XML de WordPress?
3. ¿La tabla `payload_migrations` del dump contiene la fila `dev` o el baseline? (se responde listando el dump en un entorno aislado; hoy es hipótesis).
4. ¿Se acepta que las migraciones sean solo hacia adelante en producción (`down` nunca automático) y que el rollback ante una migración no retrocompatible sea «restaurar el `pg_dump` previo» con pérdida de lo escrito después?
5. ¿Se prefiere un servicio `cms-migrate` de un solo uso en compose (recomendado) o ejecutar `payload migrate` con `docker compose run` desde el SSH del deploy?
6. ¿Se autoriza levantar un Postgres sintético (Docker o staging aislado) para las pruebas de aceptación?

## Contrato (invariantes de cualquier vía)

- El esquema de cualquier entorno persistente se crea y cambia **solo** con migraciones versionadas en `apps/cms/src/migrations`. Prohibido `push` fuera de dev local.
- `migrate` se ejecuta como **paso explícito** del deploy, **antes** de levantar la nueva versión del CMS, **después** de un `pg_dump -Fc` verificado (`pg_restore --list`, tamaño > 0; reutiliza DEP-01; cifrado y copia externa son DEP-08).
- Un `migrate` fallido aborta el deploy (código ≠ 0, sin `|| true`) y no se levanta la nueva versión.
- `migrate:down`, `migrate:reset`, `migrate:refresh` y `migrate:fresh` nunca se invocan desde CI/deploy.
- El `down` del baseline lanza un error si alguna tabla de datos tiene filas; solo ejecuta sobre BD vacía.
- `migrate` no debe pedir confirmación interactiva en CI: ninguna BD de destino puede tener `batch = -1`.
- El esquema reproducible es verificable: dos BD vacías migradas producen el mismo `pg_dump --schema-only` normalizado (H13) y ese hash se compara en el arnés cuando haya Postgres autorizado.
- `index.ts`, los `.ts` del directorio y los snapshots `.json` coinciden (RED a).

## Escenarios Given/When/Then

### Comunes a toda vía

C1. **Orden de deploy.** Dado un deploy con imágenes nuevas, cuando corre el script remoto, entonces el orden es: `pull` → `pg_dump` verificado → `migrate` → `up -d` → health. (RED c)
C2. **Backup inválido.** Dado un `pg_dump` que falla, sale vacío o no pasa `pg_restore --list`, cuando continúa el deploy, entonces aborta antes de `migrate` y de `up`; las versiones en ejecución no se tocan.
C3. **Migrate falla.** Dada una migración que lanza error, cuando `migrate` corre, entonces sale ≠ 0 (transacción revertida, H9), el deploy termina en rojo, no se ejecuta `up` y el sha anterior sigue sirviendo.
C4. **Idempotencia.** Dado un esquema ya migrado, cuando `migrate` corre otra vez, entonces no cambia el esquema ni agrega filas a `payload_migrations`, y sale con 0.
C5. **Sin interacción.** Dada una BD con fila `batch = -1`, cuando se ejecuta `migrate` en CI sin TTY, entonces el paso falla ANTES de ejecutar (precheck SQL: `SELECT 1 FROM payload_migrations WHERE batch = -1`) con un mensaje claro; no se admite el `exit(0)` silencioso (HIPÓTESIS 3 refutada: el proceso cuelga, no sale con 0; corrección D4 en `docs/evidence/dep-07-validation.md`). Defensa en profundidad: `timeout` sobre `cms-migrate` en el deploy; el código 124 aborta antes de `up -d`.
C6. **`down` protegido.** Dada una BD con al menos una fila en una tabla de datos, cuando se ejecuta el `down` del baseline, entonces lanza error antes del primer `DROP` y no cambia nada. Dada una BD sin filas, el `down` procede. (RED b)
C7. **`down` nunca automático.** Dado `deploy.yml`, cuando se busca `migrate:down|reset|refresh|fresh`, entonces no aparece.
C8. **Esquema desactualizado.** Dado un CMS cuya imagen espera migraciones que `payload_migrations` no tiene, cuando se intenta arrancar, entonces **no sirve tráfico**: el servicio `cms` depende de `cms-migrate` con `condition: service_completed_successfully`, y la sonda de readiness de DEP-09 informa 503 con «migraciones pendientes» (sin detalles sensibles). Se descarta `prodMigrations` (auto‑migrar al arrancar): carrera entre réplicas y se ejecutaría sin `pg_dump` previo.
C9. **Imagen capaz de migrar.** Dada la imagen que ejecuta `cms-migrate` (etapa final o etapa `migrator`), cuando se inspecciona el Dockerfile, entonces incluye `node_modules` con el CLI de payload y `apps/cms/src` (config + migraciones). (RED d)
C10. **Rollback por sha (DEP-09).** Dado un deploy que pasó `migrate` pero falla el health, cuando se revierte, entonces: (i) si las migraciones del lote son retrocompatibles (expandir/contraer), se vuelve al sha anterior sin tocar la BD; (ii) si no, se restaura el `pg_dump` previo tras aprobación humana, aceptando la pérdida de escrituras posteriores. El script registra el sha previo y la ruta del dump **antes** de `migrate`.
C11. **Sin deriva índice↔directorio.** Dado un archivo nuevo en `migrations/` no exportado por `index.ts` (o al revés, o sin `.json`), cuando corre la suite, entonces falla. (RED a)

### Por vía (descritos, NO escritos)

- **A:** (A1) tras el restore, `payload_migrations` tiene exactamente la fila del baseline con `batch ≥ 1` y ninguna `batch = -1`; (A2) `pg_dump --schema-only` del dump restaurado == el de una BD migrada, si no, aborta antes de registrar; (A3) `migrate` posterior es no-op; (A4) el restore sigue exigiendo backup verificado (DEP-01).
- **B:** (B1) tras `migrate` en BD vacía, los seeds poblan solo colecciones soportadas y el script declara explícitamente qué colecciones **no** se reimportan; (B2) los seeds fallan si no hay usuario admin; (B3) los conteos esperados por colección están en el spec del seed.
- **C:** (C-1) el script de carga se niega si cualquier tabla de datos tiene filas; (C-2) el `-L` excluye `payload_migrations`, sesiones, bloqueos y `payload_kv`; (C-3) tras la carga, `count(*)` por tabla == filas del TOC del dump y cada secuencia `last_value ≥ max(id)`; (C-4) si el dump trae un enum/columna que el baseline no tiene, la carga aborta sin dejar datos parciales (`--single-transaction`); (C-5) `payload_migrations` conserva solo la fila del baseline creada por `migrate`.

## RED escrito (esta entrega)

Archivo: `tests/deploy/dep07-schema-path.red.test.mjs` (`node --test`, aislado de `npm test`, que solo recoge `tests/unit/**/*.spec.ts`). Ejecutar: `node --test tests/deploy/dep07-schema-path.red.test.mjs`.

| Test | Estado hoy | Razón |
|---|---|---|
| Autopruebas de los chequeos (fixtures buena/mala) | verde | prueban que los chequeos detectan lo que dicen |
| (a) `index.ts` ↔ archivos `.ts`/`.json` | **verde (no es RED)** | hoy hay 1 migración y coincide; es un invariante de regresión que reemplaza el `toContain` de `tests/unit/payload-migrations-config.spec.ts`. Se vuelve rojo si alguien agrega un archivo sin regenerar `index.ts` |
| (b) `down` del baseline con precondición de BD vacía | **RED** | H7: `DROP TABLE … CASCADE` desde la primera línea del `down`, sin `throw`/`RAISE` previo |
| (c) `deploy.yml`: pg_dump verificado → migrate → up, `set -e`, sin `\|\| true` | **RED** | H12: no hay `pg_dump` ni `migrate` |
| (d) Dockerfile: etapa final o `*migrator*` con `node_modules` y `apps/cms/src/migrations` | **RED** | H11: solo standalone + static |

`guard-deploy-steps` (`harness/guards.mjs:229-242`) es de palabras clave y ya está rojo hoy por falta de migración/backup/rollback; (c) lo complementa verificando **orden** y abort. No se modificó el arnés. Mejora sugerida para GREEN: que el guard reutilice `deployOrderFindings`.

## Estado GREEN (vía C implementada)

Respuestas del dueño: 1 = no hay producción viva; vía C. Las preguntas 2–6 siguen abiertas salvo lo implícito: el seed es la fuente de datos; se implementó el servicio `cms-migrate` (pregunta 5).

| GWT | Implementación | Prueba |
|---|---|---|
| C1 orden | `deploy.yml`: pull → backup verificado → `run --rm -T cms-migrate` → comprobación → `up -d` | `dep07-schema-path.red.test.mjs` (c); `dep07-deploy-script.test.mjs` |
| C2 backup inválido | aborta antes de migrate/up (dump falla, vacío, ilegible; volumen sin contenedor) | `dep07-deploy-script.test.mjs` |
| C3 migrate falla | `if ! … cms-migrate; then exit 1`; sin `up` | ídem |
| C4 idempotencia | `payload migrate` omite lo ya registrado por nombre (H8); `up -d` relanza `cms-migrate` (no-op) | HIPÓTESIS: solo lectura de código |
| C5 sin interacción | precheck SQL `batch = -1` en deploy.yml y en `restore-data-prod.sh`; `run -T < /dev/null`; comprobación posterior `batch > 0` anti falso verde | `dep07-deploy-script.test.mjs`, `restore-data-prod.test.mjs` |
| C6 `down` protegido | `DEP07_DATA_TABLES` + `throw` antes del primer borrado | RED (b); `tests/unit/baseline-down-guard.spec.ts` |
| C7 | `deploy.yml` sin `migrate:down|reset|refresh|fresh` | `dep07-deploy-script.test.mjs` |
| C8 | `cms` `depends_on: cms-migrate: service_completed_successfully`. La sonda 503 es DEP-09 | revisión estática |
| C9 imagen | etapa `migrator` en `apps/cms/Dockerfile` (runner intacto y final) | RED (d) |
| C10 | NO implementado (rollback por sha: DEP-09); el deploy imprime la ruta del dump | — |
| C11 | `payload-migrations-config.spec.ts` (invariante real) y RED (a) | vitest + node:test |
| C-1…C-5 | `scripts/setup/restore-data-prod.sh` + `setup/restore-data.exclude.txt` | `restore-data-prod.test.mjs` (el conteo `count(*)` == TOC de C-3 NO se implementó: requiere Postgres) |

Decisiones: (1) `--force-accept-warning` NO evita el prompt de `batch = -1` (en `@payloadcms/drizzle/dist/migrate.js:30-45` el prompt no lee ese flag; solo lo usan `migrate:create/fresh` en `payload/dist/bin/migrate.js`), por eso el precheck SQL. (2) El `down` del baseline cubre 24 tablas raíz de contenido; las hijas y las volátiles se excluyen con justificación en el código. (3) `deploy.yml` usaba `dockerfile:` (input inexistente de `build-push-action`; el válido es `file:`): se corrigió porque sin ello el CMS y el migrator se construirían con `./Dockerfile` del portal. (4) El migrator se publica como imagen aparte (`unc-portal-cms-migrator`); su tag va por `${CMS_IMAGE_TAG:-latest}` para fijarlo junto al `cms` en DEP-11. (5) Se hace backup siempre antes de la carga de datos (el esquema migrado ya tiene tablas) además de exigir tablas vacías. (6) Sin `--disable-triggers`: un dump incompatible debe fallar, no cargarse sin FK.

**Hipótesis (texto original; ya validadas el 2026-10-20 en Postgres sintético, estado en la tabla siguiente):** H1) el seed (2026-08-08) es compatible con el baseline (columnas, NOT NULL nuevas, enums); H2) el orden de datos de `pg_restore --data-only` respeta las FK sin `--disable-triggers`; H3) el formato real de `pg_restore --list` coincide con el que parsea el `awk` (entradas `TABLE DATA public <t>` y `SEQUENCE SET public <s>`); H4) las secuencias quedan con `last_value >= max(id)` y el bloque `DO $$` es válido; H5) el seed trae o no la fila `dev` (irrelevante: se excluye `payload_migrations`); H6) la etapa `migrator` construye y `payload migrate` carga `payload.config.ts` con tsx dentro del contenedor (rutas, `PAYLOAD_CONFIG_PATH`, `migrationDir` resuelto desde `import.meta.url`); H7) `docker compose run --rm -T` propaga el código de salida y `up -d` relanza `cms-migrate` como no-op; H8) sin TTY `prompts` cancela con `exit(0)` (cubierto por el precheck); H9) `down` sobre BD vacía realmente borra las 64 tablas y deja `\dt` vacío; H10) las consultas del `down` (`to_regclass`, `count(*)`) devuelven `rows` con el driver real.

**Estado de las hipótesis tras la validación empírica** (`docs/evidence/dep-07-validation.md`, 2026-10-20; BD sintética `postgres:16-alpine`, sin datos reales del seed):

| Hip. | Estado | Resultado resumido |
|---|---|---|
| H1 compatibilidad seed vs baseline | **REFUTADA** | 4 columnas (`noticias.faculty`, `_noticias_v.version_faculty`, `autoridades.faculty`, `tesis.facultad` enum NOT NULL) y el enum `enum_tesis_facultad` difieren de `*_faculty_id`/`facultad_id`; la carga falla en voz alta (`column "faculty" … does not exist`). Defecto D3. |
| H2 orden de datos/FK sin `--disable-triggers` | **REFUTADA** para el seed `-Fc` completo | El TOC es alfabético: 15 de 56 FK quedan hijo-antes-que-padre; `autoridades` antes de `facultades` aborta. Con `pg_dump --data-only` (orden por FK) o `--disable-triggers` la carga funciona. Defecto D2. |
| H3 formato de `pg_restore --list` vs `awk` | **CONFIRMADA** | 64 `TABLE DATA public` + 44 `SEQUENCE SET public`; lista filtrada = 57 tablas + 38 secuencias; 7 tablas y 6 secuencias excluidas. |
| H4 secuencias y bloque `DO $$` | **CONFIRMADA** | Secuencia atrasada (1/false, max=101) queda en 101/true; el bloque es válido. |
| H5 el seed trae la fila `dev` | **NO CONCLUYENTE** | No se leyeron filas del seed; irrelevante porque `payload_migrations` se excluye. |
| H6 la etapa `migrator` construye y `migrate` carga la config | **REFUTADA tal cual / CONFIRMADA con variante** | `npm ci` falla en node 22.17.0/npm 10.9.2 (`@swc/helpers` fuera de sincronía; defecto D1). Con `npm i -g npm@11` construye y `migrate` crea 64 tablas, `batch=1`; rutas y `migrationDir` correctos. |
| H7 `compose run --rm -T` propaga exit code; `up -d` relanza no-op | **CONFIRMADA** (exit code, idempotencia) / **NO PROBADA** (`up -d` real) | exit 0 y 7 propagados; segunda y tercera ejecución sin cambios (hash de esquema igual). |
| H8 sin TTY `prompts` cancela con `exit(0)` | **REFUTADA en esa forma** | Con `batch=-1` y stdin cerrado el proceso queda colgado (no sale); no hay falso verde, pero sí bloqueo (defecto D4); el precheck del deploy lo detecta y aborta con exit 1. |
| H9 `down` sobre BD vacía deja 0 tablas | **CONFIRMADA** | 0 tablas y 0 enums; con filas, error `DEP-07: down rechazado` sin borrar nada. |
| H10 `to_regclass`/`count(*)` devuelven `rows` | **CONFIRMADA** | El guard detectó filas en `noticias` y `facultades` con el driver real. |

Conclusión: la vía C **no es ejecutable hoy** con el seed y el script actuales (D1, D2, D3); el esquema por `migrate`, el `down` protegido, la idempotencia, el backup y el precheck funcionan. Requiere decisión del dueño sobre la regeneración del seed.

## Estado de defectos de la validación (actualizado 2026-10-20)

| Defecto | Estado |
|---|---|
| D1 (`npm ci` falla en `deps` con npm 10) | **Corregido en código**: `npm install -g npm@11` antes de `npm ci` en `apps/cms/Dockerfile` (RED→GREEN: `tests/deploy/dep07-dockerfile-npm.test.mjs`). **Re-validado con Docker (2026-10-21): CONFIRMADO** — build `--target migrator` con el comando del workflow en 256 s (991 MB), `npm ci` pasa, `migrate` deja 64 tablas + 1 fila `batch=1`, 2.ª ejecución idempotente (`docs/evidence/dep-07-revalidation.md`). |
| D4 (`migrate` colgado con `batch = -1`) | **Corregido en código**: `timeout` (`DEP07_MIGRATE_TIMEOUT`, 600 s por defecto) sobre `cms-migrate` en `deploy.yml`; 124/137 aborta antes de `up -d` con mensaje claro (RED→GREEN: `tests/deploy/dep07-deploy-script.test.mjs`, escenario D4). **Re-validado con Docker (2026-10-21): PARCIAL** — el prompt cuelga, `timeout` devuelve 124 a los 20 s y el script aborta con exit 1 sin llegar a `up -d` (CONFIRMADO); pero `docker compose run` ignora `container_name`, así que el huérfano (`<proyecto>-cms-migrate-run-<hash>`) sigue vivo y `docker rm -f unc-cms-migrate-prod` no lo elimina ni avisa (REFUTADO; defecto nuevo D7, MEDIA; arreglo verificado: `run --name unc-cms-migrate-prod`). Rama 137 no ejercitada. |
| D7 (`compose run` ignora `container_name`; el migrador colgado sobrevive al timeout) | **Corregido en código**: `run --rm -T --name unc-cms-migrate-prod cms-migrate` más limpieza por etiqueta (`docker ps -aq --filter label=com.docker.compose.service=cms-migrate \| xargs -r docker rm -f`) en `deploy.yml`, con avisos si falla (RED→GREEN: escenarios D7 en `tests/deploy/dep07-deploy-script.test.mjs`, con un shim que modela el comportamiento medido en `docs/evidence/dep-07-revalidation.md`). **Re-validación con Docker pendiente.** No ejercitado: la rama 137 (SIGKILL tras `--kill-after`), el comportamiento real de `--name` y de la etiqueta con Compose del servidor, ni la disponibilidad de `xargs -r` allí. |
| D2 (orden de FK del seed) | **Pendiente de decisión del dueño** (no tocado). |
| D3 (deriva de esquema del seed) | **Pendiente de decisión del dueño** (no tocado). |

## Rollback de la implementación GREEN

Revertir: `apps/cms/src/migrations/20261017_021341_arch_db_02_baseline.ts` (bloque `DEP07_DATA_TABLES` y guard del `down`), `README.md` de migraciones, `apps/cms/Dockerfile` (etapa `migrator`), `infrastructure/docker/compose.prod.yaml` (ancla `x-cms-env`, servicio `cms-migrate`, `depends_on`), `.github/workflows/deploy.yml`, `scripts/setup/restore-db-prod.sh` (cabecera), `DEPLOY.md`, `tests/unit/payload-migrations-config.spec.ts`, y borrar `scripts/setup/restore-data-prod.sh`, `setup/restore-data.exclude.txt`, `tests/deploy/dep07-deploy-script.test.mjs`, `tests/deploy/restore-data-prod.test.mjs`, `tests/unit/baseline-down-guard.spec.ts` y la fila RDD-DEP-22.

## Fuera de alcance

Backups cifrados y copia externa (DEP-08); health real, imágenes por sha y reintentos (DEP-09, DEP-11); migración de índices de `auditoria` (DEP-04, que la requerirá como **segunda** migración sobre este camino); purga de PII del dump e historial (DEP-01).

## Riesgos remanentes

- La elección de vía está sin hacer; sin ella no hay GREEN.
- Todo lo marcado HIPÓTESIS exige Postgres sintético autorizado.
- La imagen necesitará más dependencias (CLI de payload, cargador TS) si se migra desde el contenedor: aumenta tamaño y superficie (DEP-13/14).
- `down` protegido evita el desastre accidental, pero no sustituye `pg_dump` previo.

## Rollback de esta entrega

Borrar `docs/specs/deploy/DEP-07-via-unica-de-esquema.md`, `tests/deploy/dep07-schema-path.red.test.mjs` y las filas `RDD-DEP-16` … `RDD-DEP-21` de `docs/research/evidence-register.md`. No hay otros cambios.
