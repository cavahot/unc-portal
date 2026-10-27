// LT-01: colección `linea-tiempo` (hitos de la sección «Línea de tiempo» de /historia).
// Spec: docs/specs/portal/LINEA-TIEMPO.md §3 y §7 | reglas: DEP-07.
//
// Qué hace: crea la tabla `linea_tiempo` (año, precisión de fecha, título, descripción, imagen → media, enlace,
// orden, publicado y las traducciones en/ptBR/gn aplanadas como columnas del grupo `traducciones`), sus índices
// y la FK a `media`, y añade `linea_tiempo_id` a `payload_locked_documents_rels` (bloqueo de edición del panel).
// El SQL lo generó `payload migrate:create` (mismos nombres que Payload, p. ej. `traducciones_pt_b_r_titulo`)
// sobre el snapshot de `20261024_140000_mlg_01_marco_legal_campos.json`, y se volvió idempotente a mano
// (el `prevId` del .json se encadenó a mano a ese snapshot: el generador lo dejó en ceros).
//
// Reglas de seguridad:
//   - `up` es aditivo e idempotente (IF NOT EXISTS y `duplicate_object`): se puede reaplicar sobre un esquema
//     creado por el push del CMS en dev; no borra ni reescribe filas.
//   - `down` SOLO quita lo que añadió `up` y se niega si `linea_tiempo` tiene filas: son hitos cargados por el
//     PO. El deploy nunca ejecuta `migrate:down`.
// Nota: no se ejecutó `payload migrate` sobre ninguna BD; el esquema equivalente lo aplicó el push del CMS en
// dev y el SQL se valida con pruebas estáticas (tests/unit/linea-tiempo-cms.spec.ts).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "linea_tiempo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"anio" numeric NOT NULL,
  	"etiqueta_fecha" varchar,
  	"titulo" varchar NOT NULL,
  	"descripcion" varchar NOT NULL,
  	"imagen_id" integer,
  	"enlace" varchar,
  	"orden" numeric DEFAULT 99,
  	"active" boolean DEFAULT true,
  	"traducciones_en_titulo" varchar,
  	"traducciones_en_descripcion" varchar,
  	"traducciones_pt_b_r_titulo" varchar,
  	"traducciones_pt_b_r_descripcion" varchar,
  	"traducciones_gn_titulo" varchar,
  	"traducciones_gn_descripcion" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "linea_tiempo_id" integer;
  DO $$ BEGIN
     ALTER TABLE "linea_tiempo" ADD CONSTRAINT "linea_tiempo_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "linea_tiempo_anio_idx" ON "linea_tiempo" USING btree ("anio");
  CREATE INDEX IF NOT EXISTS "linea_tiempo_imagen_idx" ON "linea_tiempo" USING btree ("imagen_id");
  CREATE INDEX IF NOT EXISTS "linea_tiempo_active_idx" ON "linea_tiempo" USING btree ("active");
  CREATE INDEX IF NOT EXISTS "linea_tiempo_updated_at_idx" ON "linea_tiempo" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "linea_tiempo_created_at_idx" ON "linea_tiempo" USING btree ("created_at");
  DO $$ BEGIN
     ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_linea_tiempo_fk" FOREIGN KEY ("linea_tiempo_id") REFERENCES "public"."linea_tiempo"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
     WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_linea_tiempo_id_idx" ON "payload_locked_documents_rels" USING btree ("linea_tiempo_id");`)
}

/**
 * LT-01: `down` seguro. Amenaza: un `migrate:down` accidental borraría los hitos cargados desde el panel.
 * Límite: no sustituye un pg_dump previo.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const exists = await db.execute(sql.raw(`SELECT to_regclass('public."linea_tiempo"') IS NOT NULL AS ok`))
  const existsRows = (exists as { rows?: Array<{ ok?: unknown }> }).rows ?? []
  if (existsRows[0]?.ok === true) {
    const res = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."linea_tiempo" LIMIT 1) s`))
    const rows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
    if (Number(rows[0]?.n ?? 0) > 0) {
      throw new Error(
        'LT-01: down rechazado, hay hitos en linea_tiempo. Haga un pg_dump verificado y vacíe la tabla de forma explícita.',
      )
    }
  }
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_linea_tiempo_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_linea_tiempo_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "linea_tiempo_id";
  DROP TABLE IF EXISTS "linea_tiempo" CASCADE;`)
}
