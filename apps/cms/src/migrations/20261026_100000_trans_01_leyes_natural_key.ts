// TRANS-01: clave natural de `ley5189` y `ley5282` (evita documentos duplicados) e índice por categoría.
// Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md §2.1 y §7 | reglas: DEP-07.
//
// Qué hace: añade a cada tabla la columna `natural_key` (varchar, nullable) con índice ÚNICO y un índice por
// `category`. Nombres iguales a los que genera Payload para `unique: true` e `index: true`. Escrita a mano
// (patrón de CNV-01) sobre el snapshot del último migration previo.
//
// Reglas de seguridad:
//   - `up` es aditivo e idempotente (IF NOT EXISTS). No borra ni reescribe filas. Las filas previas quedan con
//     `natural_key` NULL: en PostgreSQL varios NULL no chocan en un índice único, así que la migración no puede
//     fallar por datos existentes; el hook del CMS calcula la clave la próxima vez que se guarden.
//   - `down` SOLO quita lo que añadió `up` y se niega si alguna fila ya tiene clave (son datos cargados por el
//     PO o por el cargador). El deploy nunca ejecuta `migrate:down`.
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; en dev el esquema equivalente lo aplica el push del CMS.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "ley5189" ADD COLUMN IF NOT EXISTS "natural_key" varchar;
  ALTER TABLE "ley5282" ADD COLUMN IF NOT EXISTS "natural_key" varchar;
  CREATE UNIQUE INDEX IF NOT EXISTS "ley5189_natural_key_idx" ON "ley5189" USING btree ("natural_key");
  CREATE UNIQUE INDEX IF NOT EXISTS "ley5282_natural_key_idx" ON "ley5282" USING btree ("natural_key");
  CREATE INDEX IF NOT EXISTS "ley5189_category_idx" ON "ley5189" USING btree ("category");
  CREATE INDEX IF NOT EXISTS "ley5282_category_idx" ON "ley5282" USING btree ("category");`)
}

/**
 * TRANS-01: `down` seguro. Amenaza: un `migrate:down` accidental quitaría la protección contra duplicados y la
 * clave de documentos ya cargados. Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const res = await db.execute(
    sql.raw(
      `SELECT ((SELECT count(*) FROM "public"."ley5189" WHERE "natural_key" IS NOT NULL) + (SELECT count(*) FROM "public"."ley5282" WHERE "natural_key" IS NOT NULL))::int AS n`,
    ),
  )
  const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
  if (Number(rows[0]?.n ?? 0) > 0) {
    throw new Error(
      'TRANS-01: down rechazado, hay documentos de transparencia con clave natural. Haga un pg_dump verificado y revise esas filas de forma explícita.',
    )
  }
  await db.execute(sql`
  DROP INDEX IF EXISTS "ley5282_category_idx";
  DROP INDEX IF EXISTS "ley5189_category_idx";
  DROP INDEX IF EXISTS "ley5282_natural_key_idx";
  DROP INDEX IF EXISTS "ley5189_natural_key_idx";
  ALTER TABLE "ley5282" DROP COLUMN IF EXISTS "natural_key";
  ALTER TABLE "ley5189" DROP COLUMN IF EXISTS "natural_key";`)
}
