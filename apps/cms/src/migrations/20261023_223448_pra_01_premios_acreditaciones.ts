// PRA-01 (fase CMS): colecciones `reconocimientos` y `acreditaciones` y campos nuevos de `facultades`.
// Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §3.5 y §11 | Evidencia: docs/research/evidence-register-premios.md | reglas: DEP-07.
//
// Qué hace: crea las tablas `reconocimientos`, `reconocimientos_ediciones` (array de ediciones) y
// `acreditaciones` con sus tipos enumerados, claves foráneas e índices; añade `siglas` y `logo_path` a
// `facultades`, y `reconocimientos_id` / `acreditaciones_id` a `payload_locked_documents_rels` (bloqueo de
// edición del panel). El SQL lo generó `payload migrate:create` (mismos nombres que Payload) sobre el
// snapshot de `20261023_150000_perf_db_indexes.json` y se volvió idempotente a mano.
//
// Reglas de seguridad de esta migración:
//   - `up` es aditivo: no borra ni modifica filas existentes. Usa IF NOT EXISTS y `duplicate_object`,
//     así que se puede reaplicar sobre un esquema que ya tenga las tablas (p. ej. creado por push en dev).
//   - `down` SOLO retira lo que añadió `up` y solo si `reconocimientos` y `acreditaciones` están vacías
//     (si tienen filas, lanza un error y no toca nada: son datos cargados por personas). Las columnas
//     `siglas` y `logo_path` de `facultades` se conservan a propósito: pueden tener datos y quitarlas
//     perdería información. El deploy automático nunca ejecuta `migrate:down` (DEP-07).
// Nota: el SQL de `up` se contrastó con la salida de `payload migrate:create`; su ejecución sobre Postgres
// solo se probó en la BD local de desarrollo (por push de esquema), no con `payload migrate` en una BD
// sintética vacía.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
     CREATE TYPE "public"."enum_reconocimientos_ediciones_distincion" AS ENUM('premio', 'premio-categoria', 'mencion-especial', 'reconocimiento', 'por-confirmar');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_acreditaciones_nivel" AS ENUM('grado', 'posgrado');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_acreditaciones_organismo" AS ENUM('aneaes', 'arcusur', 'otro');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     CREATE TYPE "public"."enum_acreditaciones_modelo" AS ENUM('modelo-nacional', 'arcusur', 'otro');
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE TABLE IF NOT EXISTS "reconocimientos_ediciones" (
    	"_order" integer NOT NULL,
    	"_parent_id" integer NOT NULL,
    	"id" varchar PRIMARY KEY NOT NULL,
    	"anio" numeric NOT NULL,
    	"distincion" "enum_reconocimientos_ediciones_distincion" NOT NULL,
    	"categoria" varchar,
    	"fuente_url" varchar NOT NULL,
    	"nota" varchar,
    	"verificado" boolean DEFAULT false
    );
  CREATE TABLE IF NOT EXISTS "reconocimientos" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"nombre" varchar NOT NULL,
    	"entidad" varchar NOT NULL,
    	"sitio_oficial" varchar,
    	"logo_path" varchar,
    	"logo_id" integer,
    	"logo_alt" varchar,
    	"nota" varchar,
    	"orden" numeric DEFAULT 0,
    	"active" boolean DEFAULT false,
    	"verificado" boolean DEFAULT false,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  CREATE TABLE IF NOT EXISTS "acreditaciones" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"programa" varchar NOT NULL,
    	"carrera_id" integer,
    	"facultad_id" integer,
    	"nivel" "enum_acreditaciones_nivel",
    	"sede" varchar,
    	"organismo" "enum_acreditaciones_organismo" DEFAULT 'aneaes' NOT NULL,
    	"modelo" "enum_acreditaciones_modelo",
    	"ciclo" varchar,
    	"resolucion" varchar,
    	"vigencia_desde" timestamp(3) with time zone,
    	"vigencia_hasta" timestamp(3) with time zone,
    	"fuente_url" varchar NOT NULL,
    	"nota" varchar,
    	"orden" numeric DEFAULT 0,
    	"active" boolean DEFAULT false,
    	"verificado" boolean DEFAULT false,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "siglas" varchar;
  ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "logo_path" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "reconocimientos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "acreditaciones_id" integer;
  DO $$ BEGIN
     ALTER TABLE "reconocimientos_ediciones" ADD CONSTRAINT "reconocimientos_ediciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reconocimientos"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     ALTER TABLE "reconocimientos" ADD CONSTRAINT "reconocimientos_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     ALTER TABLE "acreditaciones" ADD CONSTRAINT "acreditaciones_carrera_id_carreras_id_fk" FOREIGN KEY ("carrera_id") REFERENCES "public"."carreras"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     ALTER TABLE "acreditaciones" ADD CONSTRAINT "acreditaciones_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "reconocimientos_ediciones_order_idx" ON "reconocimientos_ediciones" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "reconocimientos_ediciones_parent_id_idx" ON "reconocimientos_ediciones" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "reconocimientos_logo_idx" ON "reconocimientos" USING btree ("logo_id");
  CREATE INDEX IF NOT EXISTS "reconocimientos_orden_idx" ON "reconocimientos" USING btree ("orden");
  CREATE INDEX IF NOT EXISTS "reconocimientos_active_idx" ON "reconocimientos" USING btree ("active");
  CREATE INDEX IF NOT EXISTS "reconocimientos_updated_at_idx" ON "reconocimientos" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "reconocimientos_created_at_idx" ON "reconocimientos" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "acreditaciones_carrera_idx" ON "acreditaciones" USING btree ("carrera_id");
  CREATE INDEX IF NOT EXISTS "acreditaciones_facultad_idx" ON "acreditaciones" USING btree ("facultad_id");
  CREATE INDEX IF NOT EXISTS "acreditaciones_orden_idx" ON "acreditaciones" USING btree ("orden");
  CREATE INDEX IF NOT EXISTS "acreditaciones_active_idx" ON "acreditaciones" USING btree ("active");
  CREATE INDEX IF NOT EXISTS "acreditaciones_updated_at_idx" ON "acreditaciones" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "acreditaciones_created_at_idx" ON "acreditaciones" USING btree ("created_at");
  DO $$ BEGIN
     ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reconocimientos_fk" FOREIGN KEY ("reconocimientos_id") REFERENCES "public"."reconocimientos"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
     ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_acreditaciones_fk" FOREIGN KEY ("acreditaciones_id") REFERENCES "public"."acreditaciones"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_reconocimientos_id_idx" ON "payload_locked_documents_rels" USING btree ("reconocimientos_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_acreditaciones_id_idx" ON "payload_locked_documents_rels" USING btree ("acreditaciones_id");`)
}

/**
 * PRA-01: `down` seguro. Amenaza: un `migrate:down` accidental borraría premios y acreditaciones ya
 * cargados por el PO. Límite: solo protege estas dos colecciones; no sustituye un pg_dump previo.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  const nonEmpty: string[] = []
  for (const table of ['reconocimientos', 'acreditaciones'] as const) {
    const exists = await db.execute(sql.raw(`SELECT to_regclass('public."${table}"') IS NOT NULL AS ok`))
    const existsRows = (exists as { rows?: Array<{ ok?: unknown }> }).rows ?? []
    if (existsRows[0]?.ok !== true) continue
    const res = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."${table}" LIMIT 1) s`))
    const resRows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
    if (Number(resRows[0]?.n ?? 0) > 0) nonEmpty.push(table)
  }
  if (nonEmpty.length > 0) {
    throw new Error(
      `PRA-01: down rechazado, hay filas en: ${nonEmpty.join(', ')}. Haga un pg_dump verificado y vacíe esas tablas de forma explícita.`,
    )
  }
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "reconocimientos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "acreditaciones_id";
  DROP TABLE IF EXISTS "reconocimientos_ediciones" CASCADE;
  DROP TABLE IF EXISTS "reconocimientos" CASCADE;
  DROP TABLE IF EXISTS "acreditaciones" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_reconocimientos_ediciones_distincion";
  DROP TYPE IF EXISTS "public"."enum_acreditaciones_nivel";
  DROP TYPE IF EXISTS "public"."enum_acreditaciones_organismo";
  DROP TYPE IF EXISTS "public"."enum_acreditaciones_modelo";`)
}
