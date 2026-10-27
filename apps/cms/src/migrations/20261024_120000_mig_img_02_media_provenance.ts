// MIG-IMG fase 2a: columnas de procedencia en `media` (`sha256` único y `source_path` opcional).
// Spec: docs/specs/migration/MIG-IMG-imagenes-de-noticias.md §17 | Evidencia: RDD-MIG-IMG-57 y 60 | reglas: DEP-07.
//
// Qué hace: añade `sha256` (varchar, índice ÚNICO `media_sha256_idx`) y `source_path` (varchar) a `media`.
// Nombres iguales a los que genera Payload: columna en snake_case del campo y `${tabla}_${columna}_idx`
// (node_modules/@payloadcms/drizzle/dist/schema/traverseFields.js:61-80, utilities/buildIndexName.js:1-10).
// Escrita a mano (patrón de PRA-01) y contrastada con el esquema que el servidor de desarrollo crea por push.
//
// Reglas de seguridad de esta migración:
//   - `up` es aditivo e idempotente (IF NOT EXISTS): no toca filas. Las filas existentes quedan con `sha256`
//     NULL; un índice único de Postgres admite varios NULL (los NULL no se consideran iguales), así que no
//     hay conflicto con la media cargada antes de esta fase.
//   - `down` SOLO retira lo que añadió `up` y se niega si alguna fila tiene `sha256` o `source_path`
//     (perderlos rompe la idempotencia del cargador y la trazabilidad del lote). El deploy automático nunca
//     ejecuta `migrate:down` (DEP-07).
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; el SQL se valida con pruebas estáticas
// (tests/unit/mig-img-migration.spec.ts) y el esquema equivalente lo aplicó el push del CMS en dev.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sha256" varchar;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source_path" varchar;
  CREATE UNIQUE INDEX IF NOT EXISTS "media_sha256_idx" ON "media" USING btree ("sha256");`)
}

/**
 * MIG-IMG fase 2a: `down` seguro. Amenaza: un `migrate:down` accidental borraría las huellas y rutas de
 * origen con las que el cargador evita duplicados. Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const res = await db.execute(
    sql.raw(
      `SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."media" WHERE "sha256" IS NOT NULL OR "source_path" IS NOT NULL LIMIT 1) s`,
    ),
  )
  const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
  if (Number(rows[0]?.n ?? 0) > 0) {
    throw new Error(
      'MIG-IMG-02: down rechazado, hay filas de media con sha256 o source_path. Haga un pg_dump verificado y vacíe esas columnas de forma explícita.',
    )
  }
  await db.execute(sql`
  DROP INDEX IF EXISTS "media_sha256_idx";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "source_path";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sha256";`)
}
