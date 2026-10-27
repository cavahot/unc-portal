// ARR-01: colección `aranceles-rectorado`, validadores, hooks, migración, siembra e i18n.
// Spec: docs/specs/portal/ARANCELES-RECTORADO.md §3, §4 y §5.
// Amenazas: (1) lectura anónima de aranceles retirados (SEC-10); (2) escritura de montos oficiales por roles
// editoriales; (3) montos negativos, decimales o absurdos y conceptos duplicados guardados desde el panel;
// (4) cambios sin rastro o sin refrescar el portal (también al borrar); (5) sembrar en un CMS equivocado, con
// contraseña literal o pisando ediciones del PO; (6) migración no idempotente o que borre datos.
// Límite: contratos con CMS simulado; no ejecuta Payload ni la BD.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {},
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => 'x' }))

import { ArancelesRectorado, ARANCEL_MAX_MONTO } from '../../apps/cms/src/collections/ArancelesRectorado'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { GRUPO_ORDER, MAX_MONTO } from '@/lib/cms/aranceles'
import { ARANCELES_OFICIALES, toCmsPayloadArancel } from '../../scripts/lib/arancelesSeedData.mjs'
import { run } from '../../scripts/seed-aranceles-rectorado.mjs'

const STRONG = 'Clave-Local-Segura-93'

type F = {
  name?: string
  type?: string
  label?: string
  defaultValue?: unknown
  required?: boolean
  maxLength?: number
  options?: Array<{ value: string }>
  validate?: (v: unknown, o?: unknown) => unknown
  hooks?: { beforeChange?: Array<(a: { value: unknown }) => unknown> }
  admin?: { description?: string }
}
const fields = ArancelesRectorado.fields as F[]
const field = (name: string) => fields.find((f) => f.name === name)

describe('ARR-01: acceso', () => {
  it('lectura limitada a publicados (SEC-10) y escritura solo institucional', async () => {
    expect(ArancelesRectorado.access?.read).toBe(readActiveOrInstitutional)
    expect(ArancelesRectorado.access?.create).toBe(canWriteInstitutional)
    expect(ArancelesRectorado.access?.update).toBe(canWriteInstitutional)
    expect(ArancelesRectorado.access?.delete).toBe(canWriteInstitutional)
    const read = ArancelesRectorado.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'publisher' } } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'superadmin' } } })).toBe(true)
  })

  it.each(['editor', 'publisher', 'reviewer', 'correspondent'])('%s no puede crear, editar ni borrar', async (role) => {
    for (const op of ['create', 'update', 'delete'] as const) {
      const fn = ArancelesRectorado.access?.[op] as (a: unknown) => unknown
      expect(await fn({ req: { user: { role } } })).toBe(false)
    }
  })

  it('anónimo no escribe', async () => {
    const create = ArancelesRectorado.access?.create as (a: unknown) => unknown
    expect(await create({ req: { user: null } })).toBe(false)
  })
})

