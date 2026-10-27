// MLG-01: campos nuevos de `marco_legal`: `fecha_documento`, `estado` (enum) y `nota`.
// Spec: docs/specs/portal/MARCO-LEGAL.md §3 y §7 | reglas: DEP-07.
//
// Qué hace: crea el tipo `enum_marco_legal_estado` ('vigente', 'derogado', 'historico') y añade a `marco_legal`
// `fecha_documento` (timestamp, opcional), `estado` (NOT NULL, por defecto 'vigente': las filas existentes
// quedan vigentes) y `nota` (varchar, opcional). Nombres iguales a los que genera Payload (snake_case del
// campo y `enum_<tabla>_<campo>`). Escrita a mano (patrón de PRA-01) sobre el snapshot de
// `20261024_120000_mig_img_02_media_provenance.json`.
//
// Reglas de seguridad:
//   - `up` es aditivo e idempotente (IF NOT EXISTS y `duplicate_object`): no borra ni reescribe filas.
//   - `down` SOLO quita lo que añadió `up` y se niega si alguna fila usa los campos nuevos (fecha, nota o un
//     estado distinto de 'vigente'): son datos cargados por el PO. El deploy nunca ejecuta `migrate:down`.
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; el esquema equivalente lo aplica el push del CMS en
// dev y el SQL se valida con pruebas estáticas (tests/unit/marco-legal-cms.spec.ts).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
     CREATE TYPE "public"."enum_marco_legal_estado" AS ENUM('vigente', 'derogado', 'historico');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  ALTER TABLE "marco_legal" ADD COLUMN IF NOT EXISTS "estado" "enum_marco_legal_estado" DEFAULT 'vigente' NOT NULL;
  ALTER TABLE "marco_legal" ADD COLUMN IF NOT EXISTS "fecha_documento" timestamp(3) with time zone;
  ALTER TABLE "marco_legal" ADD COLUMN IF NOT EXISTS "nota" varchar;`)
}

/**
 * MLG-01: `down` seguro. Amenaza: un `migrate:down` accidental borraría fechas, notas y estados normativos
 * cargados desde el panel. Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const res = await db.execute(
    sql.raw(
      `SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."marco_legal" WHERE "fecha_documento" IS NOT NULL OR "nota" IS NOT NULL OR "estado" <> 'vigente' LIMIT 1) s`,
    ),
  )
  const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
  if (Number(rows[0]?.n ?? 0) > 0) {
    throw new Error(
      'MLG-01: down rechazado, hay documentos del marco legal con fecha, nota o estado distinto de vigente. Haga un pg_dump verificado y vacíe esos campos de forma explícita.',
    )
  }
  await db.execute(sql`
  ALTER TABLE "marco_legal" DROP COLUMN IF EXISTS "nota";
  ALTER TABLE "marco_legal" DROP COLUMN IF EXISTS "fecha_documento";
  ALTER TABLE "marco_legal" DROP COLUMN IF EXISTS "estado";
  DROP TYPE IF EXISTS "public"."enum_marco_legal_estado";`)
}
