// DEP-SEC-01: columna `users.reset_password_requested_at` exigida por Payload >= 3.90 (cuentas con auth).
// Spec: docs/specs/security/DEP-SEC-01-actualizacion-dependencias.md (§2, §5) | RDD: changelog de Payload 3.90 y
// `payload generate:types` (solo `users` gana `resetPasswordRequestedAt`) | reglas: DEP-07.
//
// Qué hace: añade a `users` la marca de tiempo de la última solicitud de restablecimiento de contraseña.
// Payload la lee en cada consulta a `users`; sin la columna, el CMS de producción falla al leer usuarios (login incluido).
//
// Reglas de seguridad de esta migración:
//   - Columna NULLABLE, sin DEFAULT y sin relleno: las cuentas existentes conservan todos sus datos y quedan en NULL.
//   - Idempotente (ADD COLUMN IF NOT EXISTS): se puede reaplicar sobre un esquema que ya la tenga (p. ej. el de
//     desarrollo, que `push` ya actualizó) sin fallar.
//   - `down` NO hace nada: es migración solo hacia adelante (DEP-07). Quitar la columna rompería Payload >= 3.90
//     y no aporta seguridad; revertir se hace restaurando el respaldo previo al despliegue.
// `media._object_key` NO se añade: solo aplica a colecciones upload con `clientUploads`, que este CMS no usa
// (verificado en payload.config.ts y payload-types.ts).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Intencionalmente vacío: migración solo hacia adelante (DEP-07). Ver cabecera.
}
