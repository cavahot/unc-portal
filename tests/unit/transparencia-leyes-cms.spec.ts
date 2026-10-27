// TRANS-01: colecciones `ley5189` y `ley5282` (spec docs/specs/portal/TRANSPARENCIA-LEYES.md §2.1, §3, §7).
// Amenazas: (1) lectura anónima de documentos retirados (SEC-10); (2) escritura por roles no institucionales;
// (3) enlaces javascript:/http:/hosts ajenos guardados desde el panel; (4) cambios sin rastro o sin refrescar el
// portal; (5) documentos duplicados por la misma clave natural; (6) migración no idempotente o destructiva;
// (7) lista de categorías del CMS distinta de la del portal.
// Límite: contratos con CMS simulado; no ejecuta Payload ni la BD.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {},
}))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => 'x' }))

import { Ley5189 } from '../../apps/cms/src/collections/Ley5189'
import { Ley5282 } from '../../apps/cms/src/collections/Ley5282'
import { buildNaturalKey, TRANSPARENCIA_ALLOWED_HOSTS } from '../../apps/cms/src/collections/transparenciaLey'
import { buildNaturalKey as loaderKey } from '../../scripts/seed-transparencia-leyes.mjs'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { ALLOWED_TRANSPARENCIA_HOSTS } from '@/lib/cms/transparenciaLeyes'
import { ALLOWED_CONVENIO_HOSTS } from '@/lib/cms/convenios'

type F = {
  name?: string
  type?: string
  required?: boolean
  unique?: boolean
  index?: boolean
  options?: Array<{ value: string; label: string }>
  validate?: (v: unknown) => unknown
  admin?: { description?: string; hidden?: boolean }
}
const CASES = [
  { ley: 'ley5189' as const, col: Ley5189 },
  { ley: 'ley5282' as const, col: Ley5282 },
]
const fieldsOf = (c: typeof Ley5189) => c.fields as F[]
const fieldOf = (c: typeof Ley5189, n: string) => fieldsOf(c).find((f) => f.name === n)

describe.each(CASES)('TRANS-01 $ley: acceso', ({ col }) => {
  it('lectura limitada a publicados (SEC-10) y escritura solo institucional', async () => {
    expect(col.access?.read).toBe(readActiveOrInstitutional)
    expect(col.access?.create).toBe(canWriteInstitutional)
    expect(col.access?.update).toBe(canWriteInstitutional)
    expect(col.access?.delete).toBe(canWriteInstitutional)
    const read = col.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'editor' } } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'superadmin' } } })).toBe(true)
  })
  it('anónimo y editor no pueden crear', async () => {
    const create = col.access?.create as (a: unknown) => unknown
    expect(await create({ req: { user: null } })).toBe(false)
    expect(await create({ req: { user: { role: 'editor' } } })).toBe(false)
  })
})

describe.each(CASES)('TRANS-01 $ley: campos', ({ col }) => {
  it('conserva los nombres existentes y agrega naturalKey oculto y único', () => {
    expect(fieldsOf(col).map((f) => f.name)).toEqual(
      expect.arrayContaining(['item', 'category', 'period', 'description', 'driveUrl', 'order', 'active', 'naturalKey']),
    )
    const k = fieldOf(col, 'naturalKey')
    expect(k?.unique).toBe(true)
    expect(k?.admin?.hidden).toBe(true)
  })
  // TRANS-02: las categorías ya no son un select fijo; la cobertura del ítem está en transparencia-items-cms.spec.ts.
  it('driveUrl obligatorio y validado (https + allowlist)', () => {
    expect([...TRANSPARENCIA_ALLOWED_HOSTS].sort()).toEqual([...ALLOWED_TRANSPARENCIA_HOSTS].sort())
    expect([...ALLOWED_TRANSPARENCIA_HOSTS].sort()).toEqual([...ALLOWED_CONVENIO_HOSTS].sort())
    const f = fieldOf(col, 'driveUrl')
    expect(f?.required).toBe(true)
    const v = f?.validate
    expect(typeof v).toBe('function')
    expect(v!('https://drive.google.com/file/d/abc/view')).toBe(true)
    expect(v!('https://docs.google.com/document/d/abc')).toBe(true)
    expect(v!('https://www.unc.edu.py/wp-content/x.pdf')).toBe(true)
    for (const bad of [
      'http://drive.google.com/x',
      'javascript:alert(1)',
      'https://evil.example/x',
      'https://drive.google.com.evil.example/x',
      'https://u:p@drive.google.com/x',
      '',
      null,
    ]) {
      expect(typeof v!(bad), String(bad)).toBe('string')
    }
  })
  it('panel en español con ayudas', () => {
    expect(col.admin?.group).toBe('Transparencia')
    for (const n of ['item', 'period', 'description', 'driveUrl', 'order', 'active']) {
      expect(fieldOf(col, n)?.admin?.description, n).toMatch(/\S{3,}/)
    }
  })
})

