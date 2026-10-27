// CNV-01: colección `convenios`, revalidación, dataset, siembra, migración e i18n.
// Spec: docs/specs/portal/CONVENIOS.md §3, §4 y §5.
// Amenazas: (1) lectura anónima de convenios retirados (SEC-10); (2) escritura por roles no institucionales;
// (3) enlaces javascript:/http:/hosts ajenos guardados en el panel; (4) cambios sin rastro o sin refrescar el portal;
// (5) dataset alterado a mano o con enlaces fuera de la allowlist; (6) sembrar en un CMS equivocado, con contraseña
// literal o pisando ediciones del PO; (7) migración no idempotente o destructiva.
// Límite: contratos con CMS simulado; no ejecuta Payload ni la BD.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {},
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => 'x' }))
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath: vi.fn() }))

import Convenios, { CONVENIOS_ALLOWED_HOSTS } from '../../apps/cms/src/collections/Convenios'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { validateAllowedHostUrl } from '../../apps/cms/src/utilities/validators'
import { ALLOWED_CONVENIO_HOSTS, CONVENIO_CATEGORIAS } from '@/lib/cms/convenios'
import { CONVENIOS_INTERNACIONALES, CONVENIOS_NACIONALES, CONVENIOS_NACIONALES_ORIGEN, CONVENIOS_TODOS, driveUrlFor, toCmsPayloadConvenio } from '../../scripts/lib/conveniosSeedData.mjs'
import { classifyConvenio } from '../../scripts/lib/conveniosClassify.mjs'
import { run } from '../../scripts/seed-convenios.mjs'
import { normalizeDriveHref } from '../../scripts/lib/driveLinks.mjs'

const STRONG = 'Clave-Local-Segura-93'

type F = {
  name?: string
  type?: string
  label?: string
  defaultValue?: unknown
  required?: boolean
  options?: Array<{ value: string }>
  validate?: (v: unknown, o?: unknown) => unknown
  admin?: { description?: string }
}
const fields = Convenios.fields as F[]
const field = (name: string) => fields.find((f) => f.name === name)

describe('CNV-01: acceso', () => {
  it('lectura limitada a publicados (SEC-10) y escritura solo institucional', async () => {
    expect(Convenios.access?.read).toBe(readActiveOrInstitutional)
    expect(Convenios.access?.create).toBe(canWriteInstitutional)
    expect(Convenios.access?.update).toBe(canWriteInstitutional)
    expect(Convenios.access?.delete).toBe(canWriteInstitutional)
    const read = Convenios.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'editor' } } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'superadmin' } } })).toBe(true)
  })
  it('anónimo y editor no pueden crear', async () => {
    const create = Convenios.access?.create as (a: unknown) => unknown
    expect(await create({ req: { user: null } })).toBe(false)
    expect(await create({ req: { user: { role: 'editor' } } })).toBe(false)
  })
})

