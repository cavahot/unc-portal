import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * INST-08 (legales_01): crea los globals `politica-privacidad` y `declaracion-accesibilidad` (textos de /privacidad y
 * /accesibilidad) y activa la localización de contenido de Payload (es, en, pt-BR, gn) para sus campos localizados. Spec
 * docs/specs/portal/LEGALES.md §2.5.
 *
 * Qué toca fuera de los dos globals (generado por Payload al activar la localización): el tipo enumerado `_locales`, y en las
 * tablas de versiones de `noticias` y `paginas` (`_noticias_v`, `_paginas_v`) las columnas nulas `snapshot` y
 * `published_locale` (con sus índices y enumerados). Son columnas NUEVAS y NULAS: no leen ni cambian filas existentes y las
 * consultas actuales no las usan.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`IF NOT EXISTS` y bloques `DO $$` con
 * `duplicate_object`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo hacia adelante.
 *
 * Amenaza que evita el `down`: borrar los textos legales que la institución ya cargó (o valores de las columnas de versiones).
 * Se niega a correr si alguno de los dos globals tiene filas o si esas columnas tienen datos; revertir con datos exige
 * respaldo verificado y una decisión explícita.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."_locales" AS ENUM('es', 'en', 'pt-BR', 'gn');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum__noticias_v_published_locale" AS ENUM('es', 'en', 'pt-BR', 'gn');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum__paginas_v_published_locale" AS ENUM('es', 'en', 'pt-BR', 'gn');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS "politica_privacidad_secciones" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "contenido" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "politica_privacidad" (
    "id" serial PRIMARY KEY NOT NULL,
    "ultima_actualizacion" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  CREATE TABLE IF NOT EXISTS "declaracion_accesibilidad_caracteristicas" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "declaracion_accesibilidad" (
    "id" serial PRIMARY KEY NOT NULL,
    "correo_contacto" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  CREATE TABLE IF NOT EXISTS "declaracion_accesibilidad_locales" (
    "descripcion" varchar NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" integer NOT NULL
  );

  ALTER TABLE "_noticias_v" ADD COLUMN IF NOT EXISTS "snapshot" boolean;
  ALTER TABLE "_noticias_v" ADD COLUMN IF NOT EXISTS "published_locale" "enum__noticias_v_published_locale";
  ALTER TABLE "_paginas_v" ADD COLUMN IF NOT EXISTS "snapshot" boolean;
  ALTER TABLE "_paginas_v" ADD COLUMN IF NOT EXISTS "published_locale" "enum__paginas_v_published_locale";
  DO $$ BEGIN
    ALTER TABLE "politica_privacidad_secciones" ADD CONSTRAINT "politica_privacidad_secciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."politica_privacidad"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "declaracion_accesibilidad_caracteristicas" ADD CONSTRAINT "declaracion_accesibilidad_caracteristicas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."declaracion_accesibilidad"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "declaracion_accesibilidad_locales" ADD CONSTRAINT "declaracion_accesibilidad_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."declaracion_accesibilidad"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "politica_privacidad_secciones_order_idx" ON "politica_privacidad_secciones" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "politica_privacidad_secciones_parent_id_idx" ON "politica_privacidad_secciones" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "politica_privacidad_secciones_locale_idx" ON "politica_privacidad_secciones" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "declaracion_accesibilidad_caracteristicas_order_idx" ON "declaracion_accesibilidad_caracteristicas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "declaracion_accesibilidad_caracteristicas_parent_id_idx" ON "declaracion_accesibilidad_caracteristicas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "declaracion_accesibilidad_caracteristicas_locale_idx" ON "declaracion_accesibilidad_caracteristicas" USING btree ("_locale");
  CREATE UNIQUE INDEX IF NOT EXISTS "declaracion_accesibilidad_locales_locale_parent_id_unique" ON "declaracion_accesibilidad_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX IF NOT EXISTS "declaracion_accesibilidad_locales_parent_id_idx" ON "declaracion_accesibilidad_locales" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_noticias_v_snapshot_idx" ON "_noticias_v" USING btree ("snapshot");
  CREATE INDEX IF NOT EXISTS "_noticias_v_published_locale_idx" ON "_noticias_v" USING btree ("published_locale");
  CREATE INDEX IF NOT EXISTS "_paginas_v_snapshot_idx" ON "_paginas_v" USING btree ("snapshot");
  CREATE INDEX IF NOT EXISTS "_paginas_v_published_locale_idx" ON "_paginas_v" USING btree ("published_locale");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.politica_privacidad') IS NOT NULL AND EXISTS (SELECT 1 FROM "politica_privacidad") THEN
      RAISE EXCEPTION 'legales_01 down: politica_privacidad tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
    IF to_regclass('public.declaracion_accesibilidad') IS NOT NULL AND EXISTS (SELECT 1 FROM "declaracion_accesibilidad") THEN
      RAISE EXCEPTION 'legales_01 down: declaracion_accesibilidad tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
    IF to_regclass('public._noticias_v') IS NOT NULL AND EXISTS (SELECT 1 FROM "_noticias_v" WHERE "snapshot" IS NOT NULL OR "published_locale" IS NOT NULL) THEN
      RAISE EXCEPTION 'legales_01 down: _noticias_v tiene datos en snapshot o published_locale; revertir exige respaldo verificado y decisión explícita';
    END IF;
    IF to_regclass('public._paginas_v') IS NOT NULL AND EXISTS (SELECT 1 FROM "_paginas_v" WHERE "snapshot" IS NOT NULL OR "published_locale" IS NOT NULL) THEN
      RAISE EXCEPTION 'legales_01 down: _paginas_v tiene datos en snapshot o published_locale; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
  DROP TABLE IF EXISTS "politica_privacidad_secciones" CASCADE;
  DROP TABLE IF EXISTS "politica_privacidad" CASCADE;
  DROP TABLE IF EXISTS "declaracion_accesibilidad_caracteristicas" CASCADE;
  DROP TABLE IF EXISTS "declaracion_accesibilidad_locales" CASCADE;
  DROP TABLE IF EXISTS "declaracion_accesibilidad" CASCADE;
  DROP INDEX IF EXISTS "_noticias_v_snapshot_idx";
  DROP INDEX IF EXISTS "_noticias_v_published_locale_idx";
  DROP INDEX IF EXISTS "_paginas_v_snapshot_idx";
  DROP INDEX IF EXISTS "_paginas_v_published_locale_idx";
  ALTER TABLE "_noticias_v" DROP COLUMN IF EXISTS "snapshot";
  ALTER TABLE "_noticias_v" DROP COLUMN IF EXISTS "published_locale";
  ALTER TABLE "_paginas_v" DROP COLUMN IF EXISTS "snapshot";
  ALTER TABLE "_paginas_v" DROP COLUMN IF EXISTS "published_locale";
  DROP TYPE IF EXISTS "public"."_locales";
  DROP TYPE IF EXISTS "public"."enum__noticias_v_published_locale";
  DROP TYPE IF EXISTS "public"."enum__paginas_v_published_locale";`)
}
