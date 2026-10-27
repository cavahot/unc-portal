// ARR-01: `aranceles_rectorado` — añade `active` (copia de `activo`), `grupo` sin valor por defecto, índice de
// `active` e índice único `concepto_grupo_idx`. Spec: docs/specs/portal/ARANCELES-RECTORADO.md §3 | reglas: DEP-07.
//
// EXPAND / CONTRACT (SEC-REVIEW): esta migración es solo el paso «expand». NO renombra `activo`.
//   Amenaza: con un RENAME, si tras el deploy falla el gate de readiness y el workflow hace rollback de imagen
//   (la imagen previa consulta `activo`), esas rutas responderían 500. Con expand la imagen previa sigue
//   funcionando durante la ventana de rollback porque `activo` se conserva. Límite: lo que se edite con la imagen
//   nueva en `active` NO se replica a `activo` (la imagen previa vería el valor anterior).
//   Una migración POSTERIOR («contract», en un release siguiente, cuando ya no pueda volver ninguna imagen
//   vieja) debe hacer `DROP COLUMN activo`; ver apps/cms/src/migrations/README.md.
//   El snapshot .json NO cambia: refleja el esquema de la colección de Payload, que solo tiene `active`;
//   la columna legada `activo` es transitoria y vive fuera del snapshot.
//
// Qué hace y por qué:
//   - Añade `active` si falta y copia `activo` -> `active` (solo filas con `activo` no nulo y solo si `activo`
//     existe). `active` queda NOT NULL DEFAULT true, igual que el campo `checkbox` con defaultValue true.
//     Reutiliza `readActiveOrInstitutional` (SEC-10), que filtra por `active`.
//   - `activo` se conserva, pero pasa a nullable con DEFAULT true: el código nuevo ya no lo escribe y un INSERT
//     que solo fija `active` no debe fallar por NOT NULL.
//   - Idempotente en los cuatro estados: solo `activo` (producción), ambas, solo `active` (dev tras push), BD vacía.
//   - Quita el DEFAULT 'venta' de `grupo`: un valor por defecto archivaba en silencio un arancel en un grupo.
//   - `aranceles_rectorado_active_idx`: la lectura pública siempre filtra por `active`.
//   - `concepto_grupo_idx` (único): un concepto no se repite dentro de un grupo. Nombre igual al que genera Payload
//     para `indexes: [{ fields: ['concepto', 'grupo'], unique: true }]`. Si ya hubiera duplicados, el CREATE falla
//     y la migración se detiene sin cambios parciales en ese índice: hay que resolverlos a mano primero.
// Escrita a mano (patrón de CNV-01) sobre el snapshot de `20261024_230000_cnv_01_convenios_campos.json`.
// Nota: en dev local la BD ya tenía `active` (renombrada antes de este diseño, estado «solo active»); la migración
// la deja como está. Verificada en una BD desechable en los cuatro estados (ver informe de la tarea).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- EXPAND: añade \`active\` y copia \`activo\` -> \`active\` UNA sola vez (solo cuando \`active\` aún no existe), para que
  -- una re-ejecución no pise ediciones hechas después con la imagen nueva. \`activo\` no se toca aquí.
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'active') THEN
      ALTER TABLE "aranceles_rectorado" ADD COLUMN IF NOT EXISTS "active" boolean;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'activo') THEN
        UPDATE "aranceles_rectorado" SET "active" = "activo" WHERE "activo" IS NOT NULL;
      END IF;
    END IF;
  END $$;
  UPDATE "aranceles_rectorado" SET "active" = true WHERE "active" IS NULL;
  ALTER TABLE "aranceles_rectorado" ALTER COLUMN "active" SET DEFAULT true;
  ALTER TABLE "aranceles_rectorado" ALTER COLUMN "active" SET NOT NULL;
  -- \`activo\` legada: el código nuevo ya no la escribe; sin NOT NULL y con DEFAULT, sus INSERT no fallan.
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'activo') THEN
      ALTER TABLE "aranceles_rectorado" ALTER COLUMN "activo" DROP NOT NULL;
      ALTER TABLE "aranceles_rectorado" ALTER COLUMN "activo" SET DEFAULT true;
    END IF;
  END $$;
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
 * ARR-01: `down` sin pérdida de datos: asegura que `activo` exista y recibe la copia `active` -> `activo`, quita los
 * índices nuevos, repone el DEFAULT de `grupo` y borra `active` solo si `activo` existe (nunca deja la tabla sin
 * ninguna de las dos). No borra filas ni `activo`. El deploy nunca ejecuta `migrate:down`. Límite: el código de la
 * colección de este cambio deja de funcionar tras el down (espera `active`); revertir también el código.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "concepto_grupo_idx";
  DROP INDEX IF EXISTS "aranceles_rectorado_active_idx";
  ALTER TABLE "aranceles_rectorado" ALTER COLUMN "grupo" SET DEFAULT 'venta';
  -- Restaura la forma vieja: \`activo\` recibe los valores de \`active\` y solo entonces se borra \`active\`.
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'active') THEN
      ALTER TABLE "aranceles_rectorado" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT true;
      UPDATE "aranceles_rectorado" SET "activo" = "active" WHERE "active" IS NOT NULL;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aranceles_rectorado' AND column_name = 'activo') THEN
        ALTER TABLE "aranceles_rectorado" DROP COLUMN "active";
      END IF;
    END IF;
  END $$;`)
}
