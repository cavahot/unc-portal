// TRANS-02: colección `transparencia-items`, relación de los documentos con su ítem, migración y seed
// (spec docs/specs/portal/TRANSPARENCIA-ITEMS.md §2, §3 y §4).
// Amenazas: (1) lectura anónima de ítems inactivos; (2) escritura por roles no institucionales; (3) `codigo` mal
// formado o cambiado después de crear (rompe la clave natural y las anclas); (4) ítem duplicado o de otra ley;
// (5) borrar un ítem y dejar documentos huérfanos; (6) migración destructiva o no idempotente; (7) que el seed pise
// ediciones del PO o cargue documentos falsos.
// Límite: CMS simulado; no ejecuta Payload ni la BD (la migración se prueba además en PostgreSQL con ROLLBACK).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
}))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => 'x' }))

import { TransparenciaItems, buildItemKey } from '../../apps/cms/src/collections/TransparenciaItems'
import { Ley5189 } from '../../apps/cms/src/collections/Ley5189'
import { Ley5282 } from '../../apps/cms/src/collections/Ley5282'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { TRANSPARENCIA_ITEMS, buildItemKey as seedItemKey, run } from '../../scripts/seed-transparencia-items.mjs'

type F = {
  name?: string
  type?: string
  required?: boolean
  unique?: boolean
  index?: boolean
  relationTo?: string
  options?: Array<{ value: string }>
  validate?: (v: unknown) => unknown
  access?: { update?: () => boolean }
  admin?: { description?: string; hidden?: boolean; readOnly?: boolean }
}
const fields = TransparenciaItems.fields as F[]
const f = (n: string) => fields.find((x) => x.name === n)
const root = process.cwd()

describe('TRANS-02: colección transparencia-items', () => {
  it('slug, grupo y acceso (lectura solo activos, escritura institucional)', async () => {
    expect(TransparenciaItems.slug).toBe('transparencia-items')
    expect(TransparenciaItems.admin?.group).toBe('Transparencia')
    expect(TransparenciaItems.access?.read).toBe(readActiveOrInstitutional)
    for (const k of ['create', 'update', 'delete'] as const) expect(TransparenciaItems.access?.[k]).toBe(canWriteInstitutional)
    const read = TransparenciaItems.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    const create = TransparenciaItems.access?.create as (a: unknown) => unknown
    expect(await create({ req: { user: null } })).toBe(false)
    expect(await create({ req: { user: { role: 'editor' } } })).toBe(false)
  })
  it('campos: ley, codigo, titulo, descripcion, orden, active y naturalKey oculto único', () => {
    expect(fields.map((x) => x.name)).toEqual(expect.arrayContaining(['ley', 'codigo', 'titulo', 'descripcion', 'orden', 'active', 'naturalKey']))
    expect(f('ley')?.options?.map((o) => o.value)).toEqual(['5189', '5282'])
    for (const n of ['ley', 'codigo', 'titulo']) expect(f(n)?.required, n).toBe(true)
    expect(f('descripcion')?.required).toBeFalsy()
    expect(f('naturalKey')).toMatchObject({ unique: true, admin: { hidden: true } })
    for (const n of ['ley', 'codigo', 'titulo', 'descripcion', 'orden', 'active']) expect(f(n)?.admin?.description, n).toMatch(/\S{3,}/)
  })
  it('codigo: slug válido; ley y codigo no se pueden cambiar tras crear', () => {
    const v = f('codigo')!.validate!
    for (const ok of ['item-1', 'organigrama', 'cumplimiento-art7', 'a']) expect(v(ok), ok).toBe(true)
    for (const bad of ['Item 1', 'a_b', '-x', 'x-', 'a--b', '', null, undefined, 'x'.repeat(61), 'ÑU'])
      expect(typeof v(bad), String(bad)).toBe('string')
    expect(f('codigo')!.access!.update!()).toBe(false)
    expect(f('ley')!.access!.update!()).toBe(false)
  })
  it('buildItemKey: normaliza y separa por ley (mismo codigo en otra ley no choca)', () => {
    expect(buildItemKey({ ley: '5282', codigo: ' Item-1 ' })).toBe('5282|item-1')
    expect(buildItemKey({ ley: '5189', codigo: 'item-1' })).not.toBe(buildItemKey({ ley: '5282', codigo: 'item-1' }))
    expect(seedItemKey('5282', 'Item-1')).toBe(buildItemKey({ ley: '5282', codigo: 'item-1' }))
  })
  it('beforeValidate pisa naturalKey forjada y completa updates parciales con originalDoc', async () => {
    const hook = TransparenciaItems.hooks?.beforeValidate?.[0] as (a: unknown) => Promise<Record<string, unknown>>
    const c = await hook({ data: { ley: '5282', codigo: 'item-2', naturalKey: 'forjada' }, operation: 'create', req: {} })
    expect(c.naturalKey).toBe('5282|item-2')
    const u = await hook({ data: { titulo: 'Nuevo' }, originalDoc: { ley: '5282', codigo: 'item-2' }, operation: 'update', req: {} })
    expect(u.naturalKey).toBe('5282|item-2')
  })
})

