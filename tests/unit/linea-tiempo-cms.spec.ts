// LT-01: colección `linea-tiempo`, revalidación, migración, siembra, i18n y retiro de los hitos del código.
// Spec: docs/specs/portal/LINEA-TIEMPO.md §3, §4 y §5.
// Amenazas: (1) lectura anónima de hitos retirados (SEC-10); (2) escritura por roles no institucionales;
// (3) enlaces javascript:/http: guardados en el panel; (4) cambios sin rastro o sin refrescar el portal;
// (5) sembrar en un CMS equivocado, con contraseña literal o pisando ediciones del PO; (6) migración no
// idempotente o que borre datos; (7) hitos escritos en el código que reaparezcan.
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

import { LineaTiempo } from '../../apps/cms/src/collections/LineaTiempo'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { LINEA_TIEMPO_HITOS, toCmsPayloadLineaTiempo } from '../../scripts/lib/lineaTiempoSeedData.mjs'
import { run } from '../../scripts/seed-linea-tiempo.mjs'

const STRONG = 'Clave-Local-Segura-93'
const ROOT = process.cwd()

type F = {
  name?: string
  type?: string
  defaultValue?: unknown
  required?: boolean
  index?: boolean
  maxLength?: number
  relationTo?: string
  label?: string
  fields?: F[]
  validate?: (v: unknown, o?: unknown) => unknown
}
// Las filas de diseño (`type: 'row'`) no guardan datos: se aplanan para buscar los campos por nombre.
const flat = (list: F[]): F[] => list.flatMap((f) => (f.type === 'row' ? flat(f.fields ?? []) : [f]))
const fields = flat(LineaTiempo.fields as F[])
const field = (name: string) => fields.find((f) => f.name === name)

describe('LT-01: acceso', () => {
  it('lectura limitada a publicados (SEC-10) y escritura solo institucional', async () => {
    expect(LineaTiempo.slug).toBe('linea-tiempo')
    expect(LineaTiempo.access?.read).toBe(readActiveOrInstitutional)
    expect(LineaTiempo.access?.create).toBe(canWriteInstitutional)
    expect(LineaTiempo.access?.update).toBe(canWriteInstitutional)
    expect(LineaTiempo.access?.delete).toBe(canWriteInstitutional)
    const read = LineaTiempo.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    const create = LineaTiempo.access?.create as (a: unknown) => unknown
    expect(await create({ req: { user: null } })).toBe(false)
    expect(await create({ req: { user: { role: 'editor' } } })).toBe(false)
    expect(await create({ req: { user: { role: 'web-admin' } } })).toBe(true)
  })
})

