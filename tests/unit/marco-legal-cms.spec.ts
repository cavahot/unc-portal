// MLG-01: colección `marco-legal`, validadores, revalidación, migración, siembra e i18n.
// Spec: docs/specs/portal/MARCO-LEGAL.md §3, §4 y §5.
// Amenazas: (1) lectura anónima de documentos retirados (SEC-10); (2) escritura por roles no institucionales;
// (3) enlaces javascript:/http:/hosts ajenos guardados en el panel; (4) filas sin enlace; (5) cambios sin rastro
// o sin refrescar el portal; (6) sembrar en un CMS equivocado, con contraseña literal o pisando ediciones del PO;
// (7) migración no idempotente o que borre datos. Límite: contratos con CMS simulado; no ejecuta Payload ni la BD.
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

import { MarcoLegal, MARCO_LEGAL_ALLOWED_HOSTS } from '../../apps/cms/src/collections/MarcoLegal'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { validateAllowedHostUrl } from '../../apps/cms/src/utilities/validators'
import { ALLOWED_DOCUMENT_HOSTS, CATEGORY_ORDER } from '@/lib/cms/marcoLegal'
import { MARCO_LEGAL_DOCS, toCmsPayloadMarcoLegal } from '../../scripts/lib/marcoLegalSeedData.mjs'
import { run } from '../../scripts/seed-marco-legal.mjs'

const STRONG = 'Clave-Local-Segura-93'

type F = {
  name?: string
  type?: string
  defaultValue?: unknown
  required?: boolean
  options?: Array<{ value: string }>
  validate?: (v: unknown, o?: unknown) => unknown
}
const fields = MarcoLegal.fields as F[]
const field = (name: string) => fields.find((f) => f.name === name)

describe('MLG-01: acceso', () => {
  it('lectura limitada a activos (SEC-10) y escritura solo institucional', async () => {
    expect(MarcoLegal.access?.read).toBe(readActiveOrInstitutional)
    expect(MarcoLegal.access?.create).toBe(canWriteInstitutional)
    expect(MarcoLegal.access?.update).toBe(canWriteInstitutional)
    expect(MarcoLegal.access?.delete).toBe(canWriteInstitutional)
    const read = MarcoLegal.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'editor' } } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'web-admin' } } })).toBe(true)
  })

  it('un editor no puede crear (403 en REST)', async () => {
    const create = MarcoLegal.access?.create as (a: unknown) => unknown
    expect(await create({ req: { user: { role: 'editor' } } })).toBe(false)
    expect(await create({ req: { user: null } })).toBe(false)
  })
})

describe('MLG-01: validateAllowedHostUrl', () => {
  const hosts = ['drive.google.com', 'www.unc.edu.py']
  it('acepta https a un host permitido y vacío cuando no es obligatorio', () => {
    expect(validateAllowedHostUrl('https://drive.google.com/file/d/x/view', { allowedHosts: hosts })).toBe(true)
    expect(validateAllowedHostUrl('', { allowedHosts: hosts })).toBe(true)
    expect(validateAllowedHostUrl('', { allowedHosts: hosts, required: true })).not.toBe(true)
  })
  it.each([
    'javascript:alert(1)',
    'http://drive.google.com/x',
    'https://evil.example/x',
    'https://drive.google.com.evil.example/x',
    'https://u:p@drive.google.com/x',
    ' https://drive.google.com/x',
  ])('rechaza %s con un mensaje en español', (url) => {
    const r = validateAllowedHostUrl(url, { allowedHosts: hosts })
    expect(typeof r).toBe('string')
  })
  it('el mensaje de host no permitido nombra los hosts aceptados', () => {
    expect(validateAllowedHostUrl('https://evil.example/x', { allowedHosts: hosts })).toContain('drive.google.com')
  })
})

describe('MLG-01: campos', () => {
  it('la allowlist del CMS es la misma que la del portal', () => {
    expect([...MARCO_LEGAL_ALLOWED_HOSTS].sort()).toEqual([...ALLOWED_DOCUMENT_HOSTS].sort())
  })

  it('las categorías del CMS coinciden con el orden canónico del portal', () => {
    expect(field('category')?.options?.map((o) => o.value)).toEqual([...CATEGORY_ORDER])
  })

  it('externalUrl valida la allowlist y exige archivo o URL', () => {
    const v = field('externalUrl')?.validate
    expect(typeof v).toBe('function')
    const ok = { siblingData: { file: null } }
    expect(v!('https://drive.google.com/file/d/x/view', ok)).toBe(true)
    expect(v!('https://evil.example/x.pdf', ok)).not.toBe(true)
    expect(v!('', { siblingData: { file: null } })).toMatch(/archivo|URL/i)
    expect(v!(undefined, { siblingData: {} })).toMatch(/archivo|URL/i)
    expect(v!('', { siblingData: { file: 7 } })).toBe(true)
  })

  it('estado: vigente | derogado | historico, obligatorio y por defecto vigente', () => {
    const estado = field('estado')
    expect(estado?.type).toBe('select')
    expect(estado?.options?.map((o) => o.value)).toEqual(['vigente', 'derogado', 'historico'])
    expect(estado?.defaultValue).toBe('vigente')
    expect(estado?.required).toBe(true)
  })

  it('fechaDocumento es fecha opcional y nota un texto corto con tope', () => {
    expect(field('fechaDocumento')?.type).toBe('date')
    expect(field('nota')?.type).toBe('textarea')
    const v = field('nota')?.validate
    expect(v!('breve')).toBe(true)
    expect(v!('x'.repeat(281))).not.toBe(true)
  })

  it('panel en español: columnas y orden por categoría y orden', () => {
    expect(MarcoLegal.admin?.useAsTitle).toBe('title')
    expect(MarcoLegal.admin?.defaultColumns).toEqual(['title', 'category', 'estado', 'active', 'order'])
    expect(MarcoLegal.defaultSort).toEqual(['category', 'order'])
  })
})

