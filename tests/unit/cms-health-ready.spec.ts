import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * DEP-09 (A): ejercita el handler REAL de `GET /api/health/ready` del CMS con `pg` y `payload`
 * simulados (sin Docker, Postgres ni red). Amenazas cubiertas: health engañoso (verde con la BD
 * caída), fuga de host/URI/errores al anónimo y agotamiento de conexiones por una ruta pública.
 * Spec: docs/specs/deploy/DEP-09-health-y-rollback.md (escenarios 1-8).
 */

const m = vi.hoisted(() => ({
  poolCtor: vi.fn(),
  query: vi.fn(),
  end: vi.fn(async () => undefined),
  auth: vi.fn(),
}))

vi.mock('pg', () => ({
  Pool: class {
    constructor(options: unknown) {
      m.poolCtor(options)
    }
    query = m.query
    end = m.end
    on = () => this
  },
}))
vi.mock('payload', () => ({ getPayload: async () => ({ auth: m.auth }) }))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))

const DB_URI = 'postgresql://portal_user:SuperSecretPw@db.internal:5432/unc_portal'
const LEAKS = ['db.internal', 'SuperSecretPw', 'portal_user', 'ECONNREFUSED', '10.0.0.5', 'stack', 'postgresql://']

type Ready = { GET: (r: Request) => Promise<Response> }

/** Módulo recién importado: caché de resultado y limitador vacíos en cada caso. */
async function load(): Promise<Ready> {
  vi.resetModules()
  return (await import('../../apps/cms/src/app/api/health/ready/route')) as Ready
}

function req(ip?: string, extra: Record<string, string> = {}): Request {
  const headers: Record<string, string> = { ...extra }
  if (ip) headers['x-real-ip'] = ip
  return new Request('http://localhost:3002/api/health/ready', { headers })
}

async function textOf(res: Response): Promise<string> {
  return JSON.stringify([...res.headers.entries()]) + (await res.text())
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-21T12:00:00Z'))
  m.poolCtor.mockClear()
  m.query.mockReset()
  m.end.mockClear()
  m.auth.mockReset()
  vi.stubEnv('DATABASE_URI', DB_URI)
  vi.stubEnv('DATABASE_URL', '')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('DEP-09 readiness del CMS', () => {
  it('(7) BD ok: 200 {status:ready}, no-store y sin tocar la sesión', async () => {
    m.query.mockResolvedValue({ rows: [{ '?column?': 1 }] })
    const { GET } = await load()
    const res = await GET(req('203.0.113.9'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ready' })
    expect(res.headers.get('cache-control')).toMatch(/no-store/)
    expect(m.auth).not.toHaveBeenCalled()
    expect(m.query).toHaveBeenCalledWith('SELECT 1')
    expect(m.poolCtor.mock.calls[0][0]).toMatchObject({ connectionString: DB_URI, max: 1 })
  })

  it('(1) BD caída: 503 {status:unavailable} sin fuga de host, URI ni mensaje', async () => {
    m.query.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=SuperSecretPw'))
    const { GET } = await load()
    const res = await GET(req('203.0.113.9'))
    expect(res.status).toBe(503)
    const body = await textOf(res)
    expect(body).toContain('unavailable')
    for (const leak of LEAKS) expect(body).not.toContain(leak)
    // El detalle va al log, pero sin el mensaje (podría traer host:puerto o la URI).
    const logged = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ')
    expect(logged).not.toContain('SuperSecretPw')
    expect(logged).not.toContain('10.0.0.5')
  })

  it('(2) BD colgada: 503 a los ~2 s y se cierra la conexión', async () => {
    m.query.mockImplementation(() => new Promise(() => undefined))
    const { GET } = await load()
    const pending = GET(req('203.0.113.9'))
    await vi.advanceTimersByTimeAsync(2100)
    const res = await pending
    expect(res.status).toBe(503)
    expect(await textOf(res)).not.toContain('timeout')
    expect(m.end).toHaveBeenCalled()
  })

  it('(3) sin DATABASE_URI válida: 503 y no se construye ningún Pool', async () => {
    vi.stubEnv('DATABASE_URI', '')
    const { GET } = await load()
    const res = await GET(req('203.0.113.9'))
    expect(res.status).toBe(503)
    expect(m.poolCtor).not.toHaveBeenCalled()
  })

  it('(4) rate limit: la petición 31 desde la misma IP recibe 429 con Retry-After y sin consulta; otra IP pasa', async () => {
    m.query.mockResolvedValue({ rows: [] })
    const { GET } = await load()
    for (let i = 0; i < 30; i++) expect((await GET(req('203.0.113.9'))).status).toBe(200)
    const blocked = await GET(req('203.0.113.9'))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThanOrEqual(1)
    expect(await blocked.json()).toEqual({ status: 'rate_limited' })
    expect((await GET(req('203.0.113.10'))).status).toBe(200)
  })

  it('(4) el límite libera tras la ventana de 60 s', async () => {
    m.query.mockResolvedValue({ rows: [] })
    const { GET } = await load()
    for (let i = 0; i < 31; i++) await GET(req('203.0.113.9'))
    expect((await GET(req('203.0.113.9'))).status).toBe(429)
    vi.setSystemTime(new Date('2026-10-21T12:01:05Z'))
    expect((await GET(req('203.0.113.9'))).status).toBe(200)
  })

  it('(5) rotar x-forwarded-for no evade el límite (la clave es x-real-ip / no-ip)', async () => {
    m.query.mockResolvedValue({ rows: [] })
    const { GET } = await load()
    for (let i = 0; i < 30; i++) await GET(req(undefined, { 'x-forwarded-for': `198.51.100.${i}` }))
    const res = await GET(req(undefined, { 'x-forwarded-for': '198.51.100.250' }))
    expect(res.status).toBe(429)
  })

  it('(6) caché: dos peticiones en < 5 s hacen UNA consulta; pasados 5 s se vuelve a consultar', async () => {
    m.query.mockResolvedValue({ rows: [] })
    const { GET } = await load()
    await GET(req('203.0.113.9'))
    await GET(req('203.0.113.10'))
    expect(m.query).toHaveBeenCalledTimes(1)
    vi.setSystemTime(new Date('2026-10-21T12:00:06Z'))
    await GET(req('203.0.113.9'))
    expect(m.query).toHaveBeenCalledTimes(2)
  })

  it('(6) un 503 también se cachea (no hay tormenta de reconexiones con la BD caída)', async () => {
    m.query.mockRejectedValue(new Error('down'))
    const { GET } = await load()
    expect((await GET(req('203.0.113.9'))).status).toBe(503)
    expect((await GET(req('203.0.113.10'))).status).toBe(503)
    expect(m.poolCtor).toHaveBeenCalledTimes(1)
  })

  it('(6) peticiones concurrentes comparten una sola comprobación', async () => {
    m.query.mockResolvedValue({ rows: [] })
    const { GET } = await load()
    await Promise.all([GET(req('203.0.113.9')), GET(req('203.0.113.10')), GET(req('203.0.113.11'))])
    expect(m.query).toHaveBeenCalledTimes(1)
  })

  it('(8) liveness intacta: /api/health anónimo sigue siendo exactamente {status:ok} sin abrir conexión', async () => {
    m.auth.mockResolvedValue({ user: null })
    const { GET } = (await import('../../apps/cms/src/app/api/health/route')) as Ready
    const res = await GET(new Request('http://localhost:3002/api/health'))
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(m.poolCtor).not.toHaveBeenCalled()
  })
})
