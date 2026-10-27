// TRANS-02: ítems de transparencia editables (colección `transparencia-items`) y relación de los documentos con su ítem.
// Spec: docs/specs/portal/TRANSPARENCIA-ITEMS.md §4 | reglas: DEP-07.
//
// Qué hace:
//   1. Crea la tabla `transparencia_items` (ley, código, título, descripción, orden, publicado, clave natural) con sus
//      índices (clave natural ÚNICA) y el tipo enum de `ley`.
//   2. En `ley5189` y `ley5282`: añade `item_id` (FK a `transparencia_items`) con su índice; `category` pasa de enum a
//      varchar sin perder valores (ahora es un texto derivado del código del ítem, así `natural_key` y su semántica no
//      cambian) y deja de ser NOT NULL.
//   3. Relleno: crea SOLO los ítems oficiales cuyo código ya usan documentos existentes (no inventa contenido en una BD
//      sin documentos; el resto lo crea scripts/seed-transparencia-items.mjs) y enlaza cada documento por
//      `category = codigo`. Luego `item_id` pasa a NOT NULL; si algún documento no pudiera enlazarse la migración falla
//      entera (transacción) en vez de dejar huérfanos.
//   4. Añade `transparencia_items_id` a `payload_locked_documents_rels` (bloqueo de edición del panel).
// Escrita a mano (patrón de CNV-01/TRANS-01) sobre el snapshot de `20261026_100000_trans_01_leyes_natural_key.json`.
//
// Reglas de seguridad:
//   - `up` es idempotente (IF NOT EXISTS, `duplicate_object`, ON CONFLICT DO NOTHING, UPDATE solo donde `item_id` es
//     NULL): una segunda ejecución no cambia filas. No borra ni reescribe documentos.
//   - `down` SOLO deshace lo que añadió `up` y se niega si existen ítems o documentos (son datos del PO). El deploy
//     nunca ejecuta `migrate:down`.
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; el SQL se probó en PostgreSQL local dentro de una transacción
// con ROLLBACK y el esquema equivalente lo aplica el push del CMS en dev.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
     CREATE TYPE "public"."enum_transparencia_items_ley" AS ENUM('5189', '5282');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE TABLE IF NOT EXISTS "transparencia_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ley" "enum_transparencia_items_ley" NOT NULL,
  	"codigo" varchar NOT NULL,
  	"titulo" varchar NOT NULL,
  	"descripcion" varchar,
  	"orden" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"natural_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "transparencia_items_ley_idx" ON "transparencia_items" USING btree ("ley");
  CREATE INDEX IF NOT EXISTS "transparencia_items_active_idx" ON "transparencia_items" USING btree ("active");
  CREATE UNIQUE INDEX IF NOT EXISTS "transparencia_items_natural_key_idx" ON "transparencia_items" USING btree ("natural_key");
  CREATE INDEX IF NOT EXISTS "transparencia_items_updated_at_idx" ON "transparencia_items" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "transparencia_items_created_at_idx" ON "transparencia_items" USING btree ("created_at");

  ALTER TABLE "ley5189" ADD COLUMN IF NOT EXISTS "item_id" integer;
  ALTER TABLE "ley5282" ADD COLUMN IF NOT EXISTS "item_id" integer;
  ALTER TABLE "ley5189" ALTER COLUMN "category" SET DATA TYPE varchar USING "category"::text;
  ALTER TABLE "ley5282" ALTER COLUMN "category" SET DATA TYPE varchar USING "category"::text;
  ALTER TABLE "ley5189" ALTER COLUMN "category" DROP NOT NULL;
  ALTER TABLE "ley5282" ALTER COLUMN "category" DROP NOT NULL;
  DROP TYPE IF EXISTS "public"."enum_ley5189_category";
  DROP TYPE IF EXISTS "public"."enum_ley5282_category";

  INSERT INTO "transparencia_items" ("ley", "codigo", "titulo", "orden", "active", "natural_key")
  SELECT v.ley::"enum_transparencia_items_ley", v.codigo, v.titulo, v.orden, true, v.ley || '|' || v.codigo
  FROM (VALUES
    ('5189', 'organigrama', 'Organigrama', 10),
    ('5189', 'direccion-telefono', 'Dirección y Teléfono de la Entidad y Dependencias', 20),
    ('5189', 'nomina-personal', 'Nómina del Personal', 30),
    ('5189', 'presupuesto-ingresos-gastos', 'Presupuesto de Ingresos – Gastos', 40),
    ('5189', 'anexo-personal', 'Anexo del Personal', 50),
    ('5189', 'ejecucion-presupuestaria', 'Ejecución Presupuestaria', 60),
    ('5189', 'registro-viaticos', 'Registro Mensual de Viáticos e Informe de Actividades', 70),
    ('5189', 'bienes-patrimoniales', 'Listado de Bienes Patrimoniales', 80),
    ('5189', 'funcionarios-comisionados', 'Listado de Funcionarios Comisionados de Otras Instituciones', 90),
    ('5189', 'otras-informaciones', 'Otras Informaciones', 100),
    ('5189', 'cumplimiento-art7', 'Cumplimiento Art. 7°', 110),
    ('5282', 'item-1', 'Su estructura orgánica', 10),
    ('5282', 'item-2', 'Facultades, deberes, funciones y/o atribuciones de sus órganos y dependencias', 20),
    ('5282', 'item-3', 'Marco normativo que rija su funcionamiento', 30),
    ('5282', 'item-4', 'Descripción general de cómo funciona y proceso de toma de decisiones', 40),
    ('5282', 'item-5', 'Listado actualizado de personas que cumplan función pública o sean funcionarios públicos', 50),
    ('5282', 'item-6', 'Descripción de la política institucional y de los planes de acción', 60),
    ('5282', 'item-7', 'Descripción de los programas institucionales en ejecución', 70),
    ('5282', 'item-8', 'Informes de auditoría', 80),
    ('5282', 'item-9', 'Informes de viajes oficiales dentro del territorio o al extranjero', 90),
    ('5282', 'item-10', 'Convenios y contratos celebrados', 100),
    ('5282', 'item-11', 'Cartas oficiales', 110),
    ('5282', 'item-12', 'Informes finales de consultorías', 120),
    ('5282', 'item-13', 'Cuadros de resultados', 130),
    ('5282', 'item-14', 'Lista de poderes vigentes otorgados a abogados', 140),
    ('5282', 'item-15', 'Sistema de mantenimiento, clasificación e índice de documentos existentes', 150),
    ('5282', 'item-16', 'Procedimientos para que personas interesadas puedan acceder a documentos', 160),
    ('5282', 'item-17', 'Mecanismos de participación ciudadana', 170)
  ) AS v(ley, codigo, titulo, orden)
  WHERE (v.ley = '5189' AND EXISTS (SELECT 1 FROM "ley5189" d WHERE d."category" = v.codigo))
     OR (v.ley = '5282' AND EXISTS (SELECT 1 FROM "ley5282" d WHERE d."category" = v.codigo))
  ON CONFLICT ("natural_key") DO NOTHING;
  UPDATE "ley5189" d SET "item_id" = i."id" FROM "transparencia_items" i WHERE d."item_id" IS NULL AND i."ley" = '5189' AND i."codigo" = d."category";
  UPDATE "ley5282" d SET "item_id" = i."id" FROM "transparencia_items" i WHERE d."item_id" IS NULL AND i."ley" = '5282' AND i."codigo" = d."category";

  ALTER TABLE "ley5189" ALTER COLUMN "item_id" SET NOT NULL;
  ALTER TABLE "ley5282" ALTER COLUMN "item_id" SET NOT NULL;
  DO $$ BEGIN
     ALTER TABLE "ley5189" ADD CONSTRAINT "ley5189_item_id_transparencia_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."transparencia_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     ALTER TABLE "ley5282" ADD CONSTRAINT "ley5282_item_id_transparencia_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."transparencia_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "ley5189_item_idx" ON "ley5189" USING btree ("item_id");
  CREATE INDEX IF NOT EXISTS "ley5282_item_idx" ON "ley5282" USING btree ("item_id");

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "transparencia_items_id" integer;
  DO $$ BEGIN
     ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transparencia_items_fk" FOREIGN KEY ("transparencia_items_id") REFERENCES "public"."transparencia_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_transparencia_items_id_idx" ON "payload_locked_documents_rels" USING btree ("transparencia_items_id");`)
}