describe('MLG-01: hooks', () => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })
  const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }

  it('afterChange audita y revalida la etiqueta marco-legal', async () => {
    for (const hook of MarcoLegal.hooks?.afterChange ?? []) await hook({ doc: { id: 4 }, operation: 'update', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'marco-legal', accion: 'actualizar', documento: '4' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('marco-legal', expect.anything())
  })

  it('afterDelete audita y revalida', async () => {
    for (const hook of MarcoLegal.hooks?.afterDelete ?? []) await hook({ doc: { id: 4 }, id: 4, req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'marco-legal', accion: 'eliminar' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('marco-legal', expect.anything())
  })
})

describe('MLG-01: el endpoint de revalidación acepta marco-legal', () => {
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
        headers: { 'x-real-ip': '203.0.113.44', authorization: `Bearer ${SECRET}` },
        body: JSON.stringify({ tag }),
      }),
    )
  }
  it('marco-legal -> 200', async () => {
    expect((await post('marco-legal')).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('marco-legal', {})
  })
  it('sin prefijos libres (marco-legal:1 -> 400)', async () => {
    expect((await post('marco-legal:1')).status).toBe(400)
  })
})

describe('MLG-01 seed: datos', () => {
  type Item = { title: string; driveId: string; category: string }
  const docs = MARCO_LEGAL_DOCS as Item[]

  it('44 documentos con título único y los conteos por categoría acordados', () => {
    expect(docs).toHaveLength(44)
    expect(new Set(docs.map((d) => d.title)).size).toBe(44)
    const counts: Record<string, number> = {}
    for (const d of docs) counts[d.category] = (counts[d.category] ?? 0) + 1
    expect(counts).toEqual({
      estatuto: 1,
      'reglamento-general': 12,
      'reglamentos-especiales': 7,
      codigos: 3,
      politicas: 7,
      planes: 6,
      manuales: 2,
      procedimientos: 3,
      protocolos: 2,
      'ley-creacion': 1,
    })
  })

  it('cada id de Drive tiene forma válida y no se repite', () => {
    expect(new Set(docs.map((d) => d.driveId)).size).toBe(44)
    for (const d of docs) expect(d.driveId).toMatch(/^[A-Za-z0-9_-]{25,60}$/)
  })

  it('conserva literal la errata del título VI del sitio publicado', () => {
    expect(docs[6].title).toBe('Reglamento General UNC: Título VI » Del Régimen Disciplinario»')
  })

  it('payload: activo, vigente, URL de Drive canónica y orden = posición en el sitio', () => {
    expect(toCmsPayloadMarcoLegal(docs[0], 0)).toEqual({
      title: 'Estatuto UNC',
      category: 'estatuto',
      externalUrl: 'https://drive.google.com/file/d/1I0rEzgzZcOFulmBzOrc9JHEC2oltTY68/view',
      order: 1,
      active: true,
      estado: 'vigente',
    })
    expect(toCmsPayloadMarcoLegal(docs[43], 43).order).toBe(44)
    for (const [i, d] of docs.entries()) {
      expect(validateAllowedHostUrl(toCmsPayloadMarcoLegal(d, i).externalUrl, { allowedHosts: [...MARCO_LEGAL_ALLOWED_HOSTS] })).toBe(true)
    }
  })
})

/** CMS simulado en memoria: login y marco-legal por título exacto. */
function fakeCms(existing: Array<Record<string, unknown>> = []) {
  const store = existing.map((d, i) => ({ id: 500 + i, ...d }))
  const writes: string[] = []
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    if (url.pathname === '/api/users/login') return json({ token: 't' })
    if (url.pathname === '/api/marco-legal' && method === 'GET') {
      const title = url.searchParams.get('where[title][equals]')
      return json({ docs: store.filter((d) => d.title === title) })
    }
    if (url.pathname === '/api/marco-legal' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      store.push({ id: 900 + store.length, ...body })
      writes.push(`POST ${body.title}`)
      return json({ doc: body }, 201)
    }
    const m = url.pathname.match(/^\/api\/marco-legal\/(\d+)$/)
    if (m && method === 'PATCH') {
      const d = store.find((x) => String(x.id) === m[1])!
      Object.assign(d, JSON.parse(String(init?.body)))
      writes.push(`PATCH ${d.title}`)
      return json({ doc: d })
    }
    return json({ error: 'no' }, 404)
  })
  return { store, writes, fetchFn }
}

