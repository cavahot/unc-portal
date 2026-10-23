import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * DEP-09 (B): `GET /api/health` del portal. La liveness del portal NO depende del CMS (la caída del
 * CMS es informativa) y ninguna rama devuelve texto de excepciones (String(error), error.message).
 * Spec: docs/specs/deploy/DEP-09-health-y-rollback.md (escenario 9). Prueba con `fetch` simulado.
 */

type Health = { GET: () => Promise<Response> }

async function load(): Promise<Health> {
  vi.resetModules()
  return (await import('../../app/api/health/route')) as Health
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DEP-09 health del portal', () => {
  it('CMS arriba: 200 status up', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"status":"ok"}', { status: 200 })))
    const { GET } = await load()
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('up')
    expect(body.dependencies.cms.status).toBe('up')
  })

  it('CMS caído: el portal sigue vivo (200) y lo informa como degraded/down sin texto de la excepción', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect ECONNREFUSED 10.0.0.5:3002') }))
    const { GET } = await load()
    const res = await GET()
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).not.toContain('ECONNREFUSED')
    expect(text).not.toContain('10.0.0.5')
    const body = JSON.parse(text)
    expect(body.status).toBe('degraded')
    expect(body.dependencies.cms.status).toBe('down')
    expect(body.dependencies.cms.error).toBeUndefined()
  })

  it('CMS responde 503: sigue siendo informativo (200 del portal)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 503 })))
    const { GET } = await load()
    const res = await GET()
    expect(res.status).toBe(200)
    expect((await res.json()).dependencies.cms.status).toBe('down')
  })

  it('fallo propio inesperado: 500 genérico sin String(error)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    vi.spyOn(process, 'uptime').mockImplementation(() => { throw new Error('secreto-interno-xyz') })
    const { GET } = await load()
    const res = await GET()
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('secreto-interno-xyz')
    expect(JSON.parse(text)).toEqual({ status: 'down', service: 'portal' })
  })
})
