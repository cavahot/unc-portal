// INST-01: crea los globals `informacion-publica` y `institucional` (contenido de /informacion-publica y del hub
// /institucional editable desde el CMS). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1 y §2.2.
// Qué hace: crea las tablas de cada global y de sus listas (vías, datos requeridos, datos clave, secciones y valores)
// y el enum de destinos de las secciones. Solo tablas nuevas: no toca tablas existentes.
// Por qué a mano: es el SQL de `migrate:create` vuelto idempotente (patrón del repo).
// Amenaza que evita: un despliegue que falle a medias por repetir la migración, y un `down` que borre contenido
// editorial sin respaldo. Límite: solo hacia adelante; `down` se niega a correr si algún global ya tiene contenido.
import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DO $$ BEGIN
    CREATE TYPE "public"."enum_institucional_secciones_destino" AS ENUM('historia', 'mision-vision-y-valores', 'autoridades', 'organigrama', 'marco-legal', 'aseguramiento-calidad', 'transparencia', 'informacion-publica');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS "informacion_publica_vias" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "slug" varchar NOT NULL,
    "etiqueta" varchar NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL,
    "destacada" boolean DEFAULT false,
    "accion_texto" varchar NOT NULL,
    "accion_url" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "informacion_publica_datos_requeridos" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "texto" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "informacion_publica" (
    "id" serial PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL,
    "ley_referencia" varchar NOT NULL,
    "cita_texto" varchar,
    "cita_fuente" varchar,
    "portal_oficial_titulo" varchar,
    "portal_oficial_descripcion" varchar,
    "portal_oficial_url" varchar,
    "correo" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "institucional_sobre_datos" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "valor" varchar NOT NULL,
    "etiqueta" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "institucional_secciones" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "destino" "enum_institucional_secciones_destino" NOT NULL,
    "etiqueta" varchar NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL,
    "accion" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "institucional_valores" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "institucional" (
    "id" serial PRIMARY KEY NOT NULL,
    "titulo" varchar NOT NULL,
    "descripcion" varchar NOT NULL,
    "sobre_titulo" varchar NOT NULL,
    "sobre_texto" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );
  
  DO $$ BEGIN
    ALTER TABLE "informacion_publica_vias" ADD CONSTRAINT "informacion_publica_vias_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."informacion_publica"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "informacion_publica_datos_requeridos" ADD CONSTRAINT "informacion_publica_datos_requeridos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."informacion_publica"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "institucional_sobre_datos" ADD CONSTRAINT "institucional_sobre_datos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "institucional_secciones" ADD CONSTRAINT "institucional_secciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "institucional_valores" ADD CONSTRAINT "institucional_valores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "informacion_publica_vias_order_idx" ON "informacion_publica_vias" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "informacion_publica_vias_parent_id_idx" ON "informacion_publica_vias" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "informacion_publica_datos_requeridos_order_idx" ON "informacion_publica_datos_requeridos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "informacion_publica_datos_requeridos_parent_id_idx" ON "informacion_publica_datos_requeridos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "institucional_sobre_datos_order_idx" ON "institucional_sobre_datos" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "institucional_sobre_datos_parent_id_idx" ON "institucional_sobre_datos" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "institucional_secciones_order_idx" ON "institucional_secciones" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "institucional_secciones_parent_id_idx" ON "institucional_secciones" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "institucional_valores_order_idx" ON "institucional_valores" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "institucional_valores_parent_id_idx" ON "institucional_valores" USING btree ("_parent_id");
`)
}

/**
 * INST-01: `down` seguro. Se niega a correr si `informacion_publica` o `institucional` ya tienen un documento
 * (contenido editorial) y, si están vacíos o no existen, quita solo las tablas y el enum nuevos.
 * Nunca se ejecuta en el despliegue automático.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.informacion_publica') IS NOT NULL AND EXISTS (SELECT 1 FROM "informacion_publica") THEN
      RAISE EXCEPTION 'transparencia_institucional_01 down: informacion_publica tiene contenido; revertir exige respaldo verificado y decisión explícita';
    END IF;
    IF to_regclass('public.institucional') IS NOT NULL AND EXISTS (SELECT 1 FROM "institucional") THEN
      RAISE EXCEPTION 'transparencia_institucional_01 down: institucional tiene contenido; revertir exige respaldo verificado y decisión explícita';
    END IF;
  END $$;
  DROP TABLE IF EXISTS "informacion_publica_vias" CASCADE;
  DROP TABLE IF EXISTS "informacion_publica_datos_requeridos" CASCADE;
  DROP TABLE IF EXISTS "informacion_publica" CASCADE;
  DROP TABLE IF EXISTS "institucional_sobre_datos" CASCADE;
  DROP TABLE IF EXISTS "institucional_secciones" CASCADE;
  DROP TABLE IF EXISTS "institucional_valores" CASCADE;
  DROP TABLE IF EXISTS "institucional" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_institucional_secciones_destino";`)
}