/**
 * TRANS-02: `down` seguro. Amenaza: un `migrate:down` accidental borraría los ítems editados por el PO y el vínculo de
 * los documentos. Se niega si existe cualquier ítem o documento. Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const res = await db.execute(
    sql.raw(
      `SELECT ((SELECT count(*) FROM "public"."transparencia_items") + (SELECT count(*) FROM "public"."ley5189") + (SELECT count(*) FROM "public"."ley5282"))::int AS n`,
    ),
  )
  const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
  if (Number(rows[0]?.n ?? 0) > 0) {
    throw new Error(
      'TRANS-02: down rechazado, hay ítems o documentos de transparencia. Haga un pg_dump verificado y vacíe esas tablas de forma explícita.',
    )
  }
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_transparencia_items_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_transparencia_items_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "transparencia_items_id";
  ALTER TABLE "ley5189" DROP CONSTRAINT IF EXISTS "ley5189_item_id_transparencia_items_id_fk";
  ALTER TABLE "ley5282" DROP CONSTRAINT IF EXISTS "ley5282_item_id_transparencia_items_id_fk";
  DROP INDEX IF EXISTS "ley5189_item_idx";
  DROP INDEX IF EXISTS "ley5282_item_idx";
  ALTER TABLE "ley5189" DROP COLUMN IF EXISTS "item_id";
  ALTER TABLE "ley5282" DROP COLUMN IF EXISTS "item_id";
  DO $$ BEGIN
     CREATE TYPE "public"."enum_ley5189_category" AS ENUM('organigrama', 'direccion-telefono', 'nomina-personal', 'presupuesto-ingresos-gastos', 'anexo-personal', 'ejecucion-presupuestaria', 'registro-viaticos', 'bienes-patrimoniales', 'funcionarios-comisionados', 'otras-informaciones', 'cumplimiento-art7');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_ley5282_category" AS ENUM('item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7', 'item-8', 'item-9', 'item-10', 'item-11', 'item-12', 'item-13', 'item-14', 'item-15', 'item-16', 'item-17');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  ALTER TABLE "ley5189" ALTER COLUMN "category" SET DATA TYPE "public"."enum_ley5189_category" USING "category"::"public"."enum_ley5189_category";
  ALTER TABLE "ley5282" ALTER COLUMN "category" SET DATA TYPE "public"."enum_ley5282_category" USING "category"::"public"."enum_ley5282_category";
  ALTER TABLE "ley5189" ALTER COLUMN "category" SET NOT NULL;
  ALTER TABLE "ley5282" ALTER COLUMN "category" SET NOT NULL;
  DROP TABLE IF EXISTS "transparencia_items" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_transparencia_items_ley";`)
}
