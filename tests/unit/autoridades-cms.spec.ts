// AUT-01: configuración de la colección `autoridades` y de su siembra.
// Amenazas: (1) lectura anónima de filas retiradas (active=false); (2) escritura por roles no institucionales;
// (3) cambios sin rastro; (4) portal con caché vieja porque el CMS no puede invalidar la etiqueta;
// (5) sembrar en un CMS equivocado o pisar ediciones del PO al re-ejecutar; (6) enlaces CV peligrosos.
// Límite: contrato sobre la configuración y el guion con CMS simulado; no ejecuta Payload ni la BD.
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

import { Autoridades } from '../../apps/cms/src/collections/Autoridades'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import { AUTORIDADES, toCmsPayloadAutoridad } from '../../scripts/lib/autoridadesSeedData.mjs'
import { isLocalCmsUrl, run } from '../../scripts/seed-autoridades.mjs'

const STRONG = 'Clave-Local-Segura-93'

type F = { name?: string; validate?: (v: unknown) => unknown }
const fields = Autoridades.fields as F[]

describe('AUT-01: colección autoridades', () => {
  it('lectura pública limitada a activos (SEC-10) y escritura solo institucional', () => {
    expect(Autoridades.access?.read).toBe(readActiveOrInstitutional)
    expect(Autoridades.access?.create).toBe(canWriteInstitutional)
    expect(Autoridades.access?.update).toBe(canWriteInstitutional)
    expect(Autoridades.access?.delete).toBe(canWriteInstitutional)
  })

  it('anónimo y editor solo ven activos; superadmin y web-admin ven todo', async () => {
    const read = Autoridades.access?.read as (a: unknown) => unknown
    expect(await read({ req: { user: null } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'editor' } } })).toEqual({ active: { equals: true } })
    expect(await read({ req: { user: { role: 'web-admin' } } })).toBe(true)
    expect(await read({ req: { user: { role: 'superadmin' } } })).toBe(true)
  })

  describe('hooks', () => {
    beforeEach(() => {
      revalidatePortalTag.mockReset()
      logAudit.mockReset()
    })
    const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }

    it('afterChange audita y revalida la etiqueta autoridades', async () => {
      for (const hook of Autoridades.hooks?.afterChange ?? []) await hook({ doc: { id: 4 }, operation: 'update', req } as never)
      expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'autoridades', accion: 'actualizar', documento: '4' })
      expect(revalidatePortalTag).toHaveBeenCalledWith('autoridades', expect.anything())
    })

    it('afterDelete audita y revalida', async () => {
      for (const hook of Autoridades.hooks?.afterDelete ?? []) await hook({ doc: { id: 4 }, id: 4, req } as never)
      expect(logAudit.mock.calls[0][0]).toMatchObject({ coleccion: 'autoridades', accion: 'eliminar' })
      expect(revalidatePortalTag).toHaveBeenCalledWith('autoridades', expect.anything())
    })
  })

  it('cvUrl solo admite https sin credenciales (el CMS no guarda javascript: ni http:)', () => {
    const v = fields.find((f) => f.name === 'cvUrl')?.validate
    expect(typeof v).toBe('function')
    expect(v!('')).toBe(true)
    expect(v!(undefined)).toBe(true)
    expect(v!('https://example.test/cv.pdf')).toBe(true)
    expect(v!('javascript:alert(1)')).not.toBe(true)
    expect(v!('http://example.test/cv.pdf')).not.toBe(true)
  })
})

describe('AUT-01: el endpoint de revalidación del portal acepta la etiqueta autoridades', () => {
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
        headers: { 'x-real-ip': '203.0.113.31', authorization: `Bearer ${SECRET}` },
        body: JSON.stringify({ tag }),
      }),
    )
  }
  it('autoridades -> 200 y revalidateTag', async () => {
    expect((await post('autoridades')).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('autoridades', {})
  })
  it('sin prefijos libres (autoridades:1 -> 400)', async () => {
    expect((await post('autoridades:1')).status).toBe(400)
  })
})

describe('AUT-01 seed: datos', () => {
  it('reproduce las 8 personas hoy publicadas, con tipos válidos y clave natural única', () => {
    expect(AUTORIDADES).toHaveLength(8)
    expect(new Set(AUTORIDADES.map((a: { name: string }) => a.name)).size).toBe(8)
    const types = AUTORIDADES.map((a: { type: string }) => a.type)
    expect(types.filter((t: string) => t === 'rector')).toHaveLength(1)
    expect(types.filter((t: string) => t === 'vicerrector')).toHaveLength(1)
    expect(types.filter((t: string) => t === 'decano')).toHaveLength(6)
  })
  it('cada decano apunta a una facultad por slug; el resto no', () => {
    for (const a of AUTORIDADES as Array<{ type: string; facultadSlug?: string }>) {
      if (a.type === 'decano') expect(a.facultadSlug).toMatch(/^facultad-de-/)
      else expect(a.facultadSlug).toBeUndefined()
    }
  })
  it('el payload es active=true y trae el id de facultad solo para decanos', () => {
    const decano = (AUTORIDADES as Array<{ type: string }>).find((a) => a.type === 'decano')!
    expect(toCmsPayloadAutoridad(decano, 9)).toMatchObject({ active: true, faculty: 9, type: 'decano' })
    const rector = (AUTORIDADES as Array<{ type: string }>).find((a) => a.type === 'rector')!
    const body = toCmsPayloadAutoridad(rector)
    expect(body.active).toBe(true)
    expect(body).not.toHaveProperty('faculty')
    expect(body).not.toHaveProperty('facultadSlug')
  })
})

