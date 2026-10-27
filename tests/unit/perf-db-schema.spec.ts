// PERF-DB (puntos 1 y 6): tope de versiones e índices que faltaban.
// Amenazas: (1) Payload guarda 100 versiones completas (JSON Lexical) por documento por defecto, así que
// el almacenamiento crece sin tope; (6) la portada filtra por `featured` y el log de auditoría se ordena
// por `fechaHora` sin índice, por lo que el coste crece con la tabla.
// Límite: contrato sobre la configuración, el SQL de la migración y su snapshot; el SQL no se ejecuta
// contra Postgres (requiere BD sintética autorizada) y el índice compuesto (_status, publishedAt) queda fuera.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// Mocks como en cms-active-read-access.spec.ts: las colecciones importan hooks con efectos; no se usa DB ni red.
vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {},
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({
  revalidatePortalTag: vi.fn(),
}))

import { Noticias } from '../../apps/cms/src/collections/Noticias'
import { Paginas } from '../../apps/cms/src/collections/Paginas'
import { Auditoria } from '../../apps/cms/src/collections/Auditoria'
import { down as perfDown } from '../../apps/cms/src/migrations/20261023_150000_perf_db_indexes'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261022_134500_dep_03_created_by'
const NAME = '20261023_150000_perf_db_indexes'

const INDEXES = [
  { table: 'noticias', idx: 'noticias_featured_idx', column: 'featured' },
  { table: '_noticias_v', idx: '_noticias_v_version_version_featured_idx', column: 'version_featured' },
  { table: 'auditoria', idx: 'auditoria_fecha_hora_idx', column: 'fecha_hora' },
]

const field = (fields: readonly unknown[], name: string) =>
  (fields as Array<{ name?: string; index?: boolean }>).find((f) => f.name === name)

describe('PERF-DB 1: tope explícito de versiones', () => {
  it.each([
    ['noticias', Noticias],
    ['paginas', Paginas],
  ])('%s conserva drafts y limita maxPerDoc a 10', (_n, collection) => {
    expect(collection.versions).toMatchObject({ drafts: true, maxPerDoc: 10 })
  })
})

describe('PERF-DB 6: índices de campo', () => {
  it('Noticias.featured e Auditoria.fechaHora tienen index: true', () => {
    expect(field(Noticias.fields, 'featured')?.index).toBe(true)
    expect(field(Auditoria.fields, 'fechaHora')?.index).toBe(true)
  })
})

describe('PERF-DB 6: migración de índices', () => {
  it('existe, va después de dep_03 y está registrada en index.ts con su snapshot', () => {
    expect(NAME > PREVIOUS).toBe(true)
    expect(readdirSync(DIR)).toContain(`${NAME}.ts`)
    expect(readdirSync(DIR)).toContain(`${NAME}.json`)
    const index = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
    expect(index).toContain(`name: '${NAME}'`)
  })

  it('crea los índices con IF NOT EXISTS y los nombres que genera Payload', () => {
    const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
    for (const i of INDEXES) {
      expect(src).toContain(`CREATE INDEX IF NOT EXISTS "${i.idx}" ON "${i.table}" USING btree ("${i.column}")`)
    }
  })

  it('solo hacia adelante: sin DROP/ALTER/datos y down vacío', async () => {
    const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bDROP\b|\bALTER\b|\bNOT NULL\b|\b(DELETE\s+FROM|UPDATE\s+"|TRUNCATE)\b/i)
    const executed: unknown[] = []
    await perfDown({ db: { execute: async (q: unknown) => executed.push(q) } } as never)
    expect(executed).toEqual([])
  })

  it('el snapshot encadena con dep_03 y solo añade esos tres índices', () => {
    const snap = JSON.parse(readFileSync(resolve(DIR, `${NAME}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${PREVIOUS}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    for (const i of INDEXES) {
      const table = snap.tables[`public.${i.table}`]
      expect(table.indexes[i.idx], i.idx).toMatchObject({ name: i.idx, isUnique: false, method: 'btree' })
      expect(table.indexes[i.idx].columns[0]).toMatchObject({ expression: i.column })
      const before = prev.tables[`public.${i.table}`]
      expect(Object.keys(table.indexes).length).toBe(Object.keys(before.indexes).length + 1)
    }
    expect(Object.keys(snap.tables)).toEqual(Object.keys(prev.tables))
  })
})
