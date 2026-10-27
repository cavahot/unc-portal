# Migraciones Payload/PostgreSQL

Fuente única del esquema de cualquier entorno persistente (DEP-07). Prohibido `push` fuera de dev local.

## Contenido

- `20261017_021341_arch_db_02_baseline.ts` y `.json`: línea base (64 tablas) generada en una BD vacía.
- `20261022_134500_dep_03_created_by.ts` y `.json`: DEP-03, añade `createdBy` (autoría, NULLABLE, FK `ON DELETE set null`,
  índice) a `noticias`, `paginas` y sus tablas de versiones. Solo hacia adelante, sin `DROP`, sin tocar datos; su `down`
  no hace nada. El relleno de autores heredados es un script aparte, revisado y NO ejecutado (ver la spec DEP-03).
- `20261023_150000_perf_db_indexes.ts` y `.json`: PERF-DB, `CREATE INDEX IF NOT EXISTS` para `noticias.featured` (y su tabla de
  versiones) y `auditoria.fecha_hora`. Solo hacia adelante, sin tocar datos; su `down` no hace nada.
- `20261023_223448_pra_01_premios_acreditaciones.ts` y `.json`: PRA-01 (fase CMS), crea `reconocimientos`, `reconocimientos_ediciones` y
  `acreditaciones`, añade `siglas` y `logo_path` a `facultades` y las columnas de bloqueo en `payload_locked_documents_rels`.
  Idempotente; su `down` se niega a correr si las tablas nuevas tienen filas y conserva las columnas de `facultades`.
- `20261024_120000_mig_img_02_media_provenance.ts` y `.json`: MIG-IMG fase 2a, añade a `media` `sha256` (índice único
  `media_sha256_idx`; las filas anteriores quedan en NULL, que el índice único admite) y `source_path`. Idempotente; su
  `down` se niega a correr si alguna fila tiene `sha256` o `source_path`.
- `20261024_140000_mlg_01_marco_legal_campos.ts` y `.json`: MLG-01, añade a `marco_legal` `estado` (enum
  `vigente|derogado|historico`, NOT NULL, por defecto `vigente`), `fecha_documento` y `nota`. Idempotente; su `down` se
  niega a correr si alguna fila tiene fecha, nota o un estado distinto de `vigente`.
- `20261024_204456_lt_01_linea_tiempo.ts` y `.json`: LT-01, crea `linea_tiempo` (hitos de /historia, con FK a `media`
  y traducciones en columnas `traducciones_{en,pt_b_r,gn}_{titulo,descripcion}`) y la columna de bloqueo
  `linea_tiempo_id` en `payload_locked_documents_rels`. SQL de `migrate:create` vuelto idempotente; su `down` se niega
  a correr si la tabla tiene filas.
- `20261024_230000_cnv_01_convenios_campos.ts` y `.json`: CNV-01, añade a `convenios` `categoria` (enum
  `institucional|beneficios`, por defecto `institucional`), `nota` y `orden` (por defecto 99), y quita el NOT NULL de
  `objective` (una fila internacional del sitio publicado no tiene finalidad). Idempotente; su `down` se niega a correr
  si alguna fila usa los campos nuevos o tiene `objective` vacío.
- `20261025_180000_arr_01_aranceles_rectorado.ts` y `.json`: ARR-01, en `aranceles_rectorado` (paso EXPAND) añade
  `active` copiando `activo` (una sola vez), CONSERVA `activo` (nullable, DEFAULT true), quita el DEFAULT de `grupo` y
  crea `aranceles_rectorado_active_idx` y el índice único `concepto_grupo_idx`. Idempotente; su `down` copia
  `active` a `activo` y no borra filas. El snapshot `.json` solo describe `active` (la columna legada queda fuera).
  **Contract pendiente:** migración posterior `drop aranceles_rectorado.activo` (ver «Migraciones contract pendientes»).
- `20261025_190000_glo_gn_01_glosario_guarani.ts` y `.json`: GLO-GN-01, crea `glosario_guarani` (glosario
  español → guaraní privado), su arreglo `glosario_guarani_variantes_gn`, cuatro enums, el índice único
  `terminoEs_fuente_idx` y la columna de bloqueo en `payload_locked_documents_rels`. Idempotente; su `down` se niega
  si la tabla tiene filas. Spec: `docs/specs/i18n/GLOSARIO-GUARANI.md`.
