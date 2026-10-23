/**
 * DEP-16 (RDD-DEP-39..41): handlers reales de /api/revalidate, /api/preview y /api/monitoring.
 * Amenaza: 500 por longitudes distintas (oráculo/DoS de log), secreto crudo aceptado en query,
 * arranque con secreto débil y túnel de Sentry usado como relé hacia hosts ajenos (SSRF parcial).
 * Límite: next/cache, next/headers, next/navigation y fetch simulados; secretos sintéticos.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signPreviewToken } from '../../apps/cms/src/utilities/previewToken'

const revalidateTag = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const enable = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ enable }) }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT:${to}`) },
}))

const STRONG_REVAL = 'rv-Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3x'
const STRONG_PREVIEW = 'pv-9Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3'
const SENTRY_DSN = 'https://pub@o1.ingest.sentry.io/42'
const IP = { 'x-real-ip': '203.0.113.9' }

const req = (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
  new NextRequest(`http://localhost${url}`, init)
async function load<T>(p: string): Promise<T> {
  vi.resetModules()
  return (await import(p)) as T
}

beforeEach(() => {
  revalidateTag.mockClear(); revalidatePath.mockClear(); enable.mockClear()
  process.env.PREVIEW_SECRET = STRONG_PREVIEW
  process.env.REVALIDATION_SECRET = STRONG_REVAL
  process.env.NEXT_PUBLIC_SENTRY_DSN = SENTRY_DSN
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.PREVIEW_SECRET
  delete process.env.REVALIDATION_SECRET
  delete process.env.NEXT_PUBLIC_SENTRY_DSN
})

describe('POST /api/revalidate — comparación segura (DEP-16/C)', () => {
  type Mod = { POST: (r: NextRequest) => Promise<Response> }
  const call = async (auth: string | null) => {
    const { POST } = await load<Mod>('@/app/api/revalidate/route')
    const headers: Record<string, string> = { ...IP }
    if (auth !== null) headers.authorization = auth
    return POST(req('/api/revalidate', { method: 'POST', headers, body: JSON.stringify({ tag: 'noticias' }) }))
  }

  it('Bearer de longitud distinta → 401 uniforme (antes 500)', async () => {
    const res = await call('Bearer corto')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(revalidateTag).not.toHaveBeenCalled()
  })
  it('Bearer de la misma longitud pero distinto → 401', async () => {
    expect((await call(`Bearer ${STRONG_REVAL.replace(/.$/, '#')}`)).status).toBe(401)
  })
  it('sin Authorization → 401; esquema distinto de Bearer → 401', async () => {
    expect((await call(null)).status).toBe(401)
    expect((await call(STRONG_REVAL)).status).toBe(401)
  })
  it('Bearer correcto → 200 y revalida', async () => {
    expect((await call(`Bearer ${STRONG_REVAL}`)).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('noticias', {})
  })
  it.each([
    ['ausente', undefined],
    ['débil', 'changeme-revalidation-secret-123456'],
    ['corto', 'abc'],
  ])('secreto del servidor %s → 503 genérico, sin detalle ni valor', async (_l, value) => {
    if (value === undefined) delete process.env.REVALIDATION_SECRET
    else process.env.REVALIDATION_SECRET = value
    const res = await call(`Bearer ${value ?? 'x'}`)
    expect(res.status).toBe(503)
    const text = await res.text()
    expect(text).not.toContain('REVALIDATION_SECRET')
    if (value) expect(text).not.toContain(value)
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

describe('GET /api/preview — token firmado, sin secreto crudo (DEP-16/B,C,D)', () => {
  type Mod = { GET: (r: NextRequest) => Promise<Response> }
  const get = async (query: string) => {
    const { GET } = await load<Mod>('@/app/api/preview/route')
    return GET(req(`/api/preview?${query}`, { headers: IP }))
  }
  const tokenFor = (slug: string, type: 'noticia' | 'page', secret = STRONG_PREVIEW, now = Date.now(), ttl?: number) =>
    signPreviewToken({ slug, type }, secret, now, ttl)

  it('el secreto crudo en query ya NO se acepta (401, sin draft)', async () => {
    const res = await get(`secret=${STRONG_PREVIEW}&slug=mi-noticia`)
    expect(res.status).toBe(401)
    expect(enable).not.toHaveBeenCalled()
  })
  it('token válido de noticia → habilita draft y redirige a /noticias/<slug>', async () => {
    await expect(get(`token=${tokenFor('mi-noticia', 'noticia')}`)).rejects.toThrow('NEXT_REDIRECT:/noticias/mi-noticia')
    expect(enable).toHaveBeenCalled()
  })
  it('token válido de página → redirige a /<slug>', async () => {
    await expect(get(`token=${tokenFor('carreras/derecho', 'page')}`)).rejects.toThrow('NEXT_REDIRECT:/carreras/derecho')
  })
  it('el slug sale del token firmado: el de la query se ignora', async () => {
    await expect(get(`token=${tokenFor('a-firmado', 'noticia')}&slug=otro&type=page`)).rejects.toThrow('NEXT_REDIRECT:/noticias/a-firmado')
  })
  it.each([
    ['expirado', () => tokenFor('x', 'noticia', STRONG_PREVIEW, Date.now() - 10 * 60_000)],
    ['firmado con otro secreto', () => tokenFor('x', 'noticia', 'zB5nR8vK2xQm7TcL4wYp9HsJd3GfUe6A')],
    ['vida excesiva', () => tokenFor('x', 'noticia', STRONG_PREVIEW, Date.now(), 24 * 3600)],
    ['basura', () => 'no.es.token'],
  ])('token %s → 401 uniforme sin draft', async (_l, make) => {
    const res = await get(`token=${make()}`)
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Invalid preview token')
    expect(enable).not.toHaveBeenCalled()
  })
  it('sin token → 401', async () => {
    expect((await get('slug=x')).status).toBe(401)
  })
  it.each([
    ['ausente', undefined],
    ['débil', 'changeme-preview-secret-1234567890'],
  ])('secreto del servidor %s → 503 genérico y sin draft', async (_l, value) => {
    const token = tokenFor('x', 'noticia')
    if (value === undefined) delete process.env.PREVIEW_SECRET
    else process.env.PREVIEW_SECRET = value
    const res = await get(`token=${token}`)
    expect(res.status).toBe(503)
    const text = await res.text()
    expect(text).not.toContain('PREVIEW_SECRET')
    if (value) expect(text).not.toContain(value)
    expect(enable).not.toHaveBeenCalled()
  })
})

describe('POST /api/monitoring — solo el DSN del servidor (DEP-16/E)', () => {
  type Mod = { POST: (r: NextRequest) => Promise<Response> }
  const stubFetch = () => {
    const f = vi.fn(async (..._a: unknown[]) => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', f)
    return f
  }
  const envelope = (dsn?: string) => `${JSON.stringify(dsn ? { dsn } : {})}\n{"type":"event"}\n{}`
  const post = async (body: string) => {
    const { POST } = await load<Mod>('@/app/api/monitoring/route')
    return POST(req('/api/monitoring', { method: 'POST', headers: IP, body }))
  }

  it.each([
    ['host ajeno', 'https://pub@evil.example.net/42'],
    ['host interno', 'https://pub@127.0.0.1:8080/42'],
    ['mismo host, otro proyecto', 'https://pub@o1.ingest.sentry.io/99'],
    ['host con credenciales engañosas', 'https://o1.ingest.sentry.io@evil.example.net/42'],
  ])('envelope con DSN %s → 403 y sin fetch', async (_l, dsn) => {
    const f = stubFetch()
    const res = await post(envelope(dsn))
    expect(res.status).toBe(403)
    expect(f).not.toHaveBeenCalled()
  })
  it('envelope con el DSN configurado → reenvía al host del servidor', async () => {
    const f = stubFetch()
    expect((await post(envelope(SENTRY_DSN))).status).toBe(200)
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0][0])).toBe('https://o1.ingest.sentry.io/api/42/envelope/')
  })
  it('envelope sin DSN → usa el del servidor', async () => {
    const f = stubFetch()
    expect((await post(envelope())).status).toBe(200)
    expect(String(f.mock.calls[0][0])).toBe('https://o1.ingest.sentry.io/api/42/envelope/')
  })
  it('sin NEXT_PUBLIC_SENTRY_DSN en el servidor → 503 y sin fetch (no hay destino de confianza)', async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    const f = stubFetch()
    expect((await post(envelope('https://pub@evil.example.net/42'))).status).toBe(503)
    expect(f).not.toHaveBeenCalled()
  })
  it('DSN del servidor mal formado → 503 y sin fetch', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'no-es-url'
    const f = stubFetch()
    expect((await post(envelope())).status).toBe(503)
    expect(f).not.toHaveBeenCalled()
  })
  it('envelope ilegible sigue dando 400', async () => {
    stubFetch()
    expect((await post('no-json\n')).status).toBe(400)
  })
})
