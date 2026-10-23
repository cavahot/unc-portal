/**
 * DEP-06: handlers públicos reales de /api con límite de tasa por IP confiable y tope de cuerpo.
 * Amenaza: spam por contacto, fuerza bruta de PREVIEW_SECRET/Bearer de revalidate, cuerpos
 * enormes en el túnel de Sentry. Límite: nodemailer, fetch, next/headers, next/navigation y
 * next/cache simulados; el store es en memoria (cada prueba reinicia módulos).
 * Evidencia: RDD-DEP-14, RDD-DEP-15. Spec: docs/specs/deploy/DEP-06-limites-api-y-cors.md
 * DEP-16: los secretos sintéticos pasan a ≥ 32 caracteres (el handler responde 503 con uno débil), el preview
 * usa token firmado en vez de `secret` en query y el túnel de Sentry exige NEXT_PUBLIC_SENTRY_DSN en el servidor.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { signPreviewToken } from '../../apps/cms/src/utilities/previewToken'

const sendMail = vi.hoisted(() => vi.fn(async (_message?: Record<string, unknown>) => ({})))
// DEP-10: se espía createTransport para comprobar qué variables SMTP llegan al transporte.
const createTransport = vi.hoisted(() => vi.fn((_options?: Record<string, unknown>) => ({ sendMail })))
const revalidateTag = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const enable = vi.hoisted(() => vi.fn())

vi.mock('nodemailer', () => ({ default: { createTransport } }))
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ enable }) }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT:${to}`) },
}))

const ROOT = path.resolve(__dirname, '..', '..')
const REAL_IP = '203.0.113.9'
// DEP-16: secretos sintéticos de 32+ caracteres y sin marcadores de ejemplo.
const PREVIEW_SECRET = 'preview-sintetico-Qx2mVb7LpZr4TnW8sYc1'
const REVAL_SECRET = 'reval-sintetico-Qx2mVb7LpZr4TnW8sYc1H'
const SENTRY_DSN = 'https://pub@o1.ingest.sentry.io/42'

function req(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new NextRequest(`http://localhost${url}`, init)
}

const contactBody = JSON.stringify({ name: 'Ana', email: 'ana@example.com', subject: 'Hola', message: 'Mensaje' })
const contactReq = (headers: Record<string, string> = { 'x-real-ip': REAL_IP }, body = contactBody) =>
  req('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body })

async function load<T>(modulePath: string): Promise<T> {
  vi.resetModules()
  return (await import(modulePath)) as T
}

beforeEach(() => {
  createTransport.mockClear(); sendMail.mockClear(); revalidateTag.mockClear(); revalidatePath.mockClear(); enable.mockClear()
  process.env.PREVIEW_SECRET = PREVIEW_SECRET
  process.env.REVALIDATION_SECRET = REVAL_SECRET
  process.env.NEXT_PUBLIC_SENTRY_DSN = SENTRY_DSN
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  delete process.env.PREVIEW_SECRET
  delete process.env.REVALIDATION_SECRET
  delete process.env.NEXT_PUBLIC_SENTRY_DSN
})

describe('POST /api/contact', () => {
  it('el 6.º POST de la ventana devuelve 429 con Retry-After y no envía correo', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    for (let i = 0; i < 5; i++) expect((await POST(contactReq())).status).toBe(200)
    const sixth = await POST(contactReq())
    expect(sixth.status).toBe(429)
    expect(Number(sixth.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
    expect(sendMail).toHaveBeenCalledTimes(5)
  })

  it('rotar x-forwarded-for NO evade el límite', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      statuses.push((await POST(contactReq({ 'x-real-ip': REAL_IP, 'x-forwarded-for': `10.0.0.${i}, 198.51.100.${i}` }))).status)
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
  })

  it('sin x-real-ip usa un cubo compartido: rotar x-forwarded-for tampoco evade', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await POST(contactReq({ 'x-forwarded-for': `10.9.9.${i}` }))).status)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
  })

  it('IPs reales distintas no se bloquean entre sí', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    for (let i = 0; i < 6; i++) await POST(contactReq({ 'x-real-ip': REAL_IP }))
    expect((await POST(contactReq({ 'x-real-ip': '203.0.113.10' }))).status).toBe(200)
  })

  it('cuerpo con Content-Length > tope devuelve 413 sin enviar correo', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    const res = await POST(contactReq({ 'x-real-ip': REAL_IP, 'content-length': String(40 * 1024) }))
    expect(res.status).toBe(413)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('cuerpo real > tope con Content-Length mentiroso devuelve 413', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    const big = JSON.stringify({ name: 'Ana', email: 'ana@example.com', subject: 'x', message: 'm'.repeat(40_000) })
    const res = await POST(contactReq({ 'x-real-ip': REAL_IP, 'content-length': '10' }, big))
    expect(res.status).toBe(413)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('mantiene el comportamiento: JSON inválido 400, campos faltantes 400, éxito { ok: true }', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    expect((await POST(contactReq({ 'x-real-ip': REAL_IP }, '{no-json'))).status).toBe(400)
    expect((await POST(contactReq({ 'x-real-ip': REAL_IP }, JSON.stringify({ name: 'a' })))).status).toBe(400)
    const ok = await POST(contactReq({ 'x-real-ip': REAL_IP }))
    expect(await ok.json()).toEqual({ ok: true })
  })
})

// DEP-10 (RDD-DEP-33): el portal usa los MISMOS nombres SMTP que el CMS. Amenaza: el correo de contacto
// sale sin credenciales o desde el remitente por defecto porque el compose entrega un nombre y el código lee otro.
// Límite: nodemailer simulado; no prueba entrega real ni Mailpit. Valores sintéticos.
describe('POST /api/contact — variables SMTP canónicas (DEP-10)', () => {
  const run = async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/contact/route')
    return POST(contactReq())
  }

  it('autentica con SMTP_USER y SMTP_PASSWORD', async () => {
    vi.stubEnv('SMTP_USER', 'usuario-sintetico')
    vi.stubEnv('SMTP_PASSWORD', 'clave-sintetica')
    expect((await run()).status).toBe(200)
    expect(createTransport.mock.calls[0][0]).toMatchObject({ auth: { user: 'usuario-sintetico', pass: 'clave-sintetica' } })
  })

  it('ignora el nombre obsoleto SMTP_PASS (no autentica con esa contraseña)', async () => {
    vi.stubEnv('SMTP_USER', 'usuario-sintetico')
    vi.stubEnv('SMTP_PASS', 'clave-obsoleta')
    await run()
    const options = createTransport.mock.calls[0][0] as { auth?: { pass?: string } }
    expect(options.auth?.pass).not.toBe('clave-obsoleta')
  })

  it('el remitente sale de SMTP_FROM_ADDRESS y se ignora SMTP_FROM', async () => {
    vi.stubEnv('SMTP_FROM_ADDRESS', 'remitente@example.com')
    vi.stubEnv('SMTP_FROM', 'obsoleto@example.com')
    await run()
    const message = sendMail.mock.calls[0][0] as { from: string }
    expect(message.from).toContain('remitente@example.com')
    expect(message.from).not.toContain('obsoleto@example.com')
  })

  it('el destino sale de CONTACT_TO', async () => {
    vi.stubEnv('CONTACT_TO', 'destino@example.com')
    await run()
    expect((sendMail.mock.calls[0][0] as { to: string }).to).toBe('destino@example.com')
  })

  it.each([
    ['true', '587', true],
    ['false', '465', false],
    [undefined, '465', true],
    [undefined, '587', false],
  ])('SMTP_SECURE=%s con puerto %s → secure=%s', async (secure, port, expected) => {
    if (secure !== undefined) vi.stubEnv('SMTP_SECURE', secure)
    vi.stubEnv('SMTP_PORT', port)
    await run()
    expect(createTransport.mock.calls[0][0]).toMatchObject({ secure: expected, port: Number(port) })
  })
})

describe('GET /api/preview', () => {
  // DEP-16: el enlace lleva un token firmado (?token=), no el secreto. 'valid' firma un token vigente.
  const previewReq = (token: string, headers: Record<string, string> = { 'x-real-ip': REAL_IP }) =>
    req(`/api/preview?token=${token === 'valid' ? signPreviewToken({ slug: 'mi-noticia', type: 'noticia' }, PREVIEW_SECRET) : token}`, { headers })

  it('el 21.º GET devuelve 429 antes de verificar el token (fuerza bruta)', async () => {
    const { GET } = await load<{ GET: (r: NextRequest) => Promise<Response> }>('@/app/api/preview/route')
    for (let i = 0; i < 20; i++) expect((await GET(previewReq(`mal-${i}`))).status).toBe(401)
    const res = await GET(previewReq('valid'))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).not.toBeNull()
    expect(enable).not.toHaveBeenCalled()
  })

  it('rotar x-forwarded-for no evade el límite', async () => {
    const { GET } = await load<{ GET: (r: NextRequest) => Promise<Response> }>('@/app/api/preview/route')
    let last = 0
    for (let i = 0; i < 21; i++) last = (await GET(previewReq('mal', { 'x-real-ip': REAL_IP, 'x-forwarded-for': `10.1.1.${i}` }))).status
    expect(last).toBe(429)
  })

  it('dentro del límite mantiene 401 con token inválido y redirige con el válido', async () => {
    const { GET } = await load<{ GET: (r: NextRequest) => Promise<Response> }>('@/app/api/preview/route')
    expect((await GET(previewReq('mal'))).status).toBe(401)
    await expect(GET(previewReq('valid'))).rejects.toThrow('NEXT_REDIRECT:/noticias/mi-noticia')
    expect(enable).toHaveBeenCalled()
  })
})

describe('POST /api/revalidate', () => {
  const revReq = (headers: Record<string, string> = { 'x-real-ip': REAL_IP }, body = JSON.stringify({ tag: 'noticias' })) =>
    req('/api/revalidate', {
      method: 'POST',
      headers: { authorization: `Bearer ${REVAL_SECRET}`, ...headers },
      body,
    })

  it('el 121.º POST devuelve 429 y no revalida', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/revalidate/route')
    for (let i = 0; i < 120; i++) expect((await POST(revReq())).status).toBe(200)
    revalidateTag.mockClear()
    const res = await POST(revReq())
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('rotar x-forwarded-for no evade el límite', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/revalidate/route')
    let last = 0
    for (let i = 0; i < 121; i++) last = (await POST(revReq({ 'x-real-ip': REAL_IP, 'x-forwarded-for': `10.2.2.${i % 250}` }))).status
    expect(last).toBe(429)
  })

  it('cuerpo > tope devuelve 413 con Bearer válido; comportamiento previo intacto', async () => {
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/revalidate/route')
    expect((await POST(revReq({ 'x-real-ip': REAL_IP }, JSON.stringify({ tag: 'x', pad: 'p'.repeat(20_000) })))).status).toBe(413)
    expect((await POST(req('/api/revalidate', { method: 'POST', headers: { 'x-real-ip': REAL_IP, authorization: `Bearer ${REVAL_SECRET.slice(0, -1)}x` }, body: '{}' }))).status).toBe(401)
    const ok = await POST(revReq())
    expect(ok.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('noticias', {})
  })
})

describe('POST /api/monitoring', () => {
  const envelope = (extra = '') => `${JSON.stringify({ dsn: SENTRY_DSN })}\n{"type":"event"}\n${extra}`
  const monReq = (body: string, headers: Record<string, string> = { 'x-real-ip': REAL_IP }) =>
    req('/api/monitoring', { method: 'POST', headers, body })
  const stubFetch = () => {
    const f = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', f)
    return f
  }

  it('el 61.º POST devuelve 429 y no reenvía a Sentry', async () => {
    const f = stubFetch()
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/monitoring/route')
    for (let i = 0; i < 60; i++) expect((await POST(monReq(envelope()))).status).toBe(200)
    f.mockClear()
    const res = await POST(monReq(envelope()))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).not.toBeNull()
    expect(f).not.toHaveBeenCalled()
  })

  it('rotar x-forwarded-for no evade el límite', async () => {
    stubFetch()
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/monitoring/route')
    let last = 0
    for (let i = 0; i < 61; i++) last = (await POST(monReq(envelope(), { 'x-real-ip': REAL_IP, 'x-forwarded-for': `10.3.3.${i}` }))).status
    expect(last).toBe(429)
  })

  it('cuerpo real > 1 MiB sin Content-Length devuelve 413 y no llama a fetch', async () => {
    const f = stubFetch()
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/monitoring/route')
    const res = await POST(monReq(envelope('x'.repeat(1024 * 1024 + 10))))
    expect(res.status).toBe(413)
    expect(f).not.toHaveBeenCalled()
  })

  it('envelope válido sigue reenviándose a Sentry; envelope inválido 400', async () => {
    const f = stubFetch()
    const { POST } = await load<{ POST: (r: NextRequest) => Promise<Response> }>('@/app/api/monitoring/route')
    expect((await POST(monReq(envelope()))).status).toBe(200)
    expect(f).toHaveBeenCalledTimes(1)
    expect((await POST(monReq('no-json\n'))).status).toBe(400)
  })
})

describe('rutas no listadas', () => {
  it('health y disable-preview no importan el limitador (sin cambios)', () => {
    for (const f of ['app/api/health/route.ts', 'app/api/disable-preview/route.ts']) {
      expect(readFileSync(path.join(ROOT, f), 'utf8')).not.toMatch(/security\/rateLimit/)
    }
  })
})
