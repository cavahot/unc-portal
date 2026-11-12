import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * SEC-CUENTAS-01 (seguridad_cuentas_01): estado de la contraseña de las cuentas del CMS y acciones de auditoría nuevas.
 * Spec odd/tasks/seguridad-cuentas.md (T2: S1, S2, S4, S5, S6 y «Contrato servidor ↔ panel»).
 *
 * Qué hace: agrega a `users` las columnas `nombre`, `apellido` (diálogo de restablecimiento), `must_change_password`
 * (cambio obligatorio al ingresar), `password_changed_at` (vencimiento de 90 días) y `password_history` (hashes propios
 * de las últimas 5 contraseñas, jsonb oculto), y agrega `cambiar_clave` y `restablecer_clave` al enumerado de
 * `auditoria.accion`.
 *
 * Efecto sobre las cuentas existentes (decisión S4): quedan con `password_changed_at` NULL, que la política trata como
 * vencida, así que cada cuenta cambia su contraseña en su próximo ingreso. `must_change_password` nace en false.
 *
 * Por qué se editó a mano el SQL de `migrate:create`: se vuelve idempotente (`ADD VALUE IF NOT EXISTS`,
 * `ADD COLUMN IF NOT EXISTS`) para que reaplicarla sobre un esquema creado por push en desarrollo no falle. Es solo
 * hacia adelante: columnas nuevas y nulas (o con DEFAULT false), sin leer ni cambiar datos existentes.
 *
 * Amenaza que evita el `down`: perder el estado de seguridad de las cuentas o eventos de auditoría. Se niega a correr
 * si alguna cuenta ya tiene nombre, apellido, fecha de cambio, historial o cambio obligatorio marcado, o si la auditoría
 * tiene eventos `cambiar_clave` / `restablecer_clave` (al recrear el enumerado esas filas no podrían convertirse).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_auditoria_accion" ADD VALUE IF NOT EXISTS 'cambiar_clave';
  ALTER TYPE "public"."enum_auditoria_accion" ADD VALUE IF NOT EXISTS 'restablecer_clave';
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nombre" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apellido" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_history" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    -- IF anidado: la consulta sobre las columnas nuevas solo se planifica si existen (down repetido no falla).
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_changed_at'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM "users"
        WHERE "nombre" IS NOT NULL OR "apellido" IS NOT NULL OR "password_changed_at" IS NOT NULL
          OR "password_history" IS NOT NULL OR "must_change_password" IS TRUE
      ) THEN
        RAISE EXCEPTION 'seguridad_cuentas_01 down: users tiene datos de seguridad de cuentas; revertir exige respaldo verificado y decisión explícita';
      END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM "auditoria" WHERE "accion"::text IN ('cambiar_clave', 'restablecer_clave')) THEN
      RAISE EXCEPTION 'seguridad_cuentas_01 down: auditoria tiene eventos cambiar_clave/restablecer_clave; revertir los perdería';
    END IF;
  END $$;
  ALTER TABLE "auditoria" ALTER COLUMN "accion" SET DATA TYPE text;
  DROP TYPE "public"."enum_auditoria_accion";
  CREATE TYPE "public"."enum_auditoria_accion" AS ENUM('login', 'logout', 'crear', 'actualizar', 'eliminar', 'publicar', 'cambiar_rol', 'revisar', 'aprobar', 'rechazar', 'importar', 'revalidar');
  ALTER TABLE "auditoria" ALTER COLUMN "accion" SET DATA TYPE "public"."enum_auditoria_accion" USING "accion"::"public"."enum_auditoria_accion";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "nombre";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "apellido";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "must_change_password";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "password_changed_at";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "password_history";`)
}