describe('ARR-01: campos', () => {
  it('ya no existe `activo`; `active` es «Publicado», por defecto true', () => {
    expect(field('activo')).toBeUndefined()
    expect(field('active')).toMatchObject({ type: 'checkbox', defaultValue: true, label: 'Publicado' })
  })

  it('grupo: obligatorio, sin valor por defecto, mismo orden canónico que el portal', () => {
    const g = field('grupo')
    expect(g?.required).toBe(true)
    expect(g?.defaultValue).toBeUndefined()
    expect(g?.options?.map((o) => o.value)).toEqual([...GRUPO_ORDER])
  })

  it('el tope de monto del CMS es el mismo que el del portal', () => {
    expect(ARANCEL_MAX_MONTO).toBe(MAX_MONTO)
    expect(MAX_MONTO).toBe(100_000_000)
  })

  it.each([
    [-1, false],
    [1500.5, false],
    [100_000_001, false],
    [Number.NaN, false],
    ['50000', false],
    [0, true],
    [50000, true],
    [100_000_000, true],
  ])('monto %s -> válido=%s', (v, ok) => {
    const r = field('monto')?.validate?.(v, {})
    if (ok) expect(r).toBe(true)
    else expect(typeof r).toBe('string')
  })

  it('orden: entero >= 0', () => {
    const v = field('orden')?.validate
    expect(v!(3, {})).toBe(true)
    expect(v!(undefined, {})).toBe(true)
    expect(typeof v!(-1, {})).toBe('string')
    expect(typeof v!(1.5, {})).toBe('string')
  })

  it('concepto: tope de 200 y espacios normalizados al guardar', async () => {
    const c = field('concepto')
    expect(c?.maxLength).toBe(200)
    const norm = c?.hooks?.beforeChange?.[0]
    expect(norm?.({ value: '  Constancias   Varias ' })).toBe('Constancias Varias')
    const v = c?.validate
    const req = { payload: { find: vi.fn(async () => ({ totalDocs: 0 })) } }
    expect(typeof (await v!('x'.repeat(201), { req, siblingData: { grupo: 'venta' } }))).toBe('string')
    expect(typeof (await v!('   ', { req, siblingData: { grupo: 'venta' } }))).toBe('string')
  })

  it('concepto: único por grupo (mensaje en español), excluye la propia fila al editar', async () => {
    const v = field('concepto')!.validate!
    const find = vi.fn(async () => ({ totalDocs: 1 }))
    const dup = await v('Constancias Varias', { req: { payload: { find } }, id: 7, siblingData: { grupo: 'venta' } })
    expect(dup).toMatch(/ya existe/i)
    const where = (find.mock.calls[0] as unknown as [{ where: unknown }])[0].where
    expect(JSON.stringify(where)).toContain('"not_equals":7')
    expect(JSON.stringify(where)).toContain('"venta"')
    const free = vi.fn(async () => ({ totalDocs: 0 }))
    expect(await v('Constancias Varias', { req: { payload: { find: free } }, siblingData: { grupo: 'multas' } })).toBe(true)
  })

  it('índice único compuesto concepto + grupo', () => {
    expect(ArancelesRectorado.indexes).toEqual([{ fields: ['concepto', 'grupo'], unique: true }])
  })

  it('panel en español: columnas, orden por grupo y orden, búsqueda por concepto', () => {
    expect(ArancelesRectorado.admin?.defaultColumns).toEqual(['concepto', 'grupo', 'monto', 'orden', 'active'])
    expect(ArancelesRectorado.defaultSort).toEqual(['grupo', 'orden'])
    expect(ArancelesRectorado.admin?.listSearchableFields).toEqual(['concepto'])
    for (const f of fields) expect(f.admin?.description, `descripción de ${f.name}`).toBeTruthy()
  })
})

