import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * INST-12 (dependencias_01): crea la colección `dependencias-contacto` (directorio de /contacto/dependencias), sus listas
 * anidadas de sedes, teléfonos y correos, y la columna de bloqueo en `payload_locked_documents_rels`. Spec
 * docs/specs/portal/DEPENDENCIAS.md §2.2.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`IF NOT EXISTS` y bloques `DO $$` con
 * `duplicate_object`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo hacia adelante:
 * únicamente objetos nuevos, sin tocar ni leer filas existentes.
 *
 * Amenaza que evita el `down`: borrar los datos de contacto que la institución ya cargó. Se niega a correr si
 * `dependencias_contacto` tiene filas; revertir con datos exige respaldo verificado y una decisión explícita.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "dependencias_contacto_sedes_telefonos" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "texto" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "dependencias_contacto_sedes_correos" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "texto" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "dependencias_contacto_sedes" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "nombre" varchar,
    "direccion" varchar NOT NULL,
    "web" varchar
  );

  CREATE TABLE IF NOT EXISTS "dependencias_contacto" (
    "id" serial PRIMARY KEY NOT NULL,
    "nombre" varchar NOT NULL,
    "slug" varchar NOT NULL,
    "logo" varchar,
    "destacada" boolean DEFAULT false,
    "orden" numeric DEFAULT 99,
    "activa" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "dependencias_contacto_id" integer;
  DO $$ BEGIN
    ALTER TABLE "dependencias_contacto_sedes_telefonos" ADD CONSTRAINT "dependencias_contacto_sedes_telefonos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dependencias_contacto_sedes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "dependencias_contacto_sedes_correos" ADD CONSTRAINT "dependencias_contacto_sedes_correos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dependencias_contacto_sedes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "dependencias_contacto_sedes" ADD CONSTRAINT "dependencias_contacto_sedes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dependencias_contacto"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_sedes_telefonos_order_idx" ON "dependencias_contacto_sedes_telefonos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_sedes_telefonos_parent_id_idx" ON "dependencias_contacto_sedes_telefonos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_sedes_correos_order_idx" ON "dependencias_contacto_sedes_correos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_sedes_correos_parent_id_idx" ON "dependencias_contacto_sedes_correos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_sedes_order_idx" ON "dependencias_contacto_sedes" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_sedes_parent_id_idx" ON "dependencias_contacto_sedes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "dependencias_contacto_slug_idx" ON "dependencias_contacto" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_updated_at_idx" ON "dependencias_contacto" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "dependencias_contacto_created_at_idx" ON "dependencias_contacto" USING btree ("created_at");
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dependencias_contacto_fk" FOREIGN KEY ("dependencias_contacto_id") REFERENCES "public"."dependencias_contacto"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_dependencias_contacto_id_idx" ON "payload_locked_documents_rels" USING btree ("dependencias_contacto_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.dependencias_contacto') IS NOT NULL AND EXISTS (SELECT 1 FROM "dependencias_contacto") THEN
      RAISE EXCEPTION 'dependencias_01 down: dependencias_contacto tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_dependencias_contacto_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_dependencias_contacto_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "dependencias_contacto_id";
  DROP TABLE IF EXISTS "dependencias_contacto_sedes_telefonos" CASCADE;
  DROP TABLE IF EXISTS "dependencias_contacto_sedes_correos" CASCADE;
  DROP TABLE IF EXISTS "dependencias_contacto_sedes" CASCADE;
  DROP TABLE IF EXISTS "dependencias_contacto" CASCADE;`)
}
