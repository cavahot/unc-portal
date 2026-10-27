// GLO-GN-01: colección privada `glosario-guarani` (glosario español → guaraní para traducir el portal).
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §2 | reglas: DEP-07.
//
// Qué hace: crea los enums `enum_glosario_guarani_{tipo,categoria,confianza,origen}`, la tabla `glosario_guarani`
// (término, forma guaraní, fuente, URL oficial, URL de evidencia, confianza, oficial, revisado, activo, origen,
// fecha de consulta, nota), la tabla del arreglo `glosario_guarani_variantes_gn`, los índices (incluido el único
// compuesto `terminoEs_fuente_idx`, nombre que genera Payload para `indexes: [{ fields: ['terminoEs','fuente'] }]`)
// y la columna `glosario_guarani_id` de `payload_locked_documents_rels` (bloqueo de edición del panel).
// El SQL se escribió a mano copiando el esquema que el push del CMS creó en dev (verificado en information_schema el
// 25-10-2026) y se encadenó al snapshot de `20261025_180000_arr_01_aranceles_rectorado.json`.
//
// Reglas de seguridad:
//   - `up` es aditivo e idempotente (IF NOT EXISTS y `duplicate_object`): se puede reaplicar sobre un esquema creado
//     por el push del CMS; no borra ni reescribe filas.
//   - `down` SOLO quita lo que añadió `up` y se niega si `glosario_guarani` tiene filas (vocabulario revisado por el
//     PO). El deploy nunca ejecuta `migrate:down`.
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; el SQL se valida con pruebas estáticas
// (tests/unit/glosario-guarani-cms.spec.ts).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
     CREATE TYPE "public"."enum_glosario_guarani_tipo" AS ENUM('diccionario', 'oficial', 'prestamo', 'neologismo', 'institucional', 'corpus', 'localizacion');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_glosario_guarani_categoria" AS ENUM('universidad', 'academico', 'administrativo', 'tecnologia', 'general');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_glosario_guarani_confianza" AS ENUM('A', 'B', 'C', 'X');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_glosario_guarani_origen" AS ENUM('glosario-po', 'actualizador', 'panel');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE TABLE IF NOT EXISTS "glosario_guarani" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"termino_es" varchar NOT NULL,
  	"termino_gn" varchar,
  	"tipo" "enum_glosario_guarani_tipo" NOT NULL,
  	"categoria" "enum_glosario_guarani_categoria",
  	"confianza" "enum_glosario_guarani_confianza" NOT NULL,
  	"fuente" varchar NOT NULL,
  	"fuente_url" varchar,
  	"evidencia_url" varchar,
  	"oficial" boolean DEFAULT false,
  	"revisado" boolean DEFAULT false,
  	"activo" boolean DEFAULT true,
  	"origen" "enum_glosario_guarani_origen" DEFAULT 'panel',
  	"fecha_consulta" timestamp(3) with time zone,
  	"nota" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "glosario_guarani_variantes_gn" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar NOT NULL
  );
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "glosario_guarani_id" integer;
  DO $$ BEGIN
     ALTER TABLE "glosario_guarani_variantes_gn" ADD CONSTRAINT "glosario_guarani_variantes_gn_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glosario_guarani"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_glosario_guarani_fk" FOREIGN KEY ("glosario_guarani_id") REFERENCES "public"."glosario_guarani"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "glosario_guarani_termino_es_idx" ON "glosario_guarani" USING btree ("termino_es");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_confianza_idx" ON "glosario_guarani" USING btree ("confianza");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_revisado_idx" ON "glosario_guarani" USING btree ("revisado");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_updated_at_idx" ON "glosario_guarani" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_created_at_idx" ON "glosario_guarani" USING btree ("created_at");
  -- GLO-GN-01 (SEC-REVIEW): pre-chequeo de duplicados. Amenaza: el CREATE UNIQUE INDEX fallaría con un error críptico a
  -- mitad del despliegue si la tabla ya tiene filas repetidas. Solo corre si el índice aún no existe y la tabla y
  -- las columnas existen; el mensaje nombra tabla e índice y nunca incluye valores de filas (pueden ser datos del PO).
  DO $$ BEGIN
    IF to_regclass('public."terminoEs_fuente_idx"') IS NULL
       AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'glosario_guarani' AND column_name IN ('termino_es', 'fuente')) = 2 THEN
      IF EXISTS (SELECT 1 FROM (SELECT 1 FROM "glosario_guarani" WHERE "termino_es" IS NOT NULL AND "fuente" IS NOT NULL GROUP BY "termino_es","fuente" HAVING count(*) > 1 LIMIT 1) AS dup) THEN
        RAISE EXCEPTION 'GLO-GN-01: la tabla glosario_guarani tiene filas duplicadas en (termino_es, fuente) y no se puede crear el indice unico terminoEs_fuente_idx. Deduplique esas filas antes de migrar.';
      END IF;
    END IF;
  END $$;
  CREATE UNIQUE INDEX IF NOT EXISTS "terminoEs_fuente_idx" ON "glosario_guarani" USING btree ("termino_es","fuente");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_variantes_gn_order_idx" ON "glosario_guarani_variantes_gn" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_variantes_gn_parent_id_idx" ON "glosario_guarani_variantes_gn" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_glosario_guarani_id_idx" ON "payload_locked_documents_rels" USING btree ("glosario_guarani_id");`)
}

/**
 * GLO-GN-01: `down` seguro. Amenaza: un `migrate:down` accidental borraría el vocabulario revisado por el PO.
 * Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const exists = await db.execute(sql.raw(`SELECT to_regclass('public."glosario_guarani"') IS NOT NULL AS ok`))
  const existsRows = (exists as { rows?: Array<{ ok?: unknown }> }).rows ?? []
  if (existsRows[0]?.ok === true) {
    const res = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."glosario_guarani" LIMIT 1) s`))
    const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
    if (Number(rows[0]?.n ?? 0) > 0) {
      throw new Error(
        'GLO-GN-01: down rechazado, hay términos en glosario_guarani. Haga un pg_dump verificado y vacíe la tabla de forma explícita.',
      )
    }
  }
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_glosario_guarani_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_glosario_guarani_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "glosario_guarani_id";
  DROP TABLE IF EXISTS "glosario_guarani_variantes_gn" CASCADE;
  DROP TABLE IF EXISTS "glosario_guarani" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_glosario_guarani_tipo";
  DROP TYPE IF EXISTS "public"."enum_glosario_guarani_categoria";
  DROP TYPE IF EXISTS "public"."enum_glosario_guarani_confianza";
  DROP TYPE IF EXISTS "public"."enum_glosario_guarani_origen";`)
}