describe('CNV-01: campos', () => {
  it('conserva los nombres existentes (renombrar rompería datos) y agrega categoria, nota y orden', () => {
    expect(fields.map((f) => f.name)).toEqual(
      expect.arrayContaining(['title', 'type', 'year', 'parties', 'objective', 'signedMonth', 'duration', 'driveUrl', 'active', 'categoria', 'nota', 'orden']),
    )
    expect(field('active')?.type).toBe('checkbox')
    expect(field('active')?.defaultValue).toBe(true)
  })
  it('categoria: institucional | beneficios, por defecto institucional, igual que el portal', () => {
    const c = field('categoria')
    expect(c?.type).toBe('select')
    expect(c?.options?.map((o) => o.value)).toEqual([...CONVENIO_CATEGORIAS])
    expect(c?.defaultValue).toBe('institucional')
  })
  it('orden: número con valor por defecto 99; nota: textarea con tope de 280', () => {
    expect(field('orden')?.type).toBe('number')
    expect(field('orden')?.defaultValue).toBe(99)
    expect(field('nota')?.type).toBe('textarea')
    expect(field('nota')?.validate!('breve')).toBe(true)
    expect(field('nota')?.validate!('x'.repeat(281))).not.toBe(true)
  })
  it('driveUrl valida https y la allowlist (igual que el portal)', () => {
    expect([...CONVENIOS_ALLOWED_HOSTS].sort()).toEqual([...ALLOWED_CONVENIO_HOSTS].sort())
    const v = field('driveUrl')?.validate
    expect(typeof v).toBe('function')
    expect(v!('https://drive.google.com/file/d/x/view')).toBe(true)
    expect(v!('')).toBe(true)
    expect(v!(null)).toBe(true)
    for (const bad of ['http://drive.google.com/x', 'javascript:alert(1)', 'https://softcon.wnpower.host/x', 'https://drive.google.com.evil.example/x']) {
      expect(typeof v!(bad)).toBe('string')
    }
  })
  it('objective (finalidad) es opcional: el sitio tiene una fila sin finalidad', () => {
    expect(field('objective')?.required).not.toBe(true)
    expect(field('parties')?.required).toBe(true)
    expect(field('title')?.required).toBe(true)
  })

  it('panel en español con descripciones de ayuda', () => {
    expect(Convenios.admin?.useAsTitle).toBe('title')
    expect(Convenios.admin?.defaultColumns).toEqual(['title', 'year', 'categoria', 'type', 'active'])
    expect(Convenios.defaultSort).toEqual(['-year', 'orden'])
    for (const n of ['categoria', 'nota', 'orden', 'driveUrl', 'active', 'signedMonth', 'duration']) {
      expect(field(n)?.admin?.description, n).toMatch(/\S{3,}/)
    }
    expect(field('active')?.label).toBe('Publicado')
  })
})

