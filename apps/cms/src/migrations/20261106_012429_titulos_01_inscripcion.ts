// TITULOS-01: crea el global `titulos-inscripcion` (contenido de /titulos editable desde el CMS).
// Qué hace: crea las tablas del global y de sus listas (`tipos`, `requisitos` de cada tipo y `pasos`), el enum de
// `acento` y la relación con `aranceles_rectorado`. Spec: docs/specs/portal/TITULOS.md §2.1.
// Por qué a mano: es el SQL de `migrate:create` vuelto idempotente (patrón del repo). Además alinea, sin tocar datos,
// dos índices de `ley5189`/`ley5282` que el generador quería renombrar por una deriva de TRANS-02 (solo metadatos).
// Amenaza que evita: un despliegue que falle a medias por repetir la migración, y un `down` que borre contenido
// editorial sin respaldo. Límite: solo hacia adelante; `down` se niega a correr si el global ya tiene contenido.
import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_titulos_inscripcion_tipos_acento" AS ENUM('verde', 'azul', 'violeta');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS "titulos_inscripcion" (
    "id" serial PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL,
    "unidad" varchar NOT NULL,
    "plazo_min_horas" numeric NOT NULL,
    "plazo_max_horas" numeric NOT NULL,
    "arancel_id" integer,
    "nota_cones_texto" varchar,
    "nota_cones_url" varchar,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  CREATE TABLE IF NOT EXISTS "titulos_inscripcion_tipos" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "slug" varchar NOT NULL,
    "etiqueta" varchar NOT NULL,
    "titulo" varchar NOT NULL,
    "subtitulo" varchar,
    "acento" "enum_titulos_inscripcion_tipos_acento" DEFAULT 'verde' NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "titulos_inscripcion_tipos_requisitos" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "texto" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "titulos_inscripcion_pasos" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "responsable" varchar NOT NULL,
    "descripcion" varchar NOT NULL
  );

  DO $$ BEGIN
    ALTER TABLE "titulos_inscripcion" ADD CONSTRAINT "titulos_inscripcion_arancel_id_aranceles_rectorado_id_fk"
      FOREIGN KEY ("arancel_id") REFERENCES "public"."aranceles_rectorado"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "titulos_inscripcion_tipos" ADD CONSTRAINT "titulos_inscripcion_tipos_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."titulos_inscripcion"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "titulos_inscripcion_tipos_requisitos" ADD CONSTRAINT "titulos_inscripcion_tipos_requisitos_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."titulos_inscripcion_tipos"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "titulos_inscripcion_pasos" ADD CONSTRAINT "titulos_inscripcion_pasos_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."titulos_inscripcion"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_arancel_idx" ON "titulos_inscripcion" USING btree ("arancel_id");
  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_tipos_order_idx" ON "titulos_inscripcion_tipos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_tipos_parent_id_idx" ON "titulos_inscripcion_tipos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_tipos_requisitos_order_idx" ON "titulos_inscripcion_tipos_requisitos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_tipos_requisitos_parent_id_idx" ON "titulos_inscripcion_tipos_requisitos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_pasos_order_idx" ON "titulos_inscripcion_pasos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "titulos_inscripcion_pasos_parent_id_idx" ON "titulos_inscripcion_pasos" USING btree ("_parent_id");

  -- Deriva ajena (TRANS-02): el esquema espera "<tabla>_item_idx". Se renombra solo si hace falta y sin fallar si
  -- ya está o si no existe ninguno de los dos (entonces se crea). Solo metadatos: no toca filas.
  DO $$ BEGIN
    IF to_regclass('public.ley5189_item_id_idx') IS NOT NULL AND to_regclass('public.ley5189_item_idx') IS NULL THEN
      ALTER INDEX "public"."ley5189_item_id_idx" RENAME TO "ley5189_item_idx";
    END IF;
    IF to_regclass('public.ley5282_item_id_idx') IS NOT NULL AND to_regclass('public.ley5282_item_idx') IS NULL THEN
      ALTER INDEX "public"."ley5282_item_id_idx" RENAME TO "ley5282_item_idx";
    END IF;
  END $$;
  CREATE INDEX IF NOT EXISTS "ley5189_item_idx" ON "ley5189" USING btree ("item_id");
  CREATE INDEX IF NOT EXISTS "ley5282_item_idx" ON "ley5282" USING btree ("item_id");`)
}

/**
 * TITULOS-01: `down` seguro. Se niega a correr si `titulos_inscripcion` ya tiene un documento (contenido editorial
 * del trámite) y, si está vacío o no existe, quita solo las tablas y el enum nuevos. No revierte los índices de
 * `ley5189`/`ley5282` (solo metadatos). Nunca se ejecuta en el despliegue automático.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.titulos_inscripcion') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM "titulos_inscripcion") THEN
        RAISE EXCEPTION 'titulos_01 down: titulos_inscripcion tiene contenido; revertir exige respaldo verificado y decisión explícita';
      END IF;
    END IF;
  END $$;
  DROP TABLE IF EXISTS "titulos_inscripcion_tipos_requisitos" CASCADE;
  DROP TABLE IF EXISTS "titulos_inscripcion_tipos" CASCADE;
  DROP TABLE IF EXISTS "titulos_inscripcion_pasos" CASCADE;
  DROP TABLE IF EXISTS "titulos_inscripcion" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_titulos_inscripcion_tipos_acento";`)
}