const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
const quiet = () => {}

describe('MLG-01 seed: ejecución', () => {
  it('--dry-run no usa red', async () => {
    const fetchFn = vi.fn()
    const r = await run({ dryRun: true, deps: { env: {}, fetch: fetchFn, log: quiet, pace: async () => {} } })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r.plan).toMatchObject({ documentos: 44 })
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

  it('crea los 44 y una segunda ejecución no escribe nada (idempotente)', async () => {
    const cms = fakeCms()
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const first = await run({ deps })
    expect(first.counts).toMatchObject({ creados: 44, sinCambios: 0, errores: 0 })
    const before = cms.writes.length
    const second = await run({ deps })
    expect(second.counts).toMatchObject({ creados: 0, sinCambios: 44, conDiferencias: 0, actualizados: 0, errores: 0 })
    expect(cms.writes.length).toBe(before)
  })

  it('no pisa ediciones del PO salvo con --update, y aun así solo los campos del seed', async () => {
    const cms = fakeCms([
      { title: 'Estatuto UNC', category: 'estatuto', externalUrl: 'https://drive.google.com/file/d/OTRO/view', order: 1, active: false, estado: 'historico' },
    ])
    const deps = { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} }
    const r = await run({ deps })
    expect(r.counts).toMatchObject({ creados: 43, conDiferencias: 1, actualizados: 0 })
    expect(cms.writes.some((w) => w.startsWith('PATCH'))).toBe(false)

    const r2 = await run({ update: true, deps })
    expect(r2.counts).toMatchObject({ actualizados: 1 })
    const est = cms.store.find((d) => d.title === 'Estatuto UNC')!
    expect(est.externalUrl).toBe('https://drive.google.com/file/d/1I0rEzgzZcOFulmBzOrc9JHEC2oltTY68/view')
    // `active` y `estado` son decisiones del PO: el seed nunca los cambia en filas existentes.
    expect(est.active).toBe(false)
    expect(est.estado).toBe('historico')
  })

  it('el guion no contiene contraseñas literales ni correos por defecto', () => {
    const src = readFileSync(resolve(process.cwd(), 'scripts/seed-marco-legal.mjs'), 'utf8')
    expect(src).not.toMatch(/CMS_PASSWORD\s*\|\|/)
    // `|| ''` (vacío) se permite: lo que se prohíbe es un correo por defecto.
    expect(src).not.toMatch(/CMS_EMAIL\s*\|\|\s*['"][^'"]/)
  })
})

describe('MLG-01: migración', () => {
  const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
  const files = readdirSync(DIR).filter((f) => /^\d{8}_\d{6}_.+\.ts$/.test(f) && f !== 'index.ts').sort()
  const mine = files.find((f) => f.includes('_mlg_01_'))

  it('existe, está registrada en index.ts y su snapshot encadena con la migración anterior', () => {
    expect(mine).toBeDefined()
    const name = mine!.replace(/\.ts$/, '')
    expect(readFileSync(resolve(DIR, 'index.ts'), 'utf8')).toContain(`name: '${name}'`)
    const prevName = files[files.indexOf(mine!) - 1].replace(/\.ts$/, '')
    const snap = JSON.parse(readFileSync(resolve(DIR, `${name}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${prevName}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    const cols = snap.tables['public.marco_legal'].columns
    expect(cols.fecha_documento.type).toBe('timestamp(3) with time zone')
    expect(cols.estado).toMatchObject({ type: 'enum_marco_legal_estado', notNull: true, default: "'vigente'" })
    expect(cols.nota.type).toBe('varchar')
    expect(snap.enums['public.enum_marco_legal_estado'].values).toEqual(['vigente', 'derogado', 'historico'])
  })

  it('el up es aditivo e idempotente', () => {
    const src = readFileSync(resolve(DIR, mine!), 'utf8')
    const upSql = src.split('export async function up')[1].split('export async function down')[0]
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "fecha_documento" timestamp(3) with time zone')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "estado" "enum_marco_legal_estado" DEFAULT \'vigente\' NOT NULL')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "nota" varchar')
    expect(upSql).not.toMatch(/ADD COLUMN "/)
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
    const unprotected = upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/CREATE TYPE/g)
    expect(unprotected).toBeNull()
  })
})

describe('MLG-01: i18n de pages.marco-legal', () => {
  const load = (loc: string) => JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}/pages.marco-legal.json`), 'utf8'))
  const keys = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]))
  const es = keys(load('es')).sort()

  it.each(['en', 'pt-BR', 'gn'])('%s tiene las mismas claves que es', (loc) => {
    expect(keys(load(loc)).sort()).toEqual(es)
  })

  it('es trae las etiquetas de las 10 categorías, los estados y los formatos', () => {
    for (const c of CATEGORY_ORDER) expect(es).toContain(`categories.${c}`)
    for (const s of ['derogado', 'historico']) expect(es).toContain(`estado.${s}`)
    for (const f of ['pdf', 'doc', 'xls', 'drive', 'link']) expect(es).toContain(`format.${f}`)
  })
})