describe('CNV-01: hooks', () => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })
  const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }
  it('afterChange audita y revalida la etiqueta convenios', async () => {
    for (const hook of Convenios.hooks?.afterChange ?? []) await hook({ doc: { id: 9 }, operation: 'update', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'convenios', accion: 'actualizar', documento: '9' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('convenios', expect.anything())
  })
  it('afterDelete audita y revalida', async () => {
    for (const hook of Convenios.hooks?.afterDelete ?? []) await hook({ doc: { id: 9 }, id: 9, req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'convenios', accion: 'eliminar' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('convenios', expect.anything())
  })
})

describe('CNV-01: el endpoint de revalidación acepta convenios', () => {
  const SECRET = 'rv-Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3x'
  beforeEach(() => {
    revalidateTag.mockClear()
    process.env.REVALIDATION_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.REVALIDATION_SECRET
  })
  const post = async (tag: string) => {
    vi.resetModules()
    const { POST } = (await import('@/app/api/revalidate/route')) as { POST: (r: NextRequest) => Promise<Response> }
    return POST(
      new NextRequest('http://localhost/api/revalidate', {
        method: 'POST',
        headers: { 'x-real-ip': '203.0.113.45', authorization: `Bearer ${SECRET}` },
        body: JSON.stringify({ tag }),
      }),
    )
  }
  it('convenios -> 200', async () => {
    expect((await post('convenios')).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('convenios', {})
  })
  it('sin prefijos libres (convenios:1 -> 400)', async () => {
    expect((await post('convenios:1')).status).toBe(400)
  })
})

describe('CNV-01 dataset (scripts/lib/conveniosSeedData.mjs)', () => {
  type Row = (typeof CONVENIOS_NACIONALES)[number]
  const rows = CONVENIOS_NACIONALES as Row[]

  const intl = CONVENIOS_INTERNACIONALES as Row[]
  const all = CONVENIOS_TODOS as Row[]

  it('104 nacionales (2005–2024) + 45 internacionales (2009–2024), sin duplicados por clave natural', () => {
    expect(rows).toHaveLength(104)
    expect(intl).toHaveLength(45)
    expect(all).toHaveLength(149)
    expect(rows.every((r) => r.type === 'nacional')).toBe(true)
    expect(intl.every((r) => r.type === 'internacional')).toBe(true)
    const span = (l: Row[]) => [Math.min(...l.map((r) => r.year)), Math.max(...l.map((r) => r.year))]
    expect(span(rows)).toEqual([2005, 2024])
    expect(span(intl)).toEqual([2009, 2024])
    expect(new Set(all.map((r) => `${r.type}|${r.year}|${r.title}|${r.parties}`)).size).toBe(149)
  })

  it('internacionales: conteos por año, todas institucionales y la regla tampoco ve beneficios', () => {
    const perYear: Record<number, number> = {}
    for (const r of intl) perYear[r.year] = (perYear[r.year] ?? 0) + 1
    expect(perYear).toEqual({ 2009: 1, 2010: 1, 2011: 3, 2013: 1, 2014: 5, 2015: 2, 2016: 1, 2017: 3, 2018: 4, 2019: 8, 2020: 1, 2021: 1, 2022: 5, 2023: 4, 2024: 5 })
    for (const r of intl) {
      expect(r.categoria).toBe('institucional')
      expect(classifyConvenio(r)).toBe('institucional')
    }
    // El sitio no las ordena por año: el orden de origen queda en `orden` (2014 es la primera fila).
    expect(intl[0]).toMatchObject({ year: 2014, orden: 1 })
    expect(intl[1]).toMatchObject({ year: 2011, orden: 1 })
  })

  it('conteos por año y por categoría (instantánea acordada)', () => {
    const perYear: Record<number, number> = {}
    const perCat: Record<string, number> = {}
    for (const r of rows) {
      perYear[r.year] = (perYear[r.year] ?? 0) + 1
      perCat[r.categoria] = (perCat[r.categoria] ?? 0) + 1
    }
    expect(perYear).toEqual({
      2005: 1, 2007: 2, 2009: 2, 2010: 2, 2011: 3, 2012: 5, 2013: 5, 2014: 10, 2015: 4,
      2016: 4, 2017: 4, 2018: 7, 2019: 4, 2020: 2, 2021: 2, 2022: 12, 2023: 27, 2024: 8,
    })
    expect(perCat).toEqual({ institucional: 76, beneficios: 28 })
  })

  it('la categoría de cada fila nacional es la de la regla documentada', () => {
    for (const r of rows) expect(r.categoria, `${r.year} ${r.parties}`).toBe(classifyConvenio(r))
    expect(classifyConvenio({ title: 'Convenio de Descuentos', parties: 'UNC y X', objective: 'x' })).toBe('beneficios')
    expect(classifyConvenio({ title: 'Convenio', parties: 'UNC y la Empresa Y', objective: 'Objetivos de Desarrollo Sostenible' })).toBe('beneficios')
    expect(classifyConvenio({ title: 'Convenio Marco', parties: 'UNC y el MEC', objective: 'mutua colaboración y beneficio' })).toBe('institucional')
  })

  it('todo enlace es https a un host permitido o null; el host antiguo no se migra', () => {
    let withLink = 0
    for (const r of all) {
      const p = toCmsPayloadConvenio(r)
      if (p.driveUrl) {
        withLink++
        expect(validateAllowedHostUrl(p.driveUrl, { allowedHosts: [...CONVENIOS_ALLOWED_HOSTS] })).toBe(true)
      }
      // El href antiguo queda solo como procedencia (`sourceHref`); nunca llega al CMS.
      expect(JSON.stringify(p)).not.toContain('softcon')
    }
    expect(withLink).toBe(92 + 42)
    expect(intl.filter((r) => r.nota).map((r) => r.year)).toEqual([2014, 2019, 2023])
    // Toda fila sin enlace permitido lleva la nota pública para que el PO vuelva a cargar el documento.
    for (const r of all) expect(Boolean(r.linkUrl) || r.nota === 'Documento pendiente de carga.', `${r.type} ${r.sourceRow}`).toBe(true)
    const conatel = rows.find((r) => r.year === 2019 && r.orden === 1)!
    expect(conatel.driveFileId).toBeNull()
    expect(conatel.nota).toMatch(/pendiente/)
  })

  it('orden = posición dentro del año en el sitio (creciente; con huecos por el duplicado y el traslado); *_ORIGEN verbatim con erratas', () => {
    for (const set of [rows, intl]) {
      for (const y of new Set(set.map((r) => r.year))) {
        const ordenes = set.filter((r) => r.year === y).map((r) => r.orden)
        expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b))
        expect(new Set(ordenes).size).toBe(ordenes.length)
      }
    }
    expect(intl[0].title).toBe('Convenio de Cooperación y Movilidad Internacional.')
    const origen = CONVENIOS_NACIONALES_ORIGEN as Row[]
    expect(origen.some((r) => r.title === 'Covenio de Colaboración Interinstitucional')).toBe(true)
    expect(origen.some((r) => r.signedMonth === '30 de Diceimbre')).toBe(true)
    // El dataset de siembra ya trae las correcciones del PO (2026-10-24).
    expect(rows.some((r) => r.title === 'Convenio de Colaboración Interinstitucional')).toBe(true)
    expect(rows.some((r) => r.signedMonth === '30 de Diciembre')).toBe(true)
  })

  it('payload: nacional, publicado, enlace canónico de Drive y campos vacíos omitidos', () => {
    const first = toCmsPayloadConvenio(rows[0])
    expect(first).toMatchObject({ type: 'nacional', year: 2005, active: true, categoria: 'institucional', orden: 1 })
    expect(first.driveUrl).toBe(driveUrlFor(rows[0].driveFileId))
    expect(first.driveUrl).toMatch(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{20,}\/view$/)
    const noDuration = toCmsPayloadConvenio(rows.find((r) => !r.duration)!)
    expect('duration' in noDuration).toBe(false)
    // Una fila internacional (2024, Salamanca) no tiene finalidad en el sitio: no se inventa una.
    const noObjective = intl.filter((r) => !r.objective)
    expect(noObjective.map((r) => `${r.year}#${r.orden}`)).toEqual(['2024#2'])
    expect('objective' in toCmsPayloadConvenio(noObjective[0])).toBe(false)
    expect(toCmsPayloadConvenio(intl[0]).type).toBe('internacional')
  })
})

describe('CNV-01: enlaces del sitio anterior (scripts/lib/driveLinks.mjs)', () => {
  const ID = '1AbCdEfGhIjKlMnOpQrStUv'
  it.each([
    [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, 'ok', `https://drive.google.com/file/d/${ID}/view`],
    [`https://drive.google.com/open?id=${ID}`, 'ok', `https://drive.google.com/file/d/${ID}/view`],
    [`https://drive.google.com/uc?id=${ID}&export=download`, 'ok', `https://drive.google.com/file/d/${ID}/view`],
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`, 'carpeta', `https://drive.google.com/drive/folders/${ID}`],
    [`https://drive.google.com/file/d/${ID}/view?usp=sharinghttps://drive.google.com/file/d/OTRO123456789012/view`, 'ok-href-pegado', `https://drive.google.com/file/d/${ID}/view`],
    ["https://softcon.wnpower.host/'-", 'host-no-permitido', null],
    [`http://drive.google.com/file/d/${ID}/view`, 'host-no-permitido', null],
    [`https://drive.google.com.evil.example/file/d/${ID}/view`, 'host-no-permitido', null],
    [null, 'sin-enlace', null],
  ])('%s -> %s', (href, status, url) => {
    expect(normalizeDriveHref(href)).toMatchObject({ status, url })
  })

  it('cada fila conserva el href exacto de origen y un motivo explícito; conteos por motivo', () => {
    const counts: Record<string, number> = {}
    for (const r of CONVENIOS_TODOS as Array<Record<string, unknown>>) {
      expect(r.linkStatus).toBe(normalizeDriveHref(r.sourceHref as string | null).status)
      expect(r.linkUrl ?? null).toBe(normalizeDriveHref(r.sourceHref as string | null).url)
      counts[`${r.type}:${r.linkStatus}`] = (counts[`${r.type}:${r.linkStatus}`] ?? 0) + 1
    }
    expect(counts).toEqual({
      'nacional:ok': 91,
      'nacional:ok-href-pegado': 1,
      'nacional:sin-enlace': 11,
      'nacional:host-no-permitido': 1,
      'internacional:ok': 42,
      'internacional:sin-enlace': 1,
      'internacional:host-no-permitido': 2,
    })
  })

  it('el duplicado del origen (2016, FCA y Asociación de Docentes) queda excluido: solo la fila 38 llega al dataset', () => {
    const dup = (CONVENIOS_NACIONALES as Array<Record<string, unknown>>).filter((r) => r.year === 2016 && String(r.parties).includes('Asociación de Docentes'))
    expect(dup.map((r) => r.sourceRow)).toEqual([38])
  })
})

/** CMS simulado en memoria: login y convenios por clave natural exacta. */
function fakeCms(existing: Array<Record<string, unknown>> = []) {
  const store = existing.map((d, i) => ({ id: 500 + i, ...d }))
  const writes: string[] = []
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    if (url.pathname === '/api/users/login') return json({ token: 't' })
    if (url.pathname === '/api/convenios' && method === 'GET') {
      const year = Number(url.searchParams.get('where[year][equals]'))
      const title = url.searchParams.get('where[title][equals]')
      const parties = url.searchParams.get('where[parties][equals]')
      const type = url.searchParams.get('where[type][equals]')
      return json({ docs: store.filter((d) => d.type === type && d.year === year && d.title === title && d.parties === parties) })
    }
    if (url.pathname === '/api/convenios' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      store.push({ id: 900 + store.length, ...body })
      writes.push(`POST ${body.year} ${body.title}`)
      return json({ doc: body }, 201)
    }
    const m = url.pathname.match(/^\/api\/convenios\/(\d+)$/)
    if (m && method === 'PATCH') {
      const d = store.find((x) => String(x.id) === m[1])!
      Object.assign(d, JSON.parse(String(init?.body)))
      writes.push(`PATCH ${d.title}`)
      return json({ doc: d })
    }
    writes.push(`${method} ${url.pathname}`)
    return json({ error: 'no' }, 404)
  })
  return { store, writes, fetchFn }
}