describe('TRANS-02: borrado de ítems y hooks', () => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })
  const mkReq = (counts: Record<string, number>) => ({
    user: { email: 'a@example.invalid', role: 'web-admin' },
    payload: { count: vi.fn(async ({ collection }: { collection: string }) => ({ totalDocs: counts[collection] ?? 0 })) },
  })
  it('beforeDelete bloquea (400) si algún documento referencia el ítem', async () => {
    const hook = TransparenciaItems.hooks?.beforeDelete?.[0] as (a: unknown) => Promise<void>
    expect(typeof hook).toBe('function')
    await expect(hook({ id: 7, req: mkReq({ ley5282: 2 }) })).rejects.toMatchObject({ status: 400 })
    await expect(hook({ id: 7, req: mkReq({ ley5189: 1 }) })).rejects.toThrow(/documento/i)
  })
  it('beforeDelete permite borrar un ítem sin documentos', async () => {
    const hook = TransparenciaItems.hooks?.beforeDelete?.[0] as (a: unknown) => Promise<void>
    await expect(hook({ id: 7, req: mkReq({}) })).resolves.toBeUndefined()
  })
  it('afterChange audita y revalida la etiqueta de ítems y la de la ley afectada', async () => {
    const req = mkReq({})
    for (const h of TransparenciaItems.hooks?.afterChange ?? []) await h({ doc: { id: 3, ley: '5282' }, operation: 'update', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'transparencia-items', accion: 'actualizar', documento: '3' })
    const tags = revalidatePortalTag.mock.calls.map((c) => c[0])
    expect(tags).toEqual(expect.arrayContaining(['transparencia-items', 'ley5282']))
    expect(tags).not.toContain('ley5189')
  })
  it('afterDelete audita y revalida', async () => {
    for (const h of TransparenciaItems.hooks?.afterDelete ?? []) await h({ doc: { id: 3, ley: '5189' }, id: 3, req: mkReq({}) } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'transparencia-items', accion: 'eliminar' })
    expect(revalidatePortalTag.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['transparencia-items', 'ley5189']))
  })
  it('ALLOWED_TAGS acepta transparencia-items y la colección está registrada', () => {
    expect(readFileSync(resolve(root, 'app/api/revalidate/route.ts'), 'utf8')).toMatch(/'transparencia-items'/)
    expect(readFileSync(resolve(root, 'apps/cms/src/payload.config.ts'), 'utf8')).toMatch(/TransparenciaItems/)
  })
})

