import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * GLO-GN-INST-01 (glosario_gn_institucional): responsables de las traducciones institucionales de la UNC.
 * Spec odd/tasks/glosario-gn-institucional.md (S1, S4, S5).
 *
 * Qué hace: agrega a `glosario_guarani` las columnas `traductor_nombre`, `traductor_cargo` y `revisor_nativo`
 * (texto, nulas). Son obligatorias para aprobar una glosa `institucional` (validación en el hook, no en la base).
 * Solo hacia adelante y sin tocar datos existentes; idempotente (`IF NOT EXISTS`) para no fallar sobre un esquema
 * creado por push en desarrollo.
 *
 * Amenaza que evita el `down`: borrar quién responde por una traducción publicada. Se niega a correr si alguna fila
 * tiene datos en esas columnas.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "glosario_guarani" ADD COLUMN IF NOT EXISTS "traductor_nombre" varchar;
  ALTER TABLE "glosario_guarani" ADD COLUMN IF NOT EXISTS "traductor_cargo" varchar;
  ALTER TABLE "glosario_guarani" ADD COLUMN IF NOT EXISTS "revisor_nativo" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'glosario_guarani' AND column_name = 'revisor_nativo'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM "glosario_guarani"
        WHERE "traductor_nombre" IS NOT NULL OR "traductor_cargo" IS NOT NULL OR "revisor_nativo" IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'glosario_gn_institucional down: hay traducciones con responsables cargados; revertir exige respaldo verificado y decisión explícita';
      END IF;
    END IF;
  END $$;
  ALTER TABLE "glosario_guarani" DROP COLUMN IF EXISTS "traductor_nombre";
  ALTER TABLE "glosario_guarani" DROP COLUMN IF EXISTS "traductor_cargo";
  ALTER TABLE "glosario_guarani" DROP COLUMN IF EXISTS "revisor_nativo";`)
}
