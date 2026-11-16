import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * PILARES-01 (pilares_academicos_01): crea el global `pilares-academicos` (tabla `pilares` por `dbName`): tarjetas de
 * Docencia, Investigación y Extensión de la portada y la página de cada pilar, con sus métricas y estadísticas.
 * Spec docs/specs/portal/PILARES-ACADEMICOS.md.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`IF NOT EXISTS` y bloques `DO $$` con
 * `duplicate_object`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo hacia adelante:
 * únicamente objetos nuevos, sin tocar ni leer filas existentes.
 *
 * Amenaza que evita el `down`: borrar el contenido que la institución ya cargó. Se niega a correr si `pilares` tiene filas.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_docencia_metricas_origen" AS ENUM('estadistica', 'manual');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_docencia_metricas_estadistica" AS ENUM('totalEstudiantes', 'totalDocentes', 'totalEgresados', 'totalCarrerasAcreditadas', 'totalFacultades');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_docencia_pagina_estadisticas_origen" AS ENUM('estadistica', 'manual');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_docencia_pagina_estadisticas_estadistica" AS ENUM('totalEstudiantes', 'totalDocentes', 'totalEgresados', 'totalCarrerasAcreditadas', 'totalFacultades');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_investigacion_metricas_origen" AS ENUM('estadistica', 'manual');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_investigacion_metricas_estadistica" AS ENUM('totalEstudiantes', 'totalDocentes', 'totalEgresados', 'totalCarrerasAcreditadas', 'totalFacultades');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_investigacion_pagina_estadisticas_origen" AS ENUM('estadistica', 'manual');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_investigacion_pagina_estadisticas_estadistica" AS ENUM('totalEstudiantes', 'totalDocentes', 'totalEgresados', 'totalCarrerasAcreditadas', 'totalFacultades');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_extension_metricas_origen" AS ENUM('estadistica', 'manual');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_extension_metricas_estadistica" AS ENUM('totalEstudiantes', 'totalDocentes', 'totalEgresados', 'totalCarrerasAcreditadas', 'totalFacultades');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_extension_pagina_estadisticas_origen" AS ENUM('estadistica', 'manual');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_extension_pagina_estadisticas_estadistica" AS ENUM('totalEstudiantes', 'totalDocentes', 'totalEgresados', 'totalCarrerasAcreditadas', 'totalFacultades');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_docencia_icono" AS ENUM('birrete', 'matraz', 'personas');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_docencia_pagina_estado" AS ENUM('construccion', 'publicada');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_investigacion_icono" AS ENUM('birrete', 'matraz', 'personas');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_investigacion_pagina_estado" AS ENUM('construccion', 'publicada');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_extension_icono" AS ENUM('birrete', 'matraz', 'personas');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_pilares_extension_pagina_estado" AS ENUM('construccion', 'publicada');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS "pilares_docencia_metricas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origen" "enum_pilares_docencia_metricas_origen" DEFAULT 'estadistica' NOT NULL,
  	"estadistica" "enum_pilares_docencia_metricas_estadistica",
  	"valor" varchar,
  	"fuente" varchar,
  	"etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "pilares_docencia_pagina_estadisticas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origen" "enum_pilares_docencia_pagina_estadisticas_origen" DEFAULT 'estadistica' NOT NULL,
  	"estadistica" "enum_pilares_docencia_pagina_estadisticas_estadistica",
  	"valor" varchar,
  	"fuente" varchar,
  	"etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "pilares_investigacion_metricas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origen" "enum_pilares_investigacion_metricas_origen" DEFAULT 'estadistica' NOT NULL,
  	"estadistica" "enum_pilares_investigacion_metricas_estadistica",
  	"valor" varchar,
  	"fuente" varchar,
  	"etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "pilares_investigacion_pagina_estadisticas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origen" "enum_pilares_investigacion_pagina_estadisticas_origen" DEFAULT 'estadistica' NOT NULL,
  	"estadistica" "enum_pilares_investigacion_pagina_estadisticas_estadistica",
  	"valor" varchar,
  	"fuente" varchar,
  	"etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "pilares_extension_metricas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origen" "enum_pilares_extension_metricas_origen" DEFAULT 'estadistica' NOT NULL,
  	"estadistica" "enum_pilares_extension_metricas_estadistica",
  	"valor" varchar,
  	"fuente" varchar,
  	"etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "pilares_extension_pagina_estadisticas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"origen" "enum_pilares_extension_pagina_estadisticas_origen" DEFAULT 'estadistica' NOT NULL,
  	"estadistica" "enum_pilares_extension_pagina_estadisticas_estadistica",
  	"valor" varchar,
  	"fuente" varchar,
  	"etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "pilares" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"docencia_titulo" varchar NOT NULL,
  	"docencia_bajada" varchar,
  	"docencia_descripcion" varchar NOT NULL,
  	"docencia_icono" "enum_pilares_docencia_icono" DEFAULT 'birrete' NOT NULL,
  	"docencia_enlace_texto" varchar NOT NULL,
  	"docencia_pagina_estado" "enum_pilares_docencia_pagina_estado" DEFAULT 'construccion' NOT NULL,
  	"docencia_pagina_contenido" jsonb,
  	"investigacion_titulo" varchar NOT NULL,
  	"investigacion_bajada" varchar,
  	"investigacion_descripcion" varchar NOT NULL,
  	"investigacion_icono" "enum_pilares_investigacion_icono" DEFAULT 'matraz' NOT NULL,
  	"investigacion_enlace_texto" varchar NOT NULL,
  	"investigacion_pagina_estado" "enum_pilares_investigacion_pagina_estado" DEFAULT 'construccion' NOT NULL,
  	"investigacion_pagina_contenido" jsonb,
  	"extension_titulo" varchar NOT NULL,
  	"extension_bajada" varchar,
  	"extension_descripcion" varchar NOT NULL,
  	"extension_icono" "enum_pilares_extension_icono" DEFAULT 'personas' NOT NULL,
  	"extension_enlace_texto" varchar NOT NULL,
  	"extension_pagina_estado" "enum_pilares_extension_pagina_estado" DEFAULT 'construccion' NOT NULL,
  	"extension_pagina_contenido" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  DO $$ BEGIN
    ALTER TABLE "pilares_docencia_metricas" ADD CONSTRAINT "pilares_docencia_metricas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pilares"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "pilares_docencia_pagina_estadisticas" ADD CONSTRAINT "pilares_docencia_pagina_estadisticas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pilares"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "pilares_investigacion_metricas" ADD CONSTRAINT "pilares_investigacion_metricas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pilares"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "pilares_investigacion_pagina_estadisticas" ADD CONSTRAINT "pilares_investigacion_pagina_estadisticas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pilares"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "pilares_extension_metricas" ADD CONSTRAINT "pilares_extension_metricas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pilares"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "pilares_extension_pagina_estadisticas" ADD CONSTRAINT "pilares_extension_pagina_estadisticas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pilares"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "pilares_docencia_metricas_order_idx" ON "pilares_docencia_metricas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pilares_docencia_metricas_parent_id_idx" ON "pilares_docencia_metricas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pilares_docencia_pagina_estadisticas_order_idx" ON "pilares_docencia_pagina_estadisticas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pilares_docencia_pagina_estadisticas_parent_id_idx" ON "pilares_docencia_pagina_estadisticas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pilares_investigacion_metricas_order_idx" ON "pilares_investigacion_metricas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pilares_investigacion_metricas_parent_id_idx" ON "pilares_investigacion_metricas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pilares_investigacion_pagina_estadisticas_order_idx" ON "pilares_investigacion_pagina_estadisticas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pilares_investigacion_pagina_estadisticas_parent_id_idx" ON "pilares_investigacion_pagina_estadisticas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pilares_extension_metricas_order_idx" ON "pilares_extension_metricas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pilares_extension_metricas_parent_id_idx" ON "pilares_extension_metricas" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pilares_extension_pagina_estadisticas_order_idx" ON "pilares_extension_pagina_estadisticas" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pilares_extension_pagina_estadisticas_parent_id_idx" ON "pilares_extension_pagina_estadisticas" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.pilares') IS NOT NULL AND EXISTS (SELECT 1 FROM "pilares") THEN
      RAISE EXCEPTION 'pilares_academicos_01 down: pilares tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
   DROP TABLE IF EXISTS "pilares_docencia_metricas" CASCADE;
  DROP TABLE IF EXISTS "pilares_docencia_pagina_estadisticas" CASCADE;
  DROP TABLE IF EXISTS "pilares_investigacion_metricas" CASCADE;
  DROP TABLE IF EXISTS "pilares_investigacion_pagina_estadisticas" CASCADE;
  DROP TABLE IF EXISTS "pilares_extension_metricas" CASCADE;
  DROP TABLE IF EXISTS "pilares_extension_pagina_estadisticas" CASCADE;
  DROP TABLE IF EXISTS "pilares" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_pilares_docencia_metricas_origen";
  DROP TYPE IF EXISTS "public"."enum_pilares_docencia_metricas_estadistica";
  DROP TYPE IF EXISTS "public"."enum_pilares_docencia_pagina_estadisticas_origen";
  DROP TYPE IF EXISTS "public"."enum_pilares_docencia_pagina_estadisticas_estadistica";
  DROP TYPE IF EXISTS "public"."enum_pilares_investigacion_metricas_origen";
  DROP TYPE IF EXISTS "public"."enum_pilares_investigacion_metricas_estadistica";
  DROP TYPE IF EXISTS "public"."enum_pilares_investigacion_pagina_estadisticas_origen";
  DROP TYPE IF EXISTS "public"."enum_pilares_investigacion_pagina_estadisticas_estadistica";
  DROP TYPE IF EXISTS "public"."enum_pilares_extension_metricas_origen";
  DROP TYPE IF EXISTS "public"."enum_pilares_extension_metricas_estadistica";
  DROP TYPE IF EXISTS "public"."enum_pilares_extension_pagina_estadisticas_origen";
  DROP TYPE IF EXISTS "public"."enum_pilares_extension_pagina_estadisticas_estadistica";
  DROP TYPE IF EXISTS "public"."enum_pilares_docencia_icono";
  DROP TYPE IF EXISTS "public"."enum_pilares_docencia_pagina_estado";
  DROP TYPE IF EXISTS "public"."enum_pilares_investigacion_icono";
  DROP TYPE IF EXISTS "public"."enum_pilares_investigacion_pagina_estado";
  DROP TYPE IF EXISTS "public"."enum_pilares_extension_icono";
  DROP TYPE IF EXISTS "public"."enum_pilares_extension_pagina_estado";`)
}