describe('LT-01: campos', () => {
  const year = new Date().getFullYear()

  it('anio: número obligatorio con índice, 1800..año siguiente y entero', () => {
    const f = field('anio')!
    expect(f).toMatchObject({ type: 'number', required: true, index: true })
    expect(f.validate!(2007)).toBe(true)
    expect(f.validate!(year + 1)).toBe(true)
    for (const bad of [1799, year + 2, 2007.5]) expect(typeof f.validate!(bad)).toBe('string')
  })

  it('topes de texto: titulo 120, descripcion 600, etiquetaFecha 40', () => {
    expect(field('titulo')).toMatchObject({ type: 'text', required: true, maxLength: 120 })
    expect(field('descripcion')).toMatchObject({ type: 'textarea', required: true, maxLength: 600 })
    expect(field('etiquetaFecha')).toMatchObject({ type: 'text', maxLength: 40 })
    expect(field('titulo')!.validate!('x'.repeat(121))).not.toBe(true)
    expect(field('descripcion')!.validate!('x'.repeat(601))).not.toBe(true)
    expect(field('etiquetaFecha')!.validate!('x'.repeat(41))).not.toBe(true)
    expect(field('etiquetaFecha')!.validate!('Marzo de 2008')).toBe(true)
    expect(field('etiquetaFecha')!.validate!(undefined)).toBe(true)
  })

  it('enlace: solo https sin credenciales; vacío permitido', () => {
    const v = field('enlace')!.validate!
    expect(v('https://www.bacn.gov.py/leyes-paraguayas/10576')).toBe(true)
    expect(v('')).toBe(true)
    for (const bad of ['javascript:alert(1)', 'http://x.example', 'https://u:p@x.example', ' https://x.example']) {
      expect(typeof v(bad)).toBe('string')
    }
  })

  it('imagen a media, orden 99 por defecto, active «Publicado» por defecto true con índice', () => {
    expect(field('imagen')).toMatchObject({ type: 'upload', relationTo: 'media' })
    expect(field('orden')).toMatchObject({ type: 'number', defaultValue: 99 })
    expect(field('active')).toMatchObject({ type: 'checkbox', defaultValue: true, label: 'Publicado', index: true })
  })

  it('traducciones opcionales en, ptBR y gn con titulo y descripcion', () => {
    const t = field('traducciones')!
    expect(t.type).toBe('group')
    expect(t.fields!.map((g) => g.name)).toEqual(['en', 'ptBR', 'gn'])
    for (const g of t.fields!) {
      expect(g.fields!.map((x) => x.name)).toEqual(['titulo', 'descripcion'])
      for (const x of g.fields!) expect(x.required).not.toBe(true)
    }
  })

  it('panel: grupo Institucional, columnas y orden por año y orden', () => {
    expect(LineaTiempo.admin?.group).toBe('Institucional')
    expect(LineaTiempo.admin?.useAsTitle).toBe('titulo')
    expect(LineaTiempo.admin?.defaultColumns).toEqual(['anio', 'titulo', 'active', 'orden'])
    expect(LineaTiempo.defaultSort).toEqual(['anio', 'orden'])
  })

  it('está registrada en payload.config.ts', () => {
    const src = readFileSync(resolve(ROOT, 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(src).toMatch(/import \{ LineaTiempo \} from '\.\/collections\/LineaTiempo'/)
    expect(src).toMatch(/\n\s+LineaTiempo,/)
  })
})

describe('LT-01: hooks', () => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })
  const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }

  it('afterChange audita y revalida la etiqueta linea-tiempo', async () => {
    for (const hook of LineaTiempo.hooks?.afterChange ?? []) await hook({ doc: { id: 4 }, operation: 'create', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'linea-tiempo', documento: '4' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('linea-tiempo', expect.anything())
  })

  it('afterDelete audita y revalida', async () => {
    for (const hook of LineaTiempo.hooks?.afterDelete ?? []) await hook({ doc: { id: 4 }, id: 4, req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'linea-tiempo', accion: 'eliminar' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('linea-tiempo', expect.anything())
  })
})

describe('LT-01: el endpoint de revalidación acepta linea-tiempo', () => {
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
  it('linea-tiempo -> 200', async () => {
    expect((await post('linea-tiempo')).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('linea-tiempo', {})
  })
  it('sin prefijos libres (linea-tiempo:1 -> 400)', async () => {
    expect((await post('linea-tiempo:1')).status).toBe(400)
  })
})

type Hito = {
  anio: number
  titulo: string
  descripcion: string
  traducciones: Record<'en' | 'ptBR' | 'gn', { titulo: string; descripcion: string }>
}
const hitos = LINEA_TIEMPO_HITOS as Hito[]

describe('LT-01 seed: datos', () => {
  it('los 5 hitos que publicaba el portal más el de 2026 aprobado por el PO, en orden, con traducciones completas', () => {
    expect(hitos.map((h) => h.anio)).toEqual([2007, 2008, 2010, 2015, 2024, 2026])
    expect(hitos[0].titulo).toBe('Creación por Ley N° 3.201')
    expect(hitos[0].traducciones.en.titulo).toBe('Established by Law No. 3,201')
    expect(hitos[4].traducciones.ptBR.titulo).toBe('Mais de 5.000 estudantes ativos')
    for (const h of hitos) {
      for (const loc of ['en', 'ptBR', 'gn'] as const) {
        expect(h.traducciones[loc].titulo.length).toBeGreaterThan(0)
        expect(h.traducciones[loc].descripcion.length).toBeGreaterThan(0)
      }
      expect(h.titulo.length).toBeLessThanOrEqual(120)
      expect(h.descripcion.length).toBeLessThanOrEqual(600)
    }
  })

  it('2026: Premio Nacional (fuente CONACYT 27-04-2026) con fecha, enlace https y solo la frase aprobada', () => {
    const h = hitos[5] as Hito & { etiquetaFecha?: string; enlace?: string }
    expect(h).toMatchObject({
      anio: 2026,
      etiquetaFecha: 'Abril de 2026',
      titulo: 'Premio Nacional a la Calidad y Excelencia en la Gestión',
      descripcion:
        'La Universidad Nacional de Concepción fue galardonada en la edición 2025 del Premio Nacional a la Calidad y Excelencia en la Gestión, en la categoría Sector Público, otorgado por el CONACYT.',
      enlace: 'https://www.conacyt.gov.py/conacyt-entrego-premio-nacional-calidad-excelencia-gestion-2025',
    })
    expect(h.traducciones.en.titulo).toBe('National Quality and Excellence in Management Award')
    expect(h.traducciones.ptBR.titulo).toBe('Prêmio Nacional de Qualidade e Excelência na Gestão')
    expect(h.traducciones.gn).toEqual({ titulo: h.titulo, descripcion: h.descripcion })
    // No se afirma una distinción que el PO aún no confirmó.
    for (const s of [h.descripcion, h.traducciones.en.descripcion, h.traducciones.ptBR.descripcion]) {
      expect(s).not.toMatch(/máxim|mayor|primer|top|highest|first|grand/i)
    }
    const p = toCmsPayloadLineaTiempo(h)
    expect(p).toMatchObject({ etiquetaFecha: 'Abril de 2026', enlace: h.enlace, active: true })
    expect(field('enlace')!.validate!(p.enlace)).toBe(true)
    // Los 5 hitos históricos no llevan fecha ni enlace (no se agregan datos no verificados).
    expect('enlace' in toCmsPayloadLineaTiempo(hitos[0])).toBe(false)
  })

  it('payload: publicado (comportamiento de hoy) y orden 1', () => {
    expect(toCmsPayloadLineaTiempo(hitos[0])).toMatchObject({ anio: 2007, titulo: hitos[0].titulo, active: true, orden: 1 })
    expect(toCmsPayloadLineaTiempo(hitos[0]).traducciones.ptBR.titulo).toBe('Criação pela Lei N° 3.201')
  })
})

/** CMS simulado en memoria: login y linea-tiempo por clave natural (anio + titulo). */
function fakeCms(existing: Array<Record<string, unknown>> = []) {
  const store = existing.map((d, i) => ({ id: 500 + i, ...d }))
  const writes: string[] = []
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    if (url.pathname === '/api/users/login') return json({ token: 't' })
    if (url.pathname === '/api/linea-tiempo' && method === 'GET') {
      const anio = Number(url.searchParams.get('where[anio][equals]'))
      const titulo = url.searchParams.get('where[titulo][equals]')
      return json({ docs: store.filter((d) => d.anio === anio && d.titulo === titulo) })
    }
    if (url.pathname === '/api/linea-tiempo' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      store.push({ id: 900 + store.length, ...body })
      writes.push(`POST ${body.titulo}`)
      return json({ doc: body }, 201)
    }
    writes.push(`${method} ${url.pathname}`)
    return json({ error: 'no' }, 404)
  })
  return { store, writes, fetchFn }
}

const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
const quiet = () => {}

describe('LT-01 seed: ejecución', () => {
  it('--dry-run no usa red', async () => {
    const fetchFn = vi.fn()
    const r = await run({ dryRun: true, deps: { env: {}, fetch: fetchFn, log: quiet, pace: async () => {} } })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r.plan).toMatchObject({ hitos: 6 })
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

  it('crea los 6 y una segunda ejecución no escribe nada (idempotente)', async () => {
    const cms = fakeCms()
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const first = await run({ deps })
    expect(first.counts).toMatchObject({ creados: 6, existentes: 0, errores: 0 })
    const before = cms.writes.length
    const second = await run({ deps })
    expect(second.counts).toMatchObject({ creados: 0, existentes: 6, errores: 0 })
    expect(cms.writes.length).toBe(before)
  })

  it('nunca modifica una fila existente (ediciones del PO)', async () => {
    const cms = fakeCms([{ anio: 2007, titulo: 'Creación por Ley N° 3.201', descripcion: 'Editado por el PO', active: false }])
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const r = await run({ deps })
    expect(r.counts).toMatchObject({ creados: 5, existentes: 1 })
    expect(cms.writes.every((w) => w.startsWith('POST '))).toBe(true)
    const row = cms.store.find((d) => d.anio === 2007)!
    expect(row.descripcion).toBe('Editado por el PO')
    expect(row.active).toBe(false)
  })

  it('el guion no contiene contraseñas literales ni correos por defecto', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/seed-linea-tiempo.mjs'), 'utf8')
    expect(src).not.toMatch(/CMS_PASSWORD\s*\|\|/)
    expect(src).not.toMatch(/CMS_EMAIL\s*\|\|\s*['"][^'"]/)
  })
})

describe('LT-01: migración', () => {
  const DIR = resolve(ROOT, 'apps/cms/src/migrations')
  const files = readdirSync(DIR).filter((f) => /^\d{8}_\d{6}_.+\.ts$/.test(f) && f !== 'index.ts').sort()
  const mine = files.find((f) => f.includes('_lt_01_'))

  it('existe, es la última, está registrada y su snapshot encadena con la anterior', () => {
    expect(mine).toBeDefined()
    const name = mine!.replace(/\.ts$/, '')
    expect(readFileSync(resolve(DIR, 'index.ts'), 'utf8')).toContain(`name: '${name}'`)
    const prevName = files[files.indexOf(mine!) - 1].replace(/\.ts$/, '')
    const snap = JSON.parse(readFileSync(resolve(DIR, `${name}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${prevName}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    const cols = snap.tables['public.linea_tiempo'].columns
    expect(cols.anio).toMatchObject({ type: 'numeric', notNull: true })
    expect(cols.titulo).toMatchObject({ type: 'varchar', notNull: true })
    expect(cols.imagen_id.type).toBe('integer')
    expect(cols.active.default).toBe(true)
    expect(snap.tables['public.payload_locked_documents_rels'].columns.linea_tiempo_id.type).toBe('integer')
  })

  it('el up es aditivo e idempotente', () => {
    const src = readFileSync(resolve(DIR, mine!), 'utf8')
    const upSql = src.split('export async function up')[1].split('export async function down')[0]
    expect(upSql).toContain('CREATE TABLE IF NOT EXISTS "linea_tiempo"')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "linea_tiempo_id" integer')
    expect(upSql).not.toMatch(/CREATE TABLE "/)
    expect(upSql).not.toMatch(/CREATE INDEX "/)
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
    const unprotected = upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/ADD CONSTRAINT/g)
    expect(unprotected).toBeNull()
  })

  it('el down se niega si hay hitos cargados', () => {
    const src = readFileSync(resolve(DIR, mine!), 'utf8')
    const downSql = src.split('export async function down')[1]
    expect(downSql).toMatch(/throw new Error/)
    expect(downSql.indexOf('throw new Error')).toBeLessThan(downSql.indexOf('DROP TABLE'))
  })
})

describe('LT-01: i18n y página', () => {
  const load = (loc: string) => JSON.parse(readFileSync(resolve(ROOT, `messages/${loc}/pages.historia.json`), 'utf8'))
  const keys = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]))
  const es = keys(load('es')).sort()

  it.each(['en', 'pt-BR', 'gn'])('%s tiene las mismas claves que es', (loc) => {
    expect(keys(load(loc)).sort()).toEqual(es)
  })

  it('los hitos ya no están en los catálogos; quedan los textos de la sección', () => {
    for (const loc of ['es', 'en', 'pt-BR', 'gn']) {
      const t = load(loc).timeline
      for (const m of ['m1', 'm2', 'm3', 'm4', 'm5']) expect(t[m]).toBeUndefined()
      for (const k of ['label', 'title', 'description', 'unavailable', 'moreInfo', 'newTab']) expect(typeof t[k]).toBe('string')
    }
  })

  it('la página lee el CMS y no tiene hitos escritos en el código', () => {
    const src = readFileSync(resolve(ROOT, 'app/[locale]/historia/page.tsx'), 'utf8')
    expect(src).toContain('getTimeline(')
    expect(src).not.toMatch(/timeline\.m\d/)
    expect(src).not.toMatch(/year:\s*'20\d\d'/)
  })
})