const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
const quiet = () => {}

describe('CNV-01 seed: ejecución', () => {
  it('--dry-run no usa red y resume el plan', async () => {
    const fetchFn = vi.fn()
    const r = await run({ dryRun: true, deps: { env: {}, fetch: fetchFn, log: quiet, pace: async () => {} } })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r.plan).toMatchObject({ convenios: 149, perType: { nacional: 104, internacional: 45 }, perCategoria: { institucional: 121, beneficios: 28 } })
  })

  it('rechaza un destino no local sin --allow-remote y http con --allow-remote', async () => {
    const deps = { env: { ...env, CMS_URL: 'https://cms.example.invalid' }, fetch: vi.fn(), log: quiet, pace: async () => {} }
    await expect(run({ deps })).rejects.toThrow(/local/)
    await expect(run({ allowRemote: true, deps: { ...deps, env: { ...env, CMS_URL: 'http://cms.example.invalid' } } })).rejects.toThrow(/https/)
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('exige CMS_PASSWORD fuerte antes de cualquier llamada', async () => {
    const fetchFn = vi.fn()
    await expect(run({ deps: { env: { CMS_EMAIL: 'qa@example.invalid' }, fetch: fetchFn, log: quiet, pace: async () => {} } })).rejects.toThrow(/CMS_PASSWORD/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('crea los 149 y una segunda ejecución no escribe nada (idempotente)', async () => {
    const cms = fakeCms()
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const first = await run({ deps })
    expect(first.counts).toEqual({ creados: 149, existentes: 0, errores: 0 })
    const before = cms.writes.length
    const second = await run({ deps })
    expect(second.counts).toEqual({ creados: 0, existentes: 149, errores: 0 })
    expect(cms.writes.length).toBe(before)
  })

  it('nunca pisa una fila existente editada por el PO', async () => {
    const r0 = CONVENIOS_NACIONALES[0]
    const cms = fakeCms([{ type: 'nacional', year: r0.year, title: r0.title, parties: r0.parties, active: false, categoria: 'beneficios' }])
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const r = await run({ deps })
    expect(r.counts).toEqual({ creados: 148, existentes: 1, errores: 0 })
    expect(cms.writes.some((w) => !w.startsWith('POST'))).toBe(false)
    expect(cms.store[0]).toMatchObject({ active: false, categoria: 'beneficios' })
  })

  it('--fill-empty completa solo nota/enlace vacíos y nunca reemplaza valores del PO', async () => {
    const sinEnlace = CONVENIOS_NACIONALES.find((r) => r.linkStatus === 'sin-enlace')!
    const conEnlace = CONVENIOS_NACIONALES[0]
    const cms = fakeCms([
      { type: 'nacional', year: sinEnlace.year, title: sinEnlace.title, parties: sinEnlace.parties, nota: null, active: false },
      { type: 'nacional', year: conEnlace.year, title: conEnlace.title, parties: conEnlace.parties, driveUrl: 'https://drive.google.com/file/d/ELEGIDO_POR_EL_PO/view', nota: 'Nota del PO' },
    ])
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const r = await run({ fillEmpty: true, deps })
    expect(r.counts).toMatchObject({ existentes: 2, completados: 1, errores: 0 })
    expect(cms.store[0]).toMatchObject({ nota: 'Documento pendiente de carga.', active: false })
    expect(cms.store[1]).toMatchObject({ driveUrl: 'https://drive.google.com/file/d/ELEGIDO_POR_EL_PO/view', nota: 'Nota del PO' })
    const again = await run({ fillEmpty: true, deps })
    expect(again.counts).toMatchObject({ creados: 0, completados: 0 })
  })

  it('el guion no contiene contraseñas literales ni correos por defecto', () => {
    const src = readFileSync(resolve(process.cwd(), 'scripts/seed-convenios.mjs'), 'utf8')
    expect(src).not.toMatch(/CMS_PASSWORD\s*(\|\||\?\?)/)
    expect(src).not.toMatch(/CMS_EMAIL\s*(\|\||\?\?)\s*['"][^'"]/)
    expect(src).toContain('requireCmsPassword')
  })
})

describe('CNV-01: migración', () => {
  const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
  const files = readdirSync(DIR).filter((f) => /^\d{8}_\d{6}_.+\.ts$/.test(f) && f !== 'index.ts').sort()
  const mine = files.find((f) => f.includes('_cnv_01_'))

  it('existe, está registrada y su snapshot encadena con la migración anterior', () => {
    expect(mine).toBeDefined()
    const name = mine!.replace(/\.ts$/, '')
    expect(readFileSync(resolve(DIR, 'index.ts'), 'utf8')).toContain(`name: '${name}'`)
    const prevName = files[files.indexOf(mine!) - 1].replace(/\.ts$/, '')
    const snap = JSON.parse(readFileSync(resolve(DIR, `${name}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${prevName}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    const cols = snap.tables['public.convenios'].columns
    expect(cols.categoria).toMatchObject({ type: 'enum_convenios_categoria', default: "'institucional'" })
    expect(cols.nota.type).toBe('varchar')
    expect(cols.orden).toMatchObject({ type: 'numeric', default: 99 })
    expect(snap.enums['public.enum_convenios_categoria'].values).toEqual(['institucional', 'beneficios'])
  })

  it('el up es aditivo e idempotente', () => {
    const src = readFileSync(resolve(DIR, mine!), 'utf8')
    const upSql = src.split('export async function up')[1].split('export async function down')[0]
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "categoria" "enum_convenios_categoria" DEFAULT \'institucional\'')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "nota" varchar')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "orden" numeric DEFAULT 99')
    expect(upSql).not.toMatch(/ADD COLUMN "/)
    // Única excepción: `objective` deja de ser obligatoria (una fila internacional del sitio no tiene finalidad).
    expect(upSql).toContain('ALTER COLUMN "objective" DROP NOT NULL')
    expect(upSql.replace('DROP NOT NULL', '')).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
    const unprotected = upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/CREATE TYPE/g)
    expect(unprotected).toBeNull()
  })
})

describe('CNV-01: i18n de pages.convenios', () => {
  const load = (loc: string) => JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}/pages.convenios.json`), 'utf8'))
  const keys = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]))
  const es = keys(load('es')).sort()

  it.each(['en', 'pt-BR', 'gn'])('%s tiene las mismas claves que es', (loc) => {
    expect(keys(load(loc)).sort()).toEqual(es)
  })
  it('es trae las categorías, los estados y las columnas de la tabla', () => {
    for (const c of CONVENIO_CATEGORIAS) expect(es).toContain(`categories.${c}`)
    for (const s of ['empty', 'unavailable']) expect(es).toContain(`states.${s}`)
    for (const c of ['title', 'parties', 'signed', 'duration', 'objective', 'document']) expect(es).toContain(`columns.${c}`)
  })
})