describe('ARR-01: hooks', () => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })
  const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }

  it('afterChange audita y revalida la etiqueta aranceles-rectorado', async () => {
    for (const hook of ArancelesRectorado.hooks?.afterChange ?? []) await hook({ doc: { id: 4 }, operation: 'update', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'aranceles-rectorado', accion: 'actualizar', documento: '4' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('aranceles-rectorado', expect.anything())
  })

  it('afterDelete audita y revalida', async () => {
    for (const hook of ArancelesRectorado.hooks?.afterDelete ?? []) await hook({ doc: { id: 4 }, id: 4, req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'aranceles-rectorado', accion: 'eliminar' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('aranceles-rectorado', expect.anything())
  })
})

describe('ARR-01 seed: datos oficiales', () => {
  type Item = { grupo: string; orden: number; concepto: string; monto: number }
  const items = ARANCELES_OFICIALES as Item[]

  it('24 filas: 3 multas, 8 venta, 13 educativos; orden 1..n por grupo', () => {
    expect(items).toHaveLength(24)
    for (const [g, n] of [['multas', 3], ['venta', 8], ['educativos', 13]] as const) {
      const rows = items.filter((i) => i.grupo === g)
      expect(rows).toHaveLength(n)
      expect(rows.map((r) => r.orden)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
  })

  it('montos enteros dentro del rango y sin duplicados por grupo + concepto', () => {
    for (const i of items) {
      expect(Number.isInteger(i.monto)).toBe(true)
      expect(i.monto).toBeGreaterThan(0)
      expect(i.monto).toBeLessThanOrEqual(MAX_MONTO)
      expect(i.concepto.length).toBeLessThanOrEqual(200)
      expect(i.concepto).toBe(i.concepto.trim())
    }
    expect(new Set(items.map((i) => `${i.grupo}|${i.concepto}`)).size).toBe(24)
  })

  it('redacción oficial (con «Didáctica» corregida) y montos de muestra', () => {
    const by = (c: string) => items.find((i) => i.concepto === c)
    expect(by('Multas por retraso de Matrícula Post Grado y Maestría')).toMatchObject({ grupo: 'multas', orden: 1, monto: 10000 })
    expect(by('Multas por Incumplimiento de Contrato')).toMatchObject({ grupo: 'multas', monto: 60000 })
    expect(by('Inscripción de Títulos Universitarios')).toMatchObject({ grupo: 'venta', orden: 3, monto: 200000 })
    expect(by('Extracto consolidado de liquidación salarial anual')).toMatchObject({ grupo: 'venta', orden: 8, monto: 50000 })
    expect(by('Matrícula Post Grado en Didáctica p/ Educación Superior')).toMatchObject({ grupo: 'educativos', orden: 1, monto: 500000 })
    expect(by('Tutoría de Trabajo Final de Doctorado en Educación')).toMatchObject({ monto: 2500000, orden: 11 })
    expect(by('Derecho de Examen Extraordinario – Doctorado en Educación')).toMatchObject({ monto: 300000, orden: 13 })
    expect(items.some((i) => /Didactica/.test(i.concepto))).toBe(false)
    const total = items.reduce((n, i) => n + i.monto, 0)
    // Suma de control calculada a mano desde la página publicada (3 + 8 + 13 filas): 80.000 + 680.000 + 7.100.000.
    expect(total).toBe(7_860_000)
  })

  it('payload: publicado, campos exactos', () => {
    expect(toCmsPayloadArancel(items[0])).toEqual({ ...items[0], active: true })
  })
})

/** CMS simulado en memoria: login y aranceles por concepto + grupo. */
function fakeCms(existing: Array<Record<string, unknown>> = []) {
  const store = existing.map((d, i) => ({ id: 500 + i, ...d }))
  const writes: string[] = []
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    if (url.pathname === '/api/users/login') return json({ token: 't' })
    if (url.pathname === '/api/aranceles-rectorado' && method === 'GET') {
      const c = url.searchParams.get('where[concepto][equals]')
      const g = url.searchParams.get('where[grupo][equals]')
      return json({ docs: store.filter((d) => d.concepto === c && d.grupo === g) })
    }
    if (url.pathname === '/api/aranceles-rectorado' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      store.push({ id: 900 + store.length, ...body })
      writes.push(`POST ${body.concepto}`)
      return json({ doc: body }, 201)
    }
    writes.push(`${method} ${url.pathname}`)
    return json({ error: 'no' }, 404)
  })
  return { store, writes, fetchFn }
}

const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
const quiet = () => {}

describe('ARR-01 seed: ejecución', () => {
  it('--dry-run no usa red y muestra conteos por grupo', async () => {
    const fetchFn = vi.fn()
    const r = await run({ dryRun: true, deps: { env: {}, fetch: fetchFn, log: quiet, pace: async () => {} } })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r.plan).toEqual({ aranceles: 24, porGrupo: { multas: 3, venta: 8, educativos: 13 } })
  })

  it('rechaza destino no local sin --allow-remote y http con --allow-remote', async () => {
    const deps = { env: { ...env, CMS_URL: 'https://cms.example.invalid' }, fetch: vi.fn(), log: quiet, pace: async () => {} }
    await expect(run({ deps })).rejects.toThrow(/local/)
    await expect(run({ allowRemote: true, deps: { ...deps, env: { ...env, CMS_URL: 'http://cms.example.invalid' } } })).rejects.toThrow(/https/)
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('exige CMS_EMAIL y CMS_PASSWORD fuerte antes de cualquier llamada', async () => {
    const fetchFn = vi.fn()
    await expect(run({ deps: { env: { CMS_EMAIL: 'qa@example.invalid' }, fetch: fetchFn, log: quiet, pace: async () => {} } })).rejects.toThrow(/CMS_PASSWORD/)
    await expect(run({ deps: { env: { CMS_PASSWORD: STRONG }, fetch: fetchFn, log: quiet, pace: async () => {} } })).rejects.toThrow(/CMS_EMAIL/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('crea 24 y una segunda ejecución no escribe nada', async () => {
    const cms = fakeCms()
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const first = await run({ deps })
    expect(first.counts).toMatchObject({ creados: 24, sinCambios: 0, errores: 0 })
    const before = cms.writes.length
    const second = await run({ deps })
    expect(second.counts).toMatchObject({ creados: 0, sinCambios: 24, conDiferencias: 0, errores: 0 })
    expect(cms.writes.length).toBe(before)
  })

  it('nunca pisa ediciones del PO (monto u orden distintos, o retirado)', async () => {
    const cms = fakeCms([{ concepto: 'Constancias Varias', grupo: 'venta', monto: 55000, orden: 1, active: false }])
    const r = await run({ deps: { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} } })
    expect(r.counts).toMatchObject({ creados: 23, conDiferencias: 1 })
    expect(cms.writes.some((w) => !w.startsWith('POST'))).toBe(false)
    expect(cms.store.find((d) => d.concepto === 'Constancias Varias')).toMatchObject({ monto: 55000, active: false })
  })

  it('el guion no tiene correo ni contraseña por defecto', () => {
    const src = readFileSync(resolve(process.cwd(), 'scripts/seed-aranceles-rectorado.mjs'), 'utf8')
    expect(src).not.toMatch(/admin@unc\.edu\.py/)
    expect(src).not.toMatch(/(EMAIL|PASSWORD)[^\n]*\|\|\s*['"][^'"]/)
    expect(src).toContain('requireCmsPassword')
  })
})

describe('ARR-01: migración', () => {
  const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
  const files = readdirSync(DIR).filter((f) => /^\d{8}_\d{6}_.+\.ts$/.test(f) && f !== 'index.ts').sort()
  const mine = files.find((f) => f.includes('_arr_01_'))

  it('existe, está registrada y su snapshot encadena con la migración anterior', () => {
    expect(mine).toBeDefined()
    const name = mine!.replace(/\.ts$/, '')
    expect(readFileSync(resolve(DIR, 'index.ts'), 'utf8')).toContain(`name: '${name}'`)
    const prevName = files[files.indexOf(mine!) - 1].replace(/\.ts$/, '')
    const snap = JSON.parse(readFileSync(resolve(DIR, `${name}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${prevName}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    const t = snap.tables['public.aranceles_rectorado']
    expect(t.columns.activo).toBeUndefined()
    expect(t.columns.active).toMatchObject({ type: 'boolean', default: true })
    expect(t.columns.grupo.default).toBeUndefined()
    expect(t.indexes.aranceles_rectorado_active_idx.columns[0].expression).toBe('active')
    expect(t.indexes.concepto_grupo_idx).toMatchObject({ isUnique: true })
  })

  it('el up es idempotente y no borra datos', () => {
    const src = readFileSync(resolve(DIR, mine!), 'utf8')
    const up = src.split('export async function up')[1].split('export async function down')[0]
    expect(up).toMatch(/RENAME COLUMN "activo" TO "active"/)
    expect(up).toMatch(/column_name = 'activo'/)
    expect(up).toContain('CREATE INDEX IF NOT EXISTS "aranceles_rectorado_active_idx"')
    expect(up).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "concepto_grupo_idx"')
    expect(up).toContain('ALTER COLUMN "grupo" DROP DEFAULT')
    expect(up).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
  })
})

describe('ARR-01: i18n de pages.aranceles-rectorado', () => {
  const load = (loc: string) => JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}/pages.aranceles-rectorado.json`), 'utf8'))
  const keys = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]))
  const es = keys(load('es')).sort()

  it.each(['en', 'pt-BR', 'gn'])('%s tiene las mismas claves que es', (loc) => {
    expect(keys(load(loc)).sort()).toEqual(es)
  })

  it('es trae etiquetas de los tres grupos, estados y búsqueda', () => {
    for (const g of GRUPO_ORDER) expect(es).toContain(`grupos.${g}.title`)
    for (const k of ['states.empty', 'states.unavailable', 'search.label', 'search.statusNone', 'updated', 'table.amount']) {
      expect(es).toContain(k)
    }
  })

  it('el espacio de nombres está registrado en lib/i18n/server.ts', () => {
    expect(readFileSync(resolve(process.cwd(), 'lib/i18n/server.ts'), 'utf8')).toContain("'pages.aranceles-rectorado'")
  })
})