- `20261025_200000_fac_01_facultad_detalle.ts` y `.json`: FAC-01, añade a `facultades` `historia`, `direccion`,
  `sitio_web` y los arreglos `facultades_correos_adicionales` y `facultades_redes`; en `carreras` quita el NOT NULL de
  `duracion`/`titulo` y el DEFAULT 'Presencial' de `modalidad`, añade `perfil`, `orden` y `carreras_resoluciones`; crea
  `aranceles_facultad` (FK a `facultades`, índice único `facultad_grupo_concepto_idx`) y su columna de bloqueo.
  Encadenada tras `glo_gn_01`. Idempotente; su `down` se niega si hay datos nuevos. Spec: `docs/specs/portal/FACULTADES.md`.
- `20261026_100000_trans_01_leyes_natural_key.ts` y `.json`: TRANS-01, añade `natural_key` (índice único) e índice por `category` a `ley5189` y `ley5282` (sin duplicados de documentos). Encadenada tras `fac_01`. Idempotente; su `down` se niega si hay filas con clave. Spec: `docs/specs/portal/TRANSPARENCIA-LEYES.md`.
- `20261026_200000_trans_02_items.ts` y `.json`: TRANS-02, crea `transparencia_items` (28 ítems oficiales editables), añade `item_id` (NOT NULL, FK) a `ley5189`/`ley5282`, pasa `category` de enum a texto derivado y enlaza los documentos existentes por `category = codigo` (solo crea los ítems que ya tienen documentos; el resto lo siembra `scripts/seed-transparencia-items.mjs`). Encadenada tras `trans_01`. Idempotente; su `down` se niega si hay ítems o documentos. Spec: `docs/specs/portal/TRANSPARENCIA-ITEMS.md`.
- `20261026_220000_dep_sec_01_users_reset_password.ts` y `.json`: DEP-SEC-01, añade `users.reset_password_requested_at` (timestamptz, NULLABLE, sin DEFAULT ni relleno), exigida por Payload >= 3.90. Encadenada tras `trans_02`. Idempotente; su `down` no hace nada. `media._object_key` no hace falta (no se usa `clientUploads`). Spec: `docs/specs/security/DEP-SEC-01-actualizacion-dependencias.md`.
- `index.ts`: índice que Payload importa. Debe coincidir con los `.ts` y `.json` del directorio
  (lo verifica `tests/deploy/dep07-schema-path.red.test.mjs`).

## Reglas

- Las migraciones corren solo hacia adelante en producción: `payload migrate` desde el servicio
  `cms-migrate` (imagen `migrator` de `apps/cms/Dockerfile`), después de un `pg_dump` verificado.
- `down` del baseline lanza error si alguna tabla de datos tiene filas (solo BD vacía). Nunca se ejecuta
  en el deploy automático (`migrate:down|reset|refresh|fresh` están prohibidos en CI/deploy).
- Una BD con una fila `batch = -1` en `payload_migrations` (esquema creado por push en dev) no se migra:
  el CLI preguntaría de forma interactiva y sin TTY saldría con 0 sin aplicar nada.
- Los datos iniciales se cargan con `scripts/setup/restore-data-prod.sh` (solo datos, tablas vacías).
- Una migración nueva se crea con `npm run payload --workspace=@unc/cms -- migrate:create <nombre>`,
  se revisa a mano y se prueba con `up` en una BD sintética vacía antes de mergear.

## Migraciones contract pendientes

- **`drop aranceles_rectorado.activo`** (contract de ARR-01). Cuándo: en un release posterior, cuando el release que
  contiene `arr_01` ya esté estable y NO se pueda volver a la imagen previa (la que consulta `activo`). Qué hace:
  `ALTER TABLE "aranceles_rectorado" DROP COLUMN IF EXISTS "activo"`, con su `.ts` registrado en `index.ts`.
  Ventana de rollback hasta entonces: la imagen vieja sigue funcionando porque `activo` existe y tiene DEFAULT true;
  las ediciones hechas con la imagen nueva en `active` no se replican a `activo` (la imagen vieja ve el valor previo
  al deploy y las filas nuevas nacen con `activo = true`).
