// PERF-DB: índices que faltaban para las consultas más frecuentes del portal y del panel.
// Evidencia: la portada filtra `where[featured][equals]=true` (lib/cms/queries/news.ts) y el log de
// auditoría se ordena por `fecha_hora`; ninguna de las dos columnas tenía índice en el baseline.
//
// Qué hace: crea `noticias_featured_idx` y su equivalente en la tabla de versiones
// (`_noticias_v_version_version_featured_idx`) y `auditoria_fecha_hora_idx`. Los nombres son los que
// Payload genera para `index: true` (patrón del baseline), de modo que `migrate:create` no produzca
// diferencias fantasma.
//
// Reglas de seguridad de esta migración:
//   - Solo hacia adelante y SIN tocar datos ni columnas: únicamente `CREATE INDEX IF NOT EXISTS`
//     (idempotente; se puede reaplicar sobre un esquema que ya los tenga).
//   - `down` NO hace nada: quitar un índice no pierde información y el deploy automático nunca ejecuta
//     `migrate:down` (DEP-07); retirarlo, si hiciera falta, sería una migración nueva.
// Límite: el índice compuesto (_status, published_at) no se incluye; el nombre de un índice compuesto
// lo decide Payload y debe generarse con `migrate:create` en una BD sintética.
// Nota: el SQL no se ha ejecutado contra Postgres (requiere BD sintética autorizada).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE INDEX IF NOT EXISTS "noticias_featured_idx" ON "noticias" USING btree ("featured");
  CREATE INDEX IF NOT EXISTS "_noticias_v_version_version_featured_idx" ON "_noticias_v" USING btree ("version_featured");
  CREATE INDEX IF NOT EXISTS "auditoria_fecha_hora_idx" ON "auditoria" USING btree ("fecha_hora");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Intencionalmente vacío: migración solo hacia adelante (DEP-07). Ver cabecera.
}
