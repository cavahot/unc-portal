// SEC-027-MW: pruebas de regresión de los dos middlewares (portal `proxy.ts` y CMS `apps/cms/src/middleware.ts`).
// Qué comprueba: (1) el CORS del CMS nunca refleja un origen ajeno y bloquea los endpoints internos entre orígenes;
// (2) el `matcher` del portal deja fuera `/api/*` y los estáticos; (3) el límite de tasa devuelve 429 y no se evade
// con `x-forwarded-for`; (4) la CSP de producción exige `default-src 'none'`, `frame-ancestors 'none'` y trae nonce.
// Amenazas: CORS permisivo con credenciales, evasión del 429 rotando cabeceras, CSP degradada sin que nadie lo note.
// Límite: son pruebas unitarias del código del middleware; no prueban nginx ni las cabeceras que agrega next.config.mjs
// ni el comportamiento de un navegador real. Tarea: SEC-027 / TASK-SEC-001 SEC-07.
import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El middleware de next-intl no es el objeto de la prueba (decide idioma y redirecciones); se simula como «continuar».
// Así se prueba SOLO lo que añade `proxy.ts`: límite de tasa, nonce y CSP.
vi.mock('next-intl/middleware', () => ({ default: () => () => NextResponse.next() }))

import { config as proxyConfig, proxy } from '../../proxy'
import { middleware as cmsMiddleware } from '../../apps/cms/src/middleware'
import { buildCSP } from '../../lib/csp'

const PORTAL = 'https://portal.example'
const EVIL = 'https://evil.example'

function cmsReq(path: string, init: { method?: string; origin?: string } = {}) {
  return new NextRequest(`https://cms.example${path}`, {
    method: init.method ?? 'GET',
    headers: init.origin ? { origin: init.origin } : {},
  })
}

describe('CMS middleware: CORS y endpoints internos', () => {
  beforeEach(() => {
    vi.stubEnv('PORTAL_URL', PORTAL)
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it.each(['/api/alerts', '/api/logs', '/api/metrics', '/api/auditoria', '/api/dashboard/stats', '/api/setup/create-bucket', '/api/health'])(
    'bloquea %s desde un origen ajeno (403) y no agrega cabeceras CORS',
    (path) => {
      const res = cmsMiddleware(cmsReq(path, { origin: EVIL }))
      expect(res.status).toBe(403)
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    },
  )

  it('deja pasar el endpoint interno desde el origen del portal y sin Origin (servidor a servidor)', () => {
    expect(cmsMiddleware(cmsReq('/api/logs', { origin: PORTAL })).status).toBe(200)
    expect(cmsMiddleware(cmsReq('/api/logs')).status).toBe(200)
  })

  it('el preflight de un origen ajeno NUNCA refleja ese origen: devuelve solo el del portal', () => {
    const res = cmsMiddleware(cmsReq('/api/users/login', { method: 'OPTIONS', origin: EVIL }))
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe(PORTAL)
    expect(res.headers.get('access-control-allow-origin')).not.toBe(EVIL)
  })

  it('una respuesta normal desde un origen ajeno tampoco refleja el origen', () => {
    const res = cmsMiddleware(cmsReq('/api/noticias', { origin: EVIL }))
    expect(res.headers.get('access-control-allow-origin')).toBe(PORTAL)
  })

  it('sin PORTAL_URL configurado no se emite Access-Control-Allow-Origin (no hay comodín)', () => {
    vi.stubEnv('PORTAL_URL', '')
    const res = cmsMiddleware(cmsReq('/api/noticias', { origin: EVIL }))
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*')
  })

  it('las rutas que no son /api/ no reciben cabeceras CORS', () => {
    expect(cmsMiddleware(cmsReq('/accesoSeguro', { origin: EVIL })).headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('portal proxy: matcher, límite de tasa y CSP', () => {
  const matcher = new RegExp(`^${(proxyConfig.matcher[0] as string).replace(/^\/\(\(/, '/((')}$`)
  const covered = (path: string) => matcher.test(path)

  it('el matcher cubre las páginas y excluye /api/*, estáticos y archivos de metadatos', () => {
    for (const p of ['/', '/es', '/gn/transparencia', '/en/informacion-publica']) expect(covered(p), p).toBe(true)
    for (const p of ['/api/contact', '/api/revalidate', '/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/images/a.png']) {
      expect(covered(p), p).toBe(false)
    }
  })

  const pageReq = (ip: string | null, extra: Record<string, string> = {}) =>
    new NextRequest('https://portal.example/es/transparencia', { headers: { ...(ip ? { 'x-real-ip': ip } : {}), ...extra } })

  it('responde 429 con Retry-After al superar 120 solicitudes de la misma IP', () => {
    const ip = '203.0.113.7'
    let last = proxy(pageReq(ip))
    for (let i = 0; i < 125; i++) last = proxy(pageReq(ip))
    expect(last.status).toBe(429)
    expect(last.headers.get('retry-after')).toBeTruthy()
    expect(last.headers.get('x-ratelimit-remaining')).toBe('0')
  })

  it('rotar x-forwarded-for NO evade el límite (solo cuenta x-real-ip)', () => {
    const ip = '203.0.113.8'
    let last = proxy(pageReq(ip, { 'x-forwarded-for': '1.1.1.1' }))
    for (let i = 0; i < 125; i++) last = proxy(pageReq(ip, { 'x-forwarded-for': `10.0.${i}.${i}` }))
    expect(last.status).toBe(429)
  })

  it('otra IP no hereda el bloqueo', () => {
    expect(proxy(pageReq('203.0.113.9')).status).not.toBe(429)
  })

  it('en producción emite Content-Security-Policy (no solo Report-Only) con nonce y cabeceras de tasa', () => {
    const res = proxy(pageReq('203.0.113.10'))
    const csp = res.headers.get('content-security-policy')
    expect(csp).toBeTruthy()
    expect(res.headers.get('content-security-policy-report-only')).toBeNull()
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/)
    expect(res.headers.get('x-ratelimit-limit')).toBe('120')
  })

  it('cada solicitud recibe un nonce distinto', () => {
    const nonce = (ip: string) => proxy(pageReq(ip)).headers.get('content-security-policy')!.match(/nonce-([A-Za-z0-9+/=]+)/)![1]
    expect(nonce('203.0.113.11')).not.toBe(nonce('203.0.113.12'))
  })
})

describe('CSP de producción', () => {
  // Los orígenes http/localhost solo se permiten fuera de producción (lib/csp.ts); se fija NODE_ENV para probar el caso real.
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'))
  afterEach(() => vi.unstubAllEnvs())
  const csp = () => buildCSP('abc123')
  const directive = (name: string) => csp().split('; ').find((d) => d.startsWith(`${name} `))

  it('niega por defecto y bloquea objetos, iframes ajenos y la inserción del sitio en otro marco', () => {
    expect(directive('default-src')).toBe("default-src 'none'")
    expect(directive('object-src')).toBe("object-src 'none'")
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive('base-uri')).toBe("base-uri 'self'")
    expect(directive('form-action')).toBe("form-action 'self'")
    expect(csp()).toContain('upgrade-insecure-requests')
  })

  it('no permite eval ni comodines de origen en scripts, y no concede orígenes http/localhost', () => {
    expect(directive('script-src')).not.toMatch(/unsafe-eval|\*|http:/)
    expect(directive('script-src')).toContain("'nonce-abc123'")
    expect(csp()).not.toMatch(/localhost|127\.0\.0\.1|http:\/\//)
  })
})
