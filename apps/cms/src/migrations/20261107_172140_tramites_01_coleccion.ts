import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * INST-05 (tramites_01): crea la colección `tramites` (requisitos de /tramites por facultad) y su lista `tramites_requisitos`,
 * y la columna de bloqueo en `payload_locked_documents_rels`. Spec docs/specs/portal/TRAMITES.md §2.3.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`IF NOT EXISTS` y bloques `DO $$` con
 * `duplicate_object`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo hacia adelante:
 * únicamente tablas nuevas, sin tocar ni leer filas existentes.
 *
 * Amenaza que evita el `down`: borrar los trámites que el equipo institucional ya cargó. Se niega a correr si `tramites`
 * tiene filas; revertir con datos exige respaldo verificado y una decisión explícita.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "tramites_requisitos" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "texto" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "tramites" (
    "id" serial PRIMARY KEY NOT NULL,
    "facultad_id" integer NOT NULL,
    "titulo" varchar NOT NULL,
    "etiqueta" varchar,
    "descripcion" varchar,
    "nota" varchar,
    "orden" numeric DEFAULT 99,
    "activa" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "tramites_id" integer;
  DO $$ BEGIN
    ALTER TABLE "tramites_requisitos" ADD CONSTRAINT "tramites_requisitos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tramites"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "tramites" ADD CONSTRAINT "tramites_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "tramites_requisitos_order_idx" ON "tramites_requisitos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "tramites_requisitos_parent_id_idx" ON "tramites_requisitos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "tramites_facultad_idx" ON "tramites" USING btree ("facultad_id");
  CREATE INDEX IF NOT EXISTS "tramites_updated_at_idx" ON "tramites" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tramites_created_at_idx" ON "tramites" USING btree ("created_at");
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tramites_fk" FOREIGN KEY ("tramites_id") REFERENCES "public"."tramites"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tramites_id_idx" ON "payload_locked_documents_rels" USING btree ("tramites_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.tramites') IS NOT NULL AND EXISTS (SELECT 1 FROM "tramites") THEN
      RAISE EXCEPTION 'tramites_01 down: tramites tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_tramites_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_tramites_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "tramites_id";
  DROP TABLE IF EXISTS "tramites_requisitos" CASCADE;
  DROP TABLE IF EXISTS "tramites" CASCADE;`)
}
