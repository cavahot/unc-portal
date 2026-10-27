// DEP-03: autoría del contenido editorial (`createdBy`) en noticias y páginas.
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md (F3) | RDD-DEP-63 | reglas: DEP-07.
//
// Qué hace: añade la columna `created_by_id` (relación a `users`) a `noticias`, `paginas` y a sus tablas
// de versiones (`_noticias_v`, `_paginas_v`, columna `version_created_by_id`), con FK `ON DELETE set null`
// e índice. Nombres de columna, FK e índice siguen el patrón del baseline (`faculty_id`).
//
// Reglas de seguridad de esta migración:
//   - Solo hacia adelante y SIN tocar datos: la columna es NULLABLE, no hay valor por defecto ni
//     relleno. Las noticias heredadas quedan con autor nulo (no se infiere desde el texto libre
//     `author`). El relleno futuro es un script revisado aparte y NO forma parte de esta migración.
//   - Idempotente (IF NOT EXISTS / duplicate_object): se puede reaplicar sobre un esquema que ya
//     la tenga sin fallar.
//   - `down` NO hace nada destructivo (no borra columnas): deshacer autoría perdería información. El
//     `down` del baseline, protegido contra BD con filas, elimina las tablas completas.
// Nota: el SQL no se ha ejecutado contra Postgres (hipótesis H6 de la spec; requiere BD sintética autorizada).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "noticias" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
  ALTER TABLE "_noticias_v" ADD COLUMN IF NOT EXISTS "version_created_by_id" integer;
  ALTER TABLE "paginas" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
  ALTER TABLE "_paginas_v" ADD COLUMN IF NOT EXISTS "version_created_by_id" integer;
  DO $$ BEGIN
   ALTER TABLE "noticias" ADD CONSTRAINT "noticias_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
   ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
   ALTER TABLE "paginas" ADD CONSTRAINT "paginas_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
   ALTER TABLE "_paginas_v" ADD CONSTRAINT "_paginas_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  CREATE INDEX IF NOT EXISTS "noticias_created_by_idx" ON "noticias" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "_noticias_v_version_version_created_by_idx" ON "_noticias_v" USING btree ("version_created_by_id");
  CREATE INDEX IF NOT EXISTS "paginas_created_by_idx" ON "paginas" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "_paginas_v_version_version_created_by_idx" ON "_paginas_v" USING btree ("version_created_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Intencionalmente vacío: migración solo hacia adelante (DEP-07). Ver cabecera.
}
