import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * INST-11 (legalizaciones_01): crea el global `legalizaciones` (contenido de /legalizaciones editable desde el CMS): las
 * tablas del global y de sus listas (`tipos`, `requisitos` de cada tipo y `pasos`), el enumerado de `acento` y la relación
 * con `aranceles_rectorado`. Spec docs/specs/portal/LEGALIZACIONES.md §2.2.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`IF NOT EXISTS` y bloques `DO $$` con
 * `duplicate_object`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo hacia adelante:
 * únicamente objetos nuevos, sin tocar ni leer filas existentes.
 *
 * Amenaza que evita el `down`: borrar el contenido que la institución ya cargó. Se niega a correr si `legalizaciones` tiene
 * filas; revertir con datos exige respaldo verificado y una decisión explícita.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_legalizaciones_tipos_acento" AS ENUM('verde', 'azul', 'violeta');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS "legalizaciones_tipos_requisitos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "legalizaciones_tipos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"etiqueta" varchar NOT NULL,
  	"titulo" varchar NOT NULL,
  	"subtitulo" varchar,
  	"acento" "enum_legalizaciones_tipos_acento" DEFAULT 'verde' NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "legalizaciones_pasos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"responsable" varchar NOT NULL,
  	"descripcion" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "legalizaciones" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"descripcion" varchar NOT NULL,
  	"unidad" varchar NOT NULL,
  	"plazo_min_horas" numeric NOT NULL,
  	"plazo_max_horas" numeric NOT NULL,
  	"arancel_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  DO $$ BEGIN
    ALTER TABLE "legalizaciones_tipos_requisitos" ADD CONSTRAINT "legalizaciones_tipos_requisitos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legalizaciones_tipos"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    ALTER TABLE "legalizaciones_tipos" ADD CONSTRAINT "legalizaciones_tipos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legalizaciones"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    ALTER TABLE "legalizaciones_pasos" ADD CONSTRAINT "legalizaciones_pasos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legalizaciones"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    ALTER TABLE "legalizaciones" ADD CONSTRAINT "legalizaciones_arancel_id_aranceles_rectorado_id_fk" FOREIGN KEY ("arancel_id") REFERENCES "public"."aranceles_rectorado"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "legalizaciones_tipos_requisitos_order_idx" ON "legalizaciones_tipos_requisitos" USING btree ("_order");

  CREATE INDEX IF NOT EXISTS "legalizaciones_tipos_requisitos_parent_id_idx" ON "legalizaciones_tipos_requisitos" USING btree ("_parent_id");

  CREATE INDEX IF NOT EXISTS "legalizaciones_tipos_order_idx" ON "legalizaciones_tipos" USING btree ("_order");

  CREATE INDEX IF NOT EXISTS "legalizaciones_tipos_parent_id_idx" ON "legalizaciones_tipos" USING btree ("_parent_id");

  CREATE INDEX IF NOT EXISTS "legalizaciones_pasos_order_idx" ON "legalizaciones_pasos" USING btree ("_order");

  CREATE INDEX IF NOT EXISTS "legalizaciones_pasos_parent_id_idx" ON "legalizaciones_pasos" USING btree ("_parent_id");

  CREATE INDEX IF NOT EXISTS "legalizaciones_arancel_idx" ON "legalizaciones" USING btree ("arancel_id");;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.legalizaciones') IS NOT NULL AND EXISTS (SELECT 1 FROM "legalizaciones") THEN
      RAISE EXCEPTION 'legalizaciones_01 down: legalizaciones tiene filas; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
  DROP TABLE IF EXISTS "legalizaciones_tipos_requisitos" CASCADE;
  DROP TABLE IF EXISTS "legalizaciones_tipos" CASCADE;
  DROP TABLE IF EXISTS "legalizaciones_pasos" CASCADE;
  DROP TABLE IF EXISTS "legalizaciones" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_legalizaciones_tipos_acento";`)
}
