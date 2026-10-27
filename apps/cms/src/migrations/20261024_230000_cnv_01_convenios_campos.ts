// CNV-01: campos nuevos de `convenios`: `categoria` (enum), `nota` y `orden`; `objective` pasa a opcional.
// Spec: docs/specs/portal/CONVENIOS.md §3 y §7 | reglas: DEP-07.
//
// Qué hace: crea el tipo `enum_convenios_categoria` ('institucional', 'beneficios') y añade a `convenios`
// `categoria` (por defecto 'institucional': las filas existentes quedan institucionales), `nota` (varchar) y
// `orden` (numeric, por defecto 99). Quita el NOT NULL de `objective` porque el sitio publicado tiene una fila
// internacional sin finalidad (no se inventa un texto). Nombres iguales a los que genera Payload. Escrita a mano
// (patrón de MLG-01) sobre el snapshot de `20261024_204456_lt_01_linea_tiempo.json`.
//
// Reglas de seguridad:
//   - `up` es aditivo e idempotente (IF NOT EXISTS y `duplicate_object`); `DROP NOT NULL` solo relaja una
//     restricción y es idempotente. No borra ni reescribe filas.
//   - `down` SOLO quita lo que añadió `up` y se niega si alguna fila usa los campos nuevos o tiene `objective`
//     vacío (son datos del PO o de la siembra). El deploy nunca ejecuta `migrate:down`.
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; en dev el esquema equivalente lo aplica el push del CMS
// y el SQL se valida con pruebas estáticas (tests/unit/convenios-cms.spec.ts).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
     CREATE TYPE "public"."enum_convenios_categoria" AS ENUM('institucional', 'beneficios');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  ALTER TABLE "convenios" ADD COLUMN IF NOT EXISTS "categoria" "enum_convenios_categoria" DEFAULT 'institucional';
  ALTER TABLE "convenios" ADD COLUMN IF NOT EXISTS "nota" varchar;
  ALTER TABLE "convenios" ADD COLUMN IF NOT EXISTS "orden" numeric DEFAULT 99;
  ALTER TABLE "convenios" ALTER COLUMN "objective" DROP NOT NULL;`)
}

/**
 * CNV-01: `down` seguro. Amenaza: un `migrate:down` accidental borraría categorías, notas y el orden cargados
 * desde el panel o la siembra. Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const res = await db.execute(
    sql.raw(
      `SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."convenios" WHERE "nota" IS NOT NULL OR "objective" IS NULL OR "categoria" <> 'institucional' OR "orden" <> 99 LIMIT 1) s`,
    ),
  )
  const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
  if (Number(rows[0]?.n ?? 0) > 0) {
    throw new Error(
      'CNV-01: down rechazado, hay convenios con categoría, nota, orden o finalidad vacía. Haga un pg_dump verificado y revise esas filas de forma explícita.',
    )
  }
  await db.execute(sql`
  ALTER TABLE "convenios" ALTER COLUMN "objective" SET NOT NULL;
  ALTER TABLE "convenios" DROP COLUMN IF EXISTS "orden";
  ALTER TABLE "convenios" DROP COLUMN IF EXISTS "nota";
  ALTER TABLE "convenios" DROP COLUMN IF EXISTS "categoria";
  DROP TYPE IF EXISTS "public"."enum_convenios_categoria";`)
}