describe('TRANS-01: clave natural', () => {
  it('normaliza mayúsculas, acentos y espacios', () => {
    const a = buildNaturalKey({ category: 'nomina-personal', period: ' Enero  2024 ', description: 'Anexo Único' })
    const b = buildNaturalKey({ category: 'nomina-personal', period: 'enero 2024', description: 'anexo único' })
    expect(a).toBe(b)
  })
  it('el cargador calcula la misma clave que el CMS (si difirieran, duplicaría)', () => {
    for (const d of [
      { category: 'organigrama', period: ' Enero  2024', description: 'Anexo Único' },
      { category: 'item-8', period: '2023', description: undefined },
      { category: 'item-8', period: 'I Trimestre', description: '  ÑANDÚ  ' },
    ])
      expect(loaderKey(d)).toBe(buildNaturalKey(d))
  })
  it('otra descripción, período o categoría cambia la clave; descripción vacía es estable', () => {
    const base = { category: 'organigrama', period: '2024', description: '' }
    expect(buildNaturalKey(base)).toBe(buildNaturalKey({ ...base, description: undefined }))
    expect(buildNaturalKey(base)).not.toBe(buildNaturalKey({ ...base, description: 'Resolución 12' }))
    expect(buildNaturalKey(base)).not.toBe(buildNaturalKey({ ...base, period: '2025' }))
    expect(buildNaturalKey(base)).not.toBe(buildNaturalKey({ ...base, category: 'nomina-personal' }))
  })
  it.each(CASES)('$ley: el hook beforeValidate pisa la clave enviada por el cliente y soporta updates parciales', async ({ col }) => {
    const hook = col.hooks?.beforeValidate?.[0] as (a: unknown) => Promise<Record<string, unknown>>
    expect(typeof hook).toBe('function')
    const ley = col.slug.replace('ley', '')
    const req = { payload: { findByID: async () => ({ id: 1, ley, codigo: 'organigrama' }) } }
    const created = await hook({
      data: { item: 1, period: '2024', driveUrl: 'x', naturalKey: 'forjada' },
      operation: 'create',
      req,
    })
    expect(created.naturalKey).toBe(buildNaturalKey({ category: 'organigrama', period: '2024' }))
    const updated = await hook({
      data: { period: '2025' },
      originalDoc: { item: 1, category: 'organigrama', period: '2024', description: 'A' },
      operation: 'update',
      req,
    })
    expect(updated.naturalKey).toBe(buildNaturalKey({ category: 'organigrama', period: '2025', description: 'A' }))
  })
})

describe.each(CASES)('TRANS-01 $ley: hooks', ({ ley, col }) => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })
  const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }
  it('afterChange audita y revalida la etiqueta de la colección', async () => {
    for (const hook of col.hooks?.afterChange ?? []) await hook({ doc: { id: 9 }, operation: 'update', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: ley, accion: 'actualizar', documento: '9' })
    expect(revalidatePortalTag).toHaveBeenCalledWith(ley, expect.anything())
  })
  it('afterDelete audita y revalida', async () => {
    for (const hook of col.hooks?.afterDelete ?? []) await hook({ doc: { id: 9 }, id: 9, req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: ley, accion: 'eliminar' })
    expect(revalidatePortalTag).toHaveBeenCalledWith(ley, expect.anything())
  })
})

describe('TRANS-01: endpoint de revalidación y migración', () => {
  const root = process.cwd()
  it('ALLOWED_TAGS incluye ley5189 y ley5282', () => {
    const src = readFileSync(resolve(root, 'app/api/revalidate/route.ts'), 'utf8')
    expect(src).toMatch(/'ley5189'/)
    expect(src).toMatch(/'ley5282'/)
  })
  const mig = '20261026_100000_trans_01_leyes_natural_key'
  const ts = () => readFileSync(resolve(root, `apps/cms/src/migrations/${mig}.ts`), 'utf8')
  it('la migración es aditiva e idempotente y down se niega con datos', () => {
    const src = ts()
    for (const t of ['ley5189', 'ley5282']) {
      expect(src).toContain(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "natural_key" varchar`)
      expect(src).toContain(`CREATE UNIQUE INDEX IF NOT EXISTS "${t}_natural_key_idx" ON "${t}"`)
    }
    expect(src).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i)
    expect(src).toMatch(/throw new Error/)
  })
  it('está registrada en index.ts y su snapshot encadena con el anterior', () => {
    const idx = readFileSync(resolve(root, 'apps/cms/src/migrations/index.ts'), 'utf8')
    expect(idx).toContain(`name: '${mig}'`)
    const snap = JSON.parse(readFileSync(resolve(root, `apps/cms/src/migrations/${mig}.json`), 'utf8'))
    // El snapshot anterior es el inmediato por nombre (otra tarea puede añadir migraciones después).
    const names = readdirSync(resolve(root, 'apps/cms/src/migrations')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
    const before = names[names.indexOf(mig) - 1]
    const prev = JSON.parse(readFileSync(resolve(root, `apps/cms/src/migrations/${before}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    for (const t of ['ley5189', 'ley5282']) {
      expect(snap.tables[`public.${t}`].columns.natural_key).toMatchObject({ type: 'varchar', notNull: false })
      expect(snap.tables[`public.${t}`].indexes[`${t}_natural_key_idx`]).toMatchObject({ isUnique: true })
    }
  })
})