/** CMS simulado en memoria: login, facultades por slug y autoridades por nombre. */
function fakeCms(opts: { existingNames?: string[]; missingFaculties?: boolean } = {}) {
  const store: Array<Record<string, unknown>> = (opts.existingNames ?? []).map((name, i) => ({ id: 100 + i, name }))
  const faculties = opts.missingFaculties ? [] : ['odontologia', 'ciencias-agrarias', 'ciencias-economicas-y-administrativas', 'medicina', 'humanidades-y-ciencias-de-la-educacion', 'ciencias-exactas-y-tecnologicas'].map((s, i) => ({ id: i + 1, slug: `facultad-de-${s}` }))
  const log: string[] = []
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    log.push(`${method} ${url.pathname}`)
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
    if (url.pathname === '/api/users/login') return json({ token: 'tok' })
    if (url.pathname === '/api/facultades') {
      const slug = url.searchParams.get('where[slug][equals]')
      return json({ docs: faculties.filter((f) => f.slug === slug) })
    }
    if (url.pathname === '/api/autoridades' && method === 'GET') {
      const name = url.searchParams.get('where[name][equals]')
      return json({ docs: store.filter((s) => s.name === name) })
    }
    if (url.pathname === '/api/autoridades' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      store.push({ id: store.length + 1, ...body })
      return json({ doc: { id: store.length } }, 201)
    }
    return json({}, 404)
  })
  return { fetchFn, store, log }
}
const baseDeps = (f: ReturnType<typeof fakeCms>, extra: Record<string, unknown> = {}) => ({
  env: { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG, ...extra },
  fetch: f.fetchFn as never,
  log: () => {},
  pace: async () => {},
})

describe('AUT-01 seed: guion', () => {
  it('--dry-run no usa la red ni exige credenciales', async () => {
    const f = fakeCms()
    const r = await run({ dryRun: true, deps: { env: {}, fetch: f.fetchFn as never, log: () => {} } })
    expect(f.fetchFn).not.toHaveBeenCalled()
    expect(r.dryRun).toBe(true)
  })

  it('crea las 8 y es idempotente: la segunda corrida no hace POST', async () => {
    const f = fakeCms()
    const first = await run({ deps: baseDeps(f) })
    expect(first.counts).toMatchObject({ creadas: 8, existentes: 0, errores: 0 })
    const posts = f.log.filter((l) => l === 'POST /api/autoridades').length
    expect(posts).toBe(8)
    const second = await run({ deps: baseDeps(f) })
    expect(second.counts).toMatchObject({ creadas: 0, existentes: 8, errores: 0 })
    expect(f.log.filter((l) => l === 'POST /api/autoridades').length).toBe(8)
    expect(f.store.every((s) => s.active === true)).toBe(true)
  })

  it('no toca una fila existente (aunque el PO haya editado su bio)', async () => {
    const f = fakeCms({ existingNames: ['Prof. Dr. Clarito Rojas Marín'] })
    const r = await run({ deps: baseDeps(f) })
    expect(r.counts).toMatchObject({ creadas: 7, existentes: 1 })
    expect(f.log.some((l) => l.startsWith('PATCH') || l.startsWith('DELETE'))).toBe(false)
  })

  it('si falta la facultad del decano, informa el error y no crea un decano sin facultad', async () => {
    const f = fakeCms({ missingFaculties: true })
    const r = await run({ deps: baseDeps(f) })
    expect(r.counts).toMatchObject({ creadas: 2, errores: 6 })
    expect(f.store.some((s) => s.type === 'decano')).toBe(false)
  })

  it('rechaza destinos no locales sin la bandera explícita', async () => {
    const f = fakeCms()
    await expect(run({ deps: baseDeps(f, { CMS_URL: 'https://cms.example.test' }) })).rejects.toThrow(/local/i)
    expect(f.fetchFn).not.toHaveBeenCalled()
  })

  it('con --allow-remote exige https', async () => {
    const f = fakeCms()
    await expect(run({ allowRemote: true, deps: baseDeps(f, { CMS_URL: 'http://cms.example.test' }) })).rejects.toThrow(/https/i)
  })

  it('exige CMS_PASSWORD fuerte (SEC-08) antes de cualquier llamada', async () => {
    const f = fakeCms()
    await expect(run({ deps: { ...baseDeps(f), env: { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: 'admin' } } })).rejects.toThrow(/CMS_PASSWORD/)
    expect(f.fetchFn).not.toHaveBeenCalled()
  })

  it('isLocalCmsUrl solo acepta hosts de desarrollo', () => {
    expect(isLocalCmsUrl('http://localhost:3002')).toBe(true)
    expect(isLocalCmsUrl('http://127.0.0.1:3002')).toBe(true)
    expect(isLocalCmsUrl('https://cms.unc.edu.py')).toBe(false)
    expect(isLocalCmsUrl('no es url')).toBe(false)
  })
})
