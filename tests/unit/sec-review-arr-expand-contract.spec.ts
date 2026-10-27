// SEC-REVIEW (ARR-01): la migración arr_01 ya no renombra `activo` -> `active`; hace «expand» (añade `active`,
// copia los valores y deja `activo` intacto y tolerante). Amenaza: tras el deploy, si el gate de readiness falla y
// el workflow vuelve a la imagen previa (que consulta `activo`), un RENAME dejaría esas rutas en 500.
// Límite: prueba estática del texto; el comportamiento real se verificó a mano en una BD desechable (ver informe).
// El paso «contract» (DROP COLUMN activo) es una migración POSTERIOR, documentada en migrations/README.md.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const DIR = path.resolve(__dirname, '..', '..', 'apps/cms/src/migrations')
const SRC = readFileSync(path.join(DIR, '20261025_180000_arr_01_aranceles_rectorado.ts'), 'utf8')
const HEADER = SRC.split('import {')[0]
const UP = SRC.split('export async function up')[1].split('export async function down')[0]
const DOWN = SRC.split('export async function down')[1]
const README = readFileSync(path.join(DIR, 'README.md'), 'utf8')

describe('ARR-01: expand/contract de aranceles_rectorado.activo', () => {
  it('el up no renombra la columna', () => {
    expect(UP).not.toMatch(/RENAME COLUMN/i)
  })

  it('el up añade `active` si falta y copia los valores de `activo`', () => {
    expect(UP).toMatch(/ADD COLUMN IF NOT EXISTS "active" boolean/)
    expect(UP).toMatch(/UPDATE "aranceles_rectorado" SET "active" = "activo" WHERE "activo" IS NOT NULL/)
  })

  it('el backfill solo corre si `activo` existe', () => {
    const at = UP.indexOf('UPDATE "aranceles_rectorado" SET "active"')
    const guard = UP.slice(UP.lastIndexOf('DO $$', at), at)
    expect(guard).toMatch(/column_name = 'activo'/)
  })

  it('`activo` queda nullable y con DEFAULT true para el código nuevo, que ya no lo escribe', () => {
    expect(UP).toMatch(/ALTER COLUMN "activo" DROP NOT NULL/)
    expect(UP).toMatch(/ALTER COLUMN "activo" SET DEFAULT true/)
  })

  it('`active` queda con DEFAULT true y NOT NULL tras el backfill, y se indexa', () => {
    expect(UP).toMatch(/ALTER COLUMN "active" SET DEFAULT true/)
    expect(UP).toMatch(/UPDATE[\s\S]*ALTER COLUMN "active" SET NOT NULL|ALTER COLUMN "active" SET NOT NULL/)
    expect(UP).toContain('CREATE INDEX IF NOT EXISTS "aranceles_rectorado_active_idx"')
  })

  it('conserva grupo sin DEFAULT, el pre-chequeo de duplicados y el índice único', () => {
    expect(UP).toContain('ALTER COLUMN "grupo" DROP DEFAULT')
    expect(UP).toContain('HAVING count(*) > 1')
    expect(UP).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "concepto_grupo_idx"')
  })

  it('ni up ni down borran `activo`, tablas ni filas', () => {
    expect(UP).not.toMatch(/DROP\s+COLUMN\s+(IF EXISTS\s+)?"?activo"?/i)
    expect(DOWN).not.toMatch(/DROP\s+COLUMN\s+(IF EXISTS\s+)?"?activo"?/i)
    expect(UP).not.toMatch(/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
  })

  it('el down copia active -> activo y solo borra `active` si `activo` existe', () => {
    expect(DOWN).toMatch(/SET "activo" = "active"/)
    const dropAt = DOWN.search(/DROP COLUMN "active"/)
    expect(dropAt).toBeGreaterThan(-1)
    const guard = DOWN.slice(DOWN.lastIndexOf('DO $$', dropAt), dropAt)
    expect(guard).toMatch(/column_name = 'activo'/)
    expect(DOWN).not.toMatch(/RENAME COLUMN/i)
  })

  it('el encabezado explica expand/contract, el rollback y la migración posterior que borra `activo`', () => {
    expect(HEADER).toMatch(/expand/i)
    expect(HEADER).toMatch(/contract/i)
    expect(HEADER).toMatch(/rollback/i)
    expect(HEADER).toMatch(/migraci[oó]n posterior/i)
    expect(HEADER).toMatch(/activo/)
    expect(HEADER).toMatch(/snapshot/i)
  })

  it('el README documenta la migración contract pendiente y la ventana de rollback', () => {
    expect(README).toMatch(/contract/i)
    expect(README).toMatch(/aranceles_rectorado\.activo/)
    expect(README).toMatch(/no se replican|no se reflejan|no se copian/i)
  })
})
