// ARR-01: `aranceles_rectorado` — `activo` pasa a `active`, `grupo` sin valor por defecto, índice de `active` e
// índice único `concepto_grupo_idx`. Spec: docs/specs/portal/ARANCELES-RECTORADO.md §3 | reglas: DEP-07.
//
// Qué hace y por qué:
//   - Renombra `activo` -> `active` para reutilizar `readActiveOrInstitutional` (SEC-10), que filtra por `active`.
//     Solo si existe `activo` y todavía no existe `active` (idempotente; no toca las filas).
//   - Quita el DEFAULT 'venta' de `grupo`: un valor por defecto archivaba en silencio un arancel en un grupo.
//   - `aranceles_rectorado_active_idx`: la lectura pública siempre filtra por `active`.
//   - `concepto_grupo_idx` (único): un concepto no se repite dentro de un grupo. Nombre igual al que genera Payload
//     para `indexes: [{ fields: ['concepto', 'grupo'], unique: true }]`. Si ya hubiera duplicados, el CREATE falla
//     y la migración se detiene sin cambios parciales en ese índice: hay que resolverlos a mano primero.
// Escrita a mano (patrón de CNV-01) sobre el snapshot de `20261024_230000_cnv_01_convenios_campos.json`.
// Nota: en dev local el mismo SQL se aplicó a la BD antes de cambiar la colección (para que el push del CMS no
// tuviera que resolver el renombrado de forma interactiva); no se ejecutó `payload migrate` sobre ninguna BD.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'activo')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'active') THEN
      ALTER TABLE "aranceles_rectorado" RENAME COLUMN "activo" TO "active";
    END IF;
  END $$;
  ALTER TABLE "aranceles_rectorado" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;
  ALTER TABLE "aranceles_rectorado" ALTER COLUMN "grupo" DROP DEFAULT;
  CREATE INDEX IF NOT EXISTS "aranceles_rectorado_active_idx" ON "aranceles_rectorado" USING btree ("active");
  -- ARR-01 (SEC-REVIEW): pre-chequeo de duplicados. Amenaza: el CREATE UNIQUE INDEX fallaría con un error críptico a
  -- mitad del despliegue si la tabla ya tiene filas repetidas. Solo corre si el índice aún no existe y la tabla y
  -- las columnas existen; el mensaje nombra tabla e índice y nunca incluye valores de filas (pueden ser datos del PO).
  DO $$ BEGIN
    IF to_regclass('public."concepto_grupo_idx"') IS NULL
       AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name IN ('concepto', 'grupo')) = 2 THEN
      IF EXISTS (SELECT 1 FROM (SELECT 1 FROM "aranceles_rectorado" WHERE "concepto" IS NOT NULL AND "grupo" IS NOT NULL GROUP BY "concepto","grupo" HAVING count(*) > 1 LIMIT 1) AS dup) THEN
        RAISE EXCEPTION 'ARR-01: la tabla aranceles_rectorado tiene filas duplicadas en (concepto, grupo) y no se puede crear el indice unico concepto_grupo_idx. Deduplique esas filas antes de migrar.';
      END IF;
    END IF;
  END $$;
  CREATE UNIQUE INDEX IF NOT EXISTS "concepto_grupo_idx" ON "aranceles_rectorado" USING btree ("concepto","grupo");`)
}

/**
 * ARR-01: `down` reversible sin pérdida de datos: renombra `active` -> `activo`, quita los índices nuevos y repone
 * el DEFAULT de `grupo`. No borra filas. El deploy nunca ejecuta `migrate:down`. Límite: el código de la colección
 * de este cambio deja de funcionar tras el down (espera `active`); revertir también el código.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "concepto_grupo_idx";
  DROP INDEX IF EXISTS "aranceles_rectorado_active_idx";
  ALTER TABLE "aranceles_rectorado" ALTER COLUMN "grupo" SET DEFAULT 'venta';
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'active')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'activo') THEN
      ALTER TABLE "aranceles_rectorado" RENAME COLUMN "active" TO "activo";
    END IF;
  END $$;`)
}
