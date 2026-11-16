import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * INST-07 (calendario_01): crea la colección `calendario-academico` (fechas de /calendario-academico) y su lista
 * `calendario_academico_entradas`, los dos tipos enumerados (`tipo` del bloque y `evento` de cada entrada) y la columna de
 * bloqueo en `payload_locked_documents_rels`. Spec docs/specs/portal/CALENDARIO.md §2.3.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`IF NOT EXISTS` y bloques `DO $$` con
 * `duplicate_object`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo hacia adelante:
 * únicamente objetos nuevos, sin tocar ni leer filas existentes.
 *
 * Amenaza que evita el `down`: borrar las fechas que Secretaría ya cargó. Se niega a correr si `calendario_academico` tiene
 * filas; revertir con datos exige respaldo verificado y una decisión explícita.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_calendario_academico_entradas_evento" AS ENUM('inicio-clases', 'inscripcion-tardia', 'parciales-1', 'parciales-2', 'cierre-semestre', 'otro');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_calendario_academico_tipo" AS ENUM('semestre', 'examenes');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS "calendario_academico_entradas" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "evento" "enum_calendario_academico_entradas_evento",
    "descripcion" varchar,
    "inicio" timestamp(3) with time zone NOT NULL,
    "fin" timestamp(3) with time zone
  );

  CREATE TABLE IF NOT EXISTS "calendario_academico" (
    "id" serial PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "tipo" "enum_calendario_academico_tipo" DEFAULT 'semestre' NOT NULL,
    "anio" numeric NOT NULL,
    "orden" numeric DEFAULT 99,
    "activa" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "calendario_academico_id" integer;
  DO $$ BEGIN
    ALTER TABLE "calendario_academico_entradas" ADD CONSTRAINT "calendario_academico_entradas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."calendario_academico"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "calendario_academico_entradas_order_idx" ON "calendario_academico_entradas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "calendario_academico_entradas_parent_id_idx" ON "calendario_academico_entradas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "calendario_academico_updated_at_idx" ON "calendario_academico" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "calendario_academico_created_at_idx" ON "calendario_academico" USING btree ("created_at");
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_calendario_academico_fk" FOREIGN KEY ("calendario_academico_id") REFERENCES "public"."calendario_academico"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_calendario_academico_id_idx" ON "payload_locked_documents_rels" USING btree ("calendario_academico_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.calendario_academico') IS NOT NULL AND EXISTS (SELECT 1 FROM "calendario_academico") THEN
      RAISE EXCEPTION 'calendario_01 down: calendario_academico tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_calendario_academico_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_calendario_academico_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "calendario_academico_id";
  DROP TABLE IF EXISTS "calendario_academico_entradas" CASCADE;
  DROP TABLE IF EXISTS "calendario_academico" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_calendario_academico_entradas_evento";
  DROP TYPE IF EXISTS "public"."enum_calendario_academico_tipo";`)
}
