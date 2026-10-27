// FAC-01: datos de la página de facultad. Spec: docs/specs/portal/FACULTADES.md §3 | reglas: DEP-07.
//
// Qué hace y por qué:
//   - `facultades`: columnas `historia`, `direccion`, `sitio_web` y los arreglos `facultades_correos_adicionales` y
//     `facultades_redes` (enum `enum_facultades_redes_red`): contacto e historia pasan del código al CMS.
//   - `carreras`: `duracion` y `titulo` dejan de ser NOT NULL (no se inventan), `modalidad` pierde el DEFAULT
//     'Presencial' (marcaba un dato no confirmado), columnas `perfil` y `orden`, arreglo `carreras_resoluciones`.
//   - `aranceles_facultad` (nueva, enum `enum_aranceles_facultad_grupo`) con FK a `facultades`, índices y el índice
//     único `facultad_grupo_concepto_idx`; columna de bloqueo en `payload_locked_documents_rels`.
// SQL idéntico al que el CMS creó por push en dev local (nombres leídos de pg_indexes/pg_constraint), vuelto
// idempotente. Escrita a mano sobre el snapshot de `20261025_190000_glo_gn_01_glosario_guarani.json` (el último).
// No se ejecutó `payload migrate` sobre ninguna BD.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_facultades_redes_red" AS ENUM('facebook', 'instagram', 'x', 'youtube');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_aranceles_facultad_grupo" AS ENUM('multas', 'venta', 'servicios', 'medicos');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "historia" varchar;
  ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "direccion" varchar;
  ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "sitio_web" varchar;
  CREATE TABLE IF NOT EXISTS "facultades_correos_adicionales" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "etiqueta" varchar,
    "email" varchar NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "facultades_redes" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "red" "enum_facultades_redes_red" NOT NULL,
    "url" varchar NOT NULL
  );

  ALTER TABLE "carreras" ALTER COLUMN "duracion" DROP NOT NULL;
  ALTER TABLE "carreras" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "carreras" ALTER COLUMN "modalidad" DROP DEFAULT;
  ALTER TABLE "carreras" ADD COLUMN IF NOT EXISTS "perfil" varchar;
  ALTER TABLE "carreras" ADD COLUMN IF NOT EXISTS "orden" numeric DEFAULT 99;
  CREATE TABLE IF NOT EXISTS "carreras_resoluciones" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "numero" varchar NOT NULL,
    "enlace" varchar,
    "detalle" varchar
  );

  CREATE TABLE IF NOT EXISTS "aranceles_facultad" (
    "id" serial PRIMARY KEY NOT NULL,
    "facultad_id" integer NOT NULL,
    "concepto" varchar NOT NULL,
    "monto" numeric NOT NULL,
    "grupo" "enum_aranceles_facultad_grupo" NOT NULL,
    "nota" varchar,
    "orden" numeric DEFAULT 99,
    "active" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "aranceles_facultad_id" integer;

  DO $$ BEGIN
    ALTER TABLE "facultades_correos_adicionales" ADD CONSTRAINT "facultades_correos_adicionales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."facultades"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "facultades_redes" ADD CONSTRAINT "facultades_redes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."facultades"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "carreras_resoluciones" ADD CONSTRAINT "carreras_resoluciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carreras"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "aranceles_facultad" ADD CONSTRAINT "aranceles_facultad_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_aranceles_facultad_fk" FOREIGN KEY ("aranceles_facultad_id") REFERENCES "public"."aranceles_facultad"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE INDEX IF NOT EXISTS "facultades_correos_adicionales_order_idx" ON "facultades_correos_adicionales" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "facultades_correos_adicionales_parent_id_idx" ON "facultades_correos_adicionales" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "facultades_redes_order_idx" ON "facultades_redes" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "facultades_redes_parent_id_idx" ON "facultades_redes" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "carreras_resoluciones_order_idx" ON "carreras_resoluciones" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "carreras_resoluciones_parent_id_idx" ON "carreras_resoluciones" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "aranceles_facultad_facultad_idx" ON "aranceles_facultad" USING btree ("facultad_id");
  CREATE INDEX IF NOT EXISTS "aranceles_facultad_grupo_idx" ON "aranceles_facultad" USING btree ("grupo");
  CREATE INDEX IF NOT EXISTS "aranceles_facultad_active_idx" ON "aranceles_facultad" USING btree ("active");
  CREATE INDEX IF NOT EXISTS "aranceles_facultad_updated_at_idx" ON "aranceles_facultad" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "aranceles_facultad_created_at_idx" ON "aranceles_facultad" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "facultad_grupo_concepto_idx" ON "aranceles_facultad" USING btree ("facultad_id","grupo","concepto");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_aranceles_facultad_id_idx" ON "payload_locked_documents_rels" USING btree ("aranceles_facultad_id");`)
}

/**
 * FAC-01: `down` se niega a correr si hay datos en lo nuevo (evita borrar aranceles o redes cargados por el PO).
 * Vuelve a poner NOT NULL en `duracion`/`titulo` solo si ninguna fila los tiene vacíos, y repone el DEFAULT.
 * El deploy nunca ejecuta `migrate:down`.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM "aranceles_facultad") OR EXISTS (SELECT 1 FROM "carreras_resoluciones")
       OR EXISTS (SELECT 1 FROM "facultades_redes") OR EXISTS (SELECT 1 FROM "facultades_correos_adicionales")
       OR EXISTS (SELECT 1 FROM "facultades" WHERE "historia" IS NOT NULL OR "direccion" IS NOT NULL OR "sitio_web" IS NOT NULL)
       OR EXISTS (SELECT 1 FROM "carreras" WHERE "perfil" IS NOT NULL) THEN
      RAISE EXCEPTION 'FAC-01: hay datos en las tablas nuevas; respalde y vacíelas a mano antes del down.';
    END IF;
  END $$;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_aranceles_facultad_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_aranceles_facultad_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "aranceles_facultad_id";
  DROP TABLE IF EXISTS "aranceles_facultad" CASCADE;
  DROP TABLE IF EXISTS "carreras_resoluciones" CASCADE;
  DROP TABLE IF EXISTS "facultades_redes" CASCADE;
  DROP TABLE IF EXISTS "facultades_correos_adicionales" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_aranceles_facultad_grupo";
  DROP TYPE IF EXISTS "public"."enum_facultades_redes_red";
  ALTER TABLE "carreras" DROP COLUMN IF EXISTS "perfil";
  ALTER TABLE "carreras" DROP COLUMN IF EXISTS "orden";
  ALTER TABLE "carreras" ALTER COLUMN "modalidad" SET DEFAULT 'Presencial';
  ALTER TABLE "facultades" DROP COLUMN IF EXISTS "historia";
  ALTER TABLE "facultades" DROP COLUMN IF EXISTS "direccion";
  ALTER TABLE "facultades" DROP COLUMN IF EXISTS "sitio_web";
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM "carreras" WHERE "duracion" IS NULL) THEN ALTER TABLE "carreras" ALTER COLUMN "duracion" SET NOT NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM "carreras" WHERE "titulo" IS NULL) THEN ALTER TABLE "carreras" ALTER COLUMN "titulo" SET NOT NULL; END IF;
  END $$;`)
}
