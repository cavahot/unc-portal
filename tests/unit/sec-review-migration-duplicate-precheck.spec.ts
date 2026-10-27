// SEC-REVIEW: las migraciones que crean un índice ÚNICO sobre tablas que pueden tener datos deben comprobar
// duplicados ANTES y fallar con un mensaje legible. Amenaza: `CREATE UNIQUE INDEX` falla con un error críptico de
// Postgres a mitad del despliegue; el aviso previo nombra tabla e índice y pide deduplicar, sin mostrar filas
// (datos personales). Límite: prueba estática del texto SQL; el comportamiento real se verificó a mano en una BD
// desechable (ver informe de la tarea). trans_01/trans_02 no entran: `natural_key` se añade vacía (NULL) o la tabla es nueva.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const DIR = path.resolve(__dirname, '..', '..', 'apps/cms/src/migrations')

const CASES = [
  { file: '20261025_180000_arr_01_aranceles_rectorado.ts', index: 'concepto_grupo_idx', table: 'aranceles_rectorado', cols: ['concepto', 'grupo'] },
  { file: '20261025_190000_glo_gn_01_glosario_guarani.ts', index: 'terminoEs_fuente_idx', table: 'glosario_guarani', cols: ['termino_es', 'fuente'] },
  { file: '20261025_200000_fac_01_facultad_detalle.ts', index: 'facultad_grupo_concepto_idx', table: 'aranceles_facultad', cols: ['facultad_id', 'grupo', 'concepto'] },
]

describe.each(CASES)('pre-chequeo de duplicados: $file', ({ file, index, table, cols }) => {
  const up = readFileSync(path.join(DIR, file), 'utf8').split('export async function down')[0]
  const createAt = up.indexOf(`CREATE UNIQUE INDEX IF NOT EXISTS "${index}"`)
  const guardAt = up.indexOf('HAVING count(*) > 1')

  it('crea el índice único y el pre-chequeo aparece ANTES', () => {
    expect(createAt).toBeGreaterThan(-1)
    expect(guardAt).toBeGreaterThan(-1)
    expect(guardAt).toBeLessThan(createAt)
  })

  it('solo corre si existen la tabla y las columnas, y agrupa por las mismas columnas del índice', () => {
    const guard = up.slice(up.lastIndexOf('DO $$', guardAt), createAt)
    expect(guard).toContain('information_schema.columns')
    expect(guard).toContain(`'${table}'`)
    for (const c of cols) expect(guard).toContain(`"${c}"`)
    expect(guard).toMatch(/GROUP BY/)
    expect(guard).toMatch(/LIMIT 1/)
  })

  it('lanza una excepción en español que nombra tabla e índice y no expone datos de filas', () => {
    const guard = up.slice(up.lastIndexOf('DO $$', guardAt), createAt)
    expect(guard).toMatch(/RAISE EXCEPTION/)
    expect(guard).toContain(table)
    expect(guard).toContain(index)
    expect(guard).toMatch(/dedupli/i)
    // Solo cuenta/nombres de estructura: ninguna interpolación de valores de columnas en el mensaje.
    const msg = /RAISE EXCEPTION[^;]*;/.exec(guard)?.[0] ?? ''
    for (const c of cols) expect(msg).not.toMatch(new RegExp(`%[^']*${c}`))
  })
})