describe.each([
  { slug: 'ley5189', col: Ley5189, other: '5282' },
  { slug: 'ley5282', col: Ley5282, other: '5189' },
])('TRANS-02 $slug: relación con el ítem', ({ slug, col, other }) => {
  const cf = (n: string) => (col.fields as F[]).find((x) => x.name === n)
  const hook = col.hooks?.beforeValidate?.[0] as (a: unknown) => Promise<Record<string, unknown>>
  const ley = slug.replace('ley', '')
  const reqWith = (item: unknown) => ({ payload: { findByID: vi.fn(async () => item) } })
  it('item es relación obligatoria a transparencia-items y category deja de ser select fijo', () => {
    expect(cf('item')).toMatchObject({ type: 'relationship', relationTo: 'transparencia-items', required: true })
    expect(cf('category')?.type).toBe('text')
    expect(cf('category')?.options).toBeUndefined()
    expect(cf('category')?.admin).toMatchObject({ hidden: true, readOnly: true })
    expect(cf('driveUrl')?.validate).toBeTypeOf('function')
  })
  it('deriva category del codigo del ítem y calcula la misma naturalKey que TRANS-01', async () => {
    const out = await hook({ data: { item: 5, period: ' Enero  2024', description: 'Anexo' }, operation: 'create', req: reqWith({ id: 5, ley, codigo: 'item-8' }) })
    expect(out.category).toBe('item-8')
    expect(out.naturalKey).toBe('item-8|enero 2024|anexo')
  })
  it('acepta el ítem poblado (objeto) y en un update parcial usa el de originalDoc', async () => {
    const a = await hook({ data: { item: { id: 5 }, period: '2024' }, operation: 'create', req: reqWith({ id: 5, ley, codigo: 'x' }) })
    expect(a.category).toBe('x')
    const b = await hook({ data: { period: '2025' }, originalDoc: { item: 5, period: '2024', category: 'x' }, operation: 'update', req: reqWith({ id: 5, ley, codigo: 'x' }) })
    expect(b.naturalKey).toBe('x|2025|')
  })
  it('rechaza (400) un ítem de otra ley o inexistente', async () => {
    await expect(hook({ data: { item: 5, period: '1' }, operation: 'create', req: reqWith({ id: 5, ley: other, codigo: 'x' }) })).rejects.toMatchObject({ status: 400 })
    await expect(hook({ data: { item: 9, period: '1' }, operation: 'create', req: reqWith(null) })).rejects.toMatchObject({ status: 400 })
  })
})

describe('TRANS-02: seed de ítems', () => {
  it('28 ítems oficiales (11 + 17) con títulos de TRANS-01, orden ascendente y códigos únicos', () => {
    expect(TRANSPARENCIA_ITEMS['5189']).toHaveLength(11)
    expect(TRANSPARENCIA_ITEMS['5282']).toHaveLength(17)
    expect(TRANSPARENCIA_ITEMS['5282'][0]).toMatchObject({ codigo: 'item-1', titulo: 'Su estructura orgánica' })
    expect(TRANSPARENCIA_ITEMS['5189'][3].titulo).toBe('Presupuesto de Ingresos – Gastos')
    for (const l of ['5189', '5282'] as const) {
      const codes = TRANSPARENCIA_ITEMS[l].map((i: { codigo: string }) => i.codigo)
      expect(new Set(codes).size).toBe(codes.length)
    }
  })
  const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: 'Clave-Local-Segura-93', CMS_URL: 'http://localhost:3002' }
  function fakeCms(existing: Array<Record<string, unknown>> = []) {
    const store = existing.map((d, i) => ({ id: 100 + i, ...d }))
    const posts: Array<Record<string, unknown>> = []
    const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'
      const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s })
      if (url.pathname === '/api/users/login') return json({ token: 't' })
      if (url.pathname === '/api/transparencia-items' && method === 'GET') {
        const k = url.searchParams.get('where[naturalKey][equals]')
        return json({ docs: store.filter((d) => d.naturalKey === k) })
      }
      if (url.pathname === '/api/transparencia-items' && method === 'POST') {
        const b = JSON.parse(String(init?.body))
        posts.push(b)
        store.push({ id: 900 + store.length, naturalKey: seedItemKey(b.ley, b.codigo), ...b })
        return json({ doc: b }, 201)
      }
      return json({}, 404)
    })
    return { fetchFn, posts, store }
  }
  const mk = (c: ReturnType<typeof fakeCms>, log: string[] = []) => ({ env, fetch: c.fetchFn as never, log: (m: string) => log.push(m), pace: async () => undefined })
  it('dry-run por defecto: sin red', async () => {
    const c = fakeCms()
    const r = await run({ deps: mk(c) })
    expect(c.fetchFn).not.toHaveBeenCalled()
    expect(r).toMatchObject({ dryRun: true, counts: { total: 28 } })
  })
  it('--apply crea 28 sin documentos; 2.º run = 0 creados y 28 omitidos', async () => {
    const c = fakeCms()
    const r1 = await run({ apply: true, deps: mk(c) })
    expect(r1.counts).toEqual({ creados: 28, omitidos: 0, errores: 0 })
    expect(c.posts[0]).toMatchObject({ ley: '5189', codigo: 'organigrama', titulo: 'Organigrama', orden: 10, active: true })
    expect(c.posts.every((p) => !('driveUrl' in p) && !('naturalKey' in p))).toBe(true)
    const r2 = await run({ apply: true, deps: mk(c) })
    expect(r2.counts).toEqual({ creados: 0, omitidos: 28, errores: 0 })
  })
  it('nunca pisa un ítem editado por el PO (titulo/orden distintos): lo omite sin escribir', async () => {
    const c = fakeCms([{ ley: '5282', codigo: 'item-2', titulo: 'Título del PO', orden: 5, naturalKey: '5282|item-2' }])
    const r = await run({ apply: true, deps: mk(c) })
    expect(r.counts).toEqual({ creados: 27, omitidos: 1, errores: 0 })
    expect(c.posts.find((p) => p.codigo === 'item-2' && p.ley === '5282')).toBeUndefined()
  })
  it('rechaza destino remoto sin --allow-remote y credencial débil', async () => {
    const c = fakeCms()
    await expect(run({ apply: true, deps: { ...mk(c), env: { ...env, CMS_URL: 'https://cms.example' } } })).rejects.toThrow(/local/i)
    await expect(run({ apply: true, deps: { ...mk(c), env: { ...env, CMS_PASSWORD: 'admin' } } })).rejects.toThrow(/CMS_PASSWORD/)
    expect(c.fetchFn).not.toHaveBeenCalled()
  })
})

