/**
 * DEP-06: limitador de ventana deslizante, IP de cliente confiable y tope de cuerpo.
 * Amenaza: evasión del 429 rotando cabeceras controladas por el cliente, fuerza bruta
 * de secretos y cuerpos sin cota. Límite: sin servidor ni proxy real; el reloj es inyectado.
 * Evidencia: RDD-DEP-14, RDD-DEP-15. Spec: docs/specs/deploy/DEP-06-limites-api-y-cors.md
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRateLimiter, tooManyRequests } from '@/lib/security/rateLimit'
import { getClientIp, NO_IP } from '@/lib/security/clientIp'
import { readBodyLimited } from '@/lib/security/bodyLimit'

const ROOT = path.resolve(__dirname, '..', '..')

describe('getClientIp (RDD-DEP-15)', () => {
  it('usa solo x-real-ip, la cabecera que nginx sobrescribe', () => {
    const h = new Headers({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(h)).toBe('203.0.113.9')
  })

  it('ignora x-forwarded-for aunque sea la única cabecera (no confiable)', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }))).toBe(NO_IP)
  })

  it('sin cabecera devuelve un identificador fijo, nunca "undefined"', () => {
    expect(getClientIp(new Headers())).toBe(NO_IP)
    expect(NO_IP).not.toMatch(/undefined|null/)
  })

  it('acepta IPv6 y rechaza valores mal formados o gigantes', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1')
    expect(getClientIp(new Headers({ 'x-real-ip': '<script>' }))).toBe(NO_IP)
    expect(getClientIp(new Headers({ 'x-real-ip': 'a'.repeat(200) }))).toBe(NO_IP)
    expect(getClientIp(new Headers({ 'x-real-ip': '' }))).toBe(NO_IP)
  })
})

describe('createRateLimiter (reloj inyectado)', () => {
  function setup(limit = 3, windowMs = 60_000) {
    let t = 1_000_000
    const rl = createRateLimiter({ limit, windowMs, now: () => t })
    return { rl, advance: (ms: number) => { t += ms } }
  }

  it('permite hasta el límite y rechaza el siguiente con retryAfter >= 1', () => {
    const { rl } = setup()
    expect(rl.check('a').allowed).toBe(true)
    expect(rl.check('a').allowed).toBe(true)
    const third = rl.check('a')
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)
    const fourth = rl.check('a')
    expect(fourth.allowed).toBe(false)
    expect(fourth.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(fourth.retryAfterSeconds)).toBe(true)
  })

  it('la ventana expira y libera', () => {
    const { rl, advance } = setup()
    for (let i = 0; i < 3; i++) rl.check('a')
    expect(rl.check('a').allowed).toBe(false)
    advance(60_001)
    const r = rl.check('a')
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it('es deslizante: las marcas salen una a una', () => {
    const { rl, advance } = setup()
    rl.check('a') // t0
    advance(30_000)
    rl.check('a') // t0+30s
    rl.check('a') // t0+30s
    expect(rl.check('a').allowed).toBe(false)
    advance(30_001) // expira solo la primera
    expect(rl.check('a').allowed).toBe(true)
    expect(rl.check('a').allowed).toBe(false)
  })

  it('las peticiones rechazadas no extienden el bloqueo', () => {
    const { rl, advance } = setup()
    for (let i = 0; i < 3; i++) rl.check('a')
    for (let i = 0; i < 50; i++) rl.check('a') // insistencia durante el bloqueo
    advance(60_001)
    expect(rl.check('a').allowed).toBe(true)
  })

  it('las claves no se afectan entre sí', () => {
    const { rl } = setup(1)
    expect(rl.check('a').allowed).toBe(true)
    expect(rl.check('a').allowed).toBe(false)
    expect(rl.check('b').allowed).toBe(true)
  })

  it('acota la memoria con maxKeys', () => {
    let t = 0
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => t, maxKeys: 5 })
    for (let i = 0; i < 50; i++) rl.check(`ip-${i}`)
    expect(rl.size()).toBeLessThanOrEqual(5)
  })

  it('tooManyRequests responde 429 con Retry-After', async () => {
    const { rl } = setup(1)
    rl.check('a')
    const res = tooManyRequests(rl.check('a'), 'Demasiadas solicitudes.')
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
  })
})

describe('readBodyLimited', () => {
  const mk = (body: string, headers: Record<string, string> = {}) =>
    new Request('http://localhost/x', { method: 'POST', body, headers })

  it('lee un cuerpo dentro del tope', async () => {
    const r = await readBodyLimited(mk('{"a":1}'), 100)
    expect(r).toEqual({ ok: true, text: '{"a":1}' })
  })

  it('rechaza por Content-Length sin leer el cuerpo', async () => {
    const req = mk('x', { 'content-length': '999999' })
    const r = await readBodyLimited(req, 100)
    expect(r.ok).toBe(false)
    expect(req.bodyUsed).toBe(false)
  })

  it('rechaza por conteo real cuando falta Content-Length', async () => {
    expect((await readBodyLimited(mk('x'.repeat(500)), 100)).ok).toBe(false)
  })

  it('rechaza si Content-Length miente (declara menos de lo real)', async () => {
    expect((await readBodyLimited(mk('x'.repeat(500), { 'content-length': '10' }), 100)).ok).toBe(false)
  })

  it('ignora un Content-Length no numérico y cuenta el flujo', async () => {
    expect((await readBodyLimited(mk('ok', { 'content-length': 'abc' }), 100)).ok).toBe(true)
  })

  it('cuenta bytes, no caracteres', async () => {
    expect((await readBodyLimited(mk('ñ'.repeat(60)), 100)).ok).toBe(false) // 120 bytes
  })

  it('un cuerpo vacío es válido', async () => {
    const r = await readBodyLimited(new Request('http://localhost/x', { method: 'POST' }), 100)
    expect(r).toEqual({ ok: true, text: '' })
  })
})

describe('proxy.ts (RDD-DEP-14)', () => {
  const proxy = readFileSync(path.join(ROOT, 'proxy.ts'), 'utf8')
  const code = proxy.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  it('no usa request.ip (no existe en Next 16) ni x-forwarded-for', () => {
    expect(code).not.toMatch(/request\.ip\b/)
    expect(code).not.toMatch(/x-forwarded-for/i)
  })

  it('no conserva la rama muerta de /api/ y el matcher sigue excluyendo api/', () => {
    expect(code).not.toMatch(/startsWith\(['"]\/api\//)
    expect(code).not.toMatch(/Access-Control-Allow-Credentials/)
    expect(code).toMatch(/matcher[\s\S]*\(\?!\_next\/static[^']*\bapi\//)
  })
})
