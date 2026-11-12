// GLO-GN-02: versiona los campos de revisión y aprobación del glosario guaraní.
// Qué hace: lleva a una base nueva o existente el estado de revisión, el superadmin aprobador,
// la fecha y el comentario editorial que exige el flujo antes de publicar una traducción.
// Amenaza: evita que producción dependa del `push` de desarrollo o que el portal publique una entrada
// sin trazabilidad de quién la aprobó.
// Límite: no aprueba filas ni cambia datos existentes; solo añade estructura idempotente.
import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_glosario_guarani_estado_revision" AS ENUM('pendiente', 'aprobado', 'rechazado');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  ALTER TABLE "glosario_guarani"
    ADD COLUMN IF NOT EXISTS "estado_revision" "enum_glosario_guarani_estado_revision" DEFAULT 'pendiente';
  ALTER TABLE "glosario_guarani"
    ADD COLUMN IF NOT EXISTS "aprobado_por_id" integer;
  ALTER TABLE "glosario_guarani"
    ADD COLUMN IF NOT EXISTS "fecha_aprobacion" timestamp(3) with time zone;
  ALTER TABLE "glosario_guarani"
    ADD COLUMN IF NOT EXISTS "comentario_revision" varchar;

  DO $$ BEGIN
    ALTER TABLE "glosario_guarani"
      ADD CONSTRAINT "glosario_guarani_aprobado_por_id_users_id_fk"
      FOREIGN KEY ("aprobado_por_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "glosario_guarani_estado_revision_idx"
    ON "glosario_guarani" USING btree ("estado_revision");
  CREATE INDEX IF NOT EXISTS "glosario_guarani_aprobado_por_idx"
    ON "glosario_guarani" USING btree ("aprobado_por_id");`)
}

/**
 * GLO-GN-02: no revierte la estructura automáticamente.
 * Amenaza: eliminar campos de aprobación puede dejar el CMS sin trazabilidad y romper el portal.
 * Límite: una reversión requiere respaldo y una decisión explícita de migración, fuera del despliegue normal.
 */
export async function down(_args: MigrateDownArgs): Promise<void> {
  // Migración deliberadamente solo hacia adelante; no se borran datos ni controles de publicación.
}