describe('TRANS-02: migración', () => {
  const mig = '20261026_200000_trans_02_items'
  const dir = resolve(root, 'apps/cms/src/migrations')
  const src = () => readFileSync(resolve(dir, `${mig}.ts`), 'utf8')
  it('es idempotente, no destructiva y el down se niega con datos', () => {
    const s = src()
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "transparencia_items"')
    for (const t of ['ley5189', 'ley5282']) {
      expect(s).toContain(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "item_id" integer`)
      expect(s).toContain(`"${t}_item_idx"`)
    }
    expect(s).toMatch(/ALTER COLUMN "category" SET DATA TYPE varchar/)
    expect(s).toMatch(/item_id" IS NULL/)
    expect(s).not.toMatch(/TRUNCATE|DELETE FROM|DROP TABLE(?! IF EXISTS "transparencia_items")/i)
    expect(s).toMatch(/throw new Error/)
  })
  it('el relleno incluye los 28 títulos oficiales exactos', () => {
    const s = src()
    for (const l of ['5189', '5282'] as const)
      for (const i of TRANSPARENCIA_ITEMS[l] as Array<{ codigo: string; titulo: string }>) {
        expect(s, i.codigo).toContain(`'${i.codigo}'`)
        expect(s, i.titulo).toContain(i.titulo.replace(/'/g, "''"))
      }
  })
  it('registrada en index.ts, README y snapshot encadenado a trans_01 con la tabla nueva', () => {
    expect(readFileSync(resolve(dir, 'index.ts'), 'utf8')).toContain(`name: '${mig}'`)
    expect(readFileSync(resolve(dir, 'README.md'), 'utf8')).toContain(mig)
    const snap = JSON.parse(readFileSync(resolve(dir, `${mig}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(dir, '20261026_100000_trans_01_leyes_natural_key.json'), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    expect(Object.keys(snap.tables['public.transparencia_items'].columns)).toEqual(
      expect.arrayContaining(['ley', 'codigo', 'titulo', 'descripcion', 'orden', 'active', 'natural_key']),
    )
    for (const t of ['ley5189', 'ley5282']) {
      expect(snap.tables[`public.${t}`].columns.item_id).toMatchObject({ type: 'integer', notNull: true })
      expect(snap.tables[`public.${t}`].columns.category).toMatchObject({ type: 'varchar', notNull: false })
      expect(Object.values(snap.tables[`public.${t}`].foreignKeys).some((x: any) => x.tableTo === 'transparencia_items')).toBe(true)
    }
  })
})
