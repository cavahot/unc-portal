import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  find: vi.fn(),
  count: vi.fn(),
  getLogs: vi.fn(),
  getActiveAlerts: vi.fn(),
  getRecentAlerts: vi.fn(),
  getThresholds: vi.fn(),
  poolCtor: vi.fn(),
  poolQuery: vi.fn(),
  s3Send: vi.fn(),
}))

vi.mock('payload', () => ({
  getPayload: async () => ({ auth: m.auth, find: m.find, count: m.count }),
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../lib/monitoring/logger', () => ({ logger: { getLogs: m.getLogs } }))
vi.mock('../../lib/monitoring/alerts', () => ({
  alertManager: {
    getActiveAlerts: m.getActiveAlerts,
    getRecentAlerts: m.getRecentAlerts,
    getThresholds: m.getThresholds,
    resolveAlert: vi.fn(),
    setThreshold: vi.fn(),
  },
}))
vi.mock('pg', () => ({
  Pool: class {
    constructor(options: unknown) {
      m.poolCtor(options)
    }
    query = m.poolQuery
    end = async () => undefined
  },
}))
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = m.s3Send
  },
  CreateBucketCommand: class {},
}))

import { GET as getAuditoria } from '../../apps/cms/src/app/api/auditoria/route'
import { GET as getLogs } from '../../apps/cms/src/app/api/logs/route'
import { GET as getMetrics } from '../../apps/cms/src/app/api/metrics/route'
import { GET as getAlerts } from '../../apps/cms/src/app/api/alerts/route'
import { GET as getDashNoticias } from '../../apps/cms/src/app/api/dashboard/noticias/route'
import { GET as getDashStats } from '../../apps/cms/src/app/api/dashboard/stats/route'
import { GET as getHealth } from '../../apps/cms/src/app/api/health/route'
import * as createBucket from '../../apps/cms/src/app/api/setup/create-bucket/route'
import { Auditoria } from '../../apps/cms/src/collections/Auditoria'

/**
 * DEP-04: ejercita los handlers reales con autenticación sintética, sin CMS, BD, Docker ni red.
 * Cubre ruta x rol, parámetros inválidos y que un error interno no se filtre al cliente.
 */

const SECRET_TEXT = 'secreto-interno-xyz'

const ADMIN_ROLES = ['auditor', 'superadmin'] as const
const DENIED_FOR_MONITORING = ['viewer', 'editor', 'web-admin', 'media-manager', 'hacker', null] as const
const DASHBOARD_ALLOWED = ['superadmin', 'web-admin', 'publisher', 'reviewer', 'editor', 'correspondent', 'auditor'] as const
const DASHBOARD_DENIED = ['viewer', 'media-manager', 'hacker', null] as const

function req(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost:3002${path}`, init)
}

function asRole(role: string | null) {
  m.auth.mockResolvedValue({ user: { id: 7, role } })
}

function asAnonymous() {
  m.auth.mockResolvedValue({ user: null })
}

const emptyFind = { docs: [], totalDocs: 0, page: 1, limit: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => {
  vi.clearAllMocks()
  m.find.mockResolvedValue(emptyFind)
  m.count.mockResolvedValue({ totalDocs: 0 })
  m.getLogs.mockReturnValue([])
  m.getActiveAlerts.mockReturnValue([])
  m.getRecentAlerts.mockReturnValue([])
  m.getThresholds.mockReturnValue({})
  m.poolQuery.mockResolvedValue({ rows: [] })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Rutas de solo superadmin/auditor con la función de datos que NO debe tocarse si se deniega. */
const monitoringRoutes = [
  { name: 'auditoria', call: () => getAuditoria(req('/api/auditoria')), data: () => m.find },
  { name: 'logs', call: () => getLogs(req('/api/logs')), data: () => m.getLogs },
  { name: 'metrics', call: () => getMetrics(req('/api/metrics')), data: () => m.find },
  { name: 'alerts', call: () => getAlerts(req('/api/alerts')), data: () => m.getActiveAlerts },
]

describe('DEP-04: auditoria/logs/metrics/alerts solo superadmin y auditor', () => {
  for (const route of monitoringRoutes) {
    describe(`GET /api/${route.name}`, () => {
      it('anónimo recibe 401 y no se consultan datos', async () => {
        asAnonymous()
        const response = await route.call()
        expect(response.status).toBe(401)
        expect(route.data()).not.toHaveBeenCalled()
      })

      for (const role of DENIED_FOR_MONITORING) {
        it(`rol ${String(role)} recibe 403 y no se consultan datos`, async () => {
          asRole(role)
          const response = await route.call()
          expect(response.status).toBe(403)
          expect(route.data()).not.toHaveBeenCalled()
        })
      }

      for (const role of ADMIN_ROLES) {
        it(`rol ${role} conserva 200`, async () => {
          asRole(role)
          const response = await route.call()
          expect(response.status).toBe(200)
        })
      }

      it('error interno devuelve 500 genérico sin el texto interno', async () => {
        asRole('superadmin')
        const boom = new Error(SECRET_TEXT)
        m.find.mockRejectedValue(boom)
        m.getLogs.mockImplementation(() => { throw boom })
        m.getActiveAlerts.mockImplementation(() => { throw boom })
        const response = await route.call()
        expect(response.status).toBe(500)
        const text = await response.text()
        expect(text).not.toContain(SECRET_TEXT)
        expect(text).not.toMatch(/details|stack/i)
      })

      it('si payload.auth lanza, 500 genérico sin fuga', async () => {
        m.auth.mockRejectedValue(new Error(SECRET_TEXT))
        const response = await route.call()
        expect(response.status).toBe(500)
        expect(await response.text()).not.toContain(SECRET_TEXT)
      })
    })
  }

  it('la consulta de /api/auditoria usa overrideAccess:false y el usuario de la sesión', async () => {
    asRole('auditor')
    await getAuditoria(req('/api/auditoria'))
    expect(m.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'auditoria', overrideAccess: false, user: { id: 7, role: 'auditor' } }),
    )
  })
})

describe('DEP-04: parámetros acotados (400 ante valores inválidos)', () => {
  const invalidLimits = ['0', '201', '-1', '1.5', 'abc', '']

  for (const limit of invalidLimits) {
    it(`auditoria rechaza limit=${JSON.stringify(limit)}`, async () => {
      asRole('auditor')
      const response = await getAuditoria(req(`/api/auditoria?limit=${limit}`))
      expect(response.status).toBe(400)
      expect(m.find).not.toHaveBeenCalled()
    })
    it(`logs rechaza limit=${JSON.stringify(limit)}`, async () => {
      asRole('auditor')
      const response = await getLogs(req(`/api/logs?limit=${limit}`))
      expect(response.status).toBe(400)
      expect(m.getLogs).not.toHaveBeenCalled()
    })
    it(`dashboard/noticias rechaza limit=${JSON.stringify(limit)}`, async () => {
      asRole('editor')
      const response = await getDashNoticias(req(`/api/dashboard/noticias?limit=${limit}`))
      expect(response.status).toBe(400)
      expect(m.find).not.toHaveBeenCalled()
    })
  }

  for (const limit of ['1', '200']) {
    it(`acepta el límite válido limit=${limit}`, async () => {
      asRole('auditor')
      expect((await getAuditoria(req(`/api/auditoria?limit=${limit}`))).status).toBe(200)
      expect((await getLogs(req(`/api/logs?limit=${limit}`))).status).toBe(200)
    })
  }

  for (const hours of ['0', '721', 'abc', '', '-3', '2.5']) {
    it(`logs y alerts rechazan hours=${JSON.stringify(hours)}`, async () => {
      asRole('superadmin')
      expect((await getLogs(req(`/api/logs?hours=${hours}`))).status).toBe(400)
      expect((await getAlerts(req(`/api/alerts?action=recent&hours=${hours}`))).status).toBe(400)
      expect(m.getLogs).not.toHaveBeenCalled()
      expect(m.getRecentAlerts).not.toHaveBeenCalled()
    })
  }

  it('acepta hours=720 y hours=1', async () => {
    asRole('superadmin')
    expect((await getLogs(req('/api/logs?hours=720'))).status).toBe(200)
    expect((await getAlerts(req('/api/alerts?action=recent&hours=1'))).status).toBe(200)
  })

  for (const category of ['../../etc/passwd', 'foo', 'API', '']) {
    it(`logs rechaza category=${JSON.stringify(category)}`, async () => {
      asRole('superadmin')
      const response = await getLogs(req(`/api/logs?category=${encodeURIComponent(category)}`))
      expect(response.status).toBe(400)
      expect(m.getLogs).not.toHaveBeenCalled()
    })
  }

  it('logs rechaza level fuera de la lista y acepta uno válido', async () => {
    asRole('superadmin')
    expect((await getLogs(req('/api/logs?level=foo'))).status).toBe(400)
    expect((await getLogs(req('/api/logs?category=security&level=error'))).status).toBe(200)
    expect(m.getLogs).toHaveBeenCalledWith('security', 100)
  })

  it('auditoria rechaza page, accion y resultado inválidos', async () => {
    asRole('auditor')
    for (const query of ['page=0', 'page=abc', 'accion=foo', 'resultado=foo']) {
      expect((await getAuditoria(req(`/api/auditoria?${query}`))).status).toBe(400)
    }
    expect(m.find).not.toHaveBeenCalled()
  })

  it('un anónimo con parámetros inválidos recibe 401 (la autenticación precede a la validación)', async () => {
    asAnonymous()
    expect((await getAuditoria(req('/api/auditoria?limit=abc'))).status).toBe(401)
    expect((await getLogs(req('/api/logs?hours=abc'))).status).toBe(401)
    expect((await getDashNoticias(req('/api/dashboard/noticias?status=foo'))).status).toBe(401)
  })
})

describe('DEP-04: Auditoria.access (log no mutable, lectura restringida)', () => {
  const run = async (fn: unknown, role: string | null | undefined, authenticated = true) =>
    (fn as (a: unknown) => unknown)({ req: { user: authenticated ? { id: 1, role } : null } })

  it('read: solo superadmin y auditor', async () => {
    const read = Auditoria.access?.read
    expect(read).toBeDefined()
    for (const role of ['superadmin', 'auditor']) expect(await run(read, role)).toBe(true)
    for (const role of ['viewer', 'editor', 'web-admin', 'publisher', 'media-manager', 'hacker', null, undefined]) {
      expect(await run(read, role)).toBe(false)
    }
    expect(await run(read, 'superadmin', false)).toBe(false)
  })

  it('update, delete y create están cerrados incluso para superadmin', async () => {
    for (const op of ['update', 'delete', 'create'] as const) {
      const fn = Auditoria.access?.[op]
      expect(fn).toBeDefined()
      for (const role of ['superadmin', 'auditor', 'viewer']) expect(await run(fn, role)).toBe(false)
    }
  })
})

describe('DEP-04: dashboard editorial con ACL de colección', () => {
  const calls = [
    { name: 'noticias', call: () => getDashNoticias(req('/api/dashboard/noticias')), spy: () => m.find },
    { name: 'stats', call: () => getDashStats(req('/api/dashboard/stats')), spy: () => m.count },
  ]

  for (const route of calls) {
    describe(`GET /api/dashboard/${route.name}`, () => {
      it('anónimo recibe 401 sin consulta', async () => {
        asAnonymous()
        expect((await route.call()).status).toBe(401)
        expect(route.spy()).not.toHaveBeenCalled()
      })

      for (const role of DASHBOARD_DENIED) {
        it(`rol ${String(role)} recibe 403 sin consulta`, async () => {
          asRole(role)
          expect((await route.call()).status).toBe(403)
          expect(route.spy()).not.toHaveBeenCalled()
        })
      }

      for (const role of DASHBOARD_ALLOWED) {
        it(`rol ${role} conserva 200 y la consulta respeta ACL (overrideAccess:false + user)`, async () => {
          asRole(role)
          expect((await route.call()).status).toBe(200)
          expect(route.spy()).toHaveBeenCalled()
          for (const [args] of route.spy().mock.calls) {
            expect(args).toMatchObject({ collection: 'noticias', overrideAccess: false, user: { id: 7, role } })
          }
        })
      }

      it('error interno devuelve 500 genérico sin el texto interno', async () => {
        asRole('editor')
        m.find.mockRejectedValue(new Error(SECRET_TEXT))
        m.count.mockRejectedValue(new Error(SECRET_TEXT))
        const response = await route.call()
        expect(response.status).toBe(500)
        expect(await response.text()).not.toContain(SECRET_TEXT)
      })
    })
  }

  it('noticias valida status contra lista blanca y la usa en la consulta', async () => {
    asRole('editor')
    for (const status of ['foo', '', 'draft%27%20OR%201=1']) {
      expect((await getDashNoticias(req(`/api/dashboard/noticias?status=${status}`))).status).toBe(400)
    }
    expect(m.find).not.toHaveBeenCalled()
    expect((await getDashNoticias(req('/api/dashboard/noticias?status=aprobado'))).status).toBe(200)
    expect(m.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { approvalStatus: { equals: 'aprobado' } } }),
    )
  })

  it('stats entrega números (totalDocs) y un total sumado, no objetos', async () => {
    asRole('editor')
    m.count.mockResolvedValue({ totalDocs: 2 })
    const body = await (await getDashStats(req('/api/dashboard/stats'))).json()
    expect(body.stats.borrador).toBe(2)
    expect(body.stats.total).toBe(10)
  })
})

describe('DEP-04: /api/health', () => {
  const dbURL = 'postgresql://svc:pw@db.internal:5432/unc'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
  })

  it('anónimo recibe solo {status:"ok"} sin tocar BD ni MinIO', async () => {
    asAnonymous()
    vi.stubEnv('DATABASE_URI', dbURL)
    const response = await getHealth(req('/api/health'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
    expect(m.poolCtor).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  for (const role of ['viewer', 'editor', 'web-admin', 'media-manager']) {
    it(`rol ${role} recibe solo la respuesta mínima`, async () => {
      asRole(role)
      const response = await getHealth(req('/api/health'))
      expect(await response.json()).toEqual({ status: 'ok' })
      expect(m.poolCtor).not.toHaveBeenCalled()
    })
  }

  for (const role of ADMIN_ROLES) {
    it(`rol ${role} recibe el detalle con la URI validada del entorno`, async () => {
      asRole(role)
      vi.stubEnv('DATABASE_URI', dbURL)
      const response = await getHealth(req('/api/health'))
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.services.database.status).toBe('up')
      expect(m.poolCtor).toHaveBeenCalledWith(expect.objectContaining({ connectionString: dbURL }))
    })
  }

  it('sin URI de BD falla cerrado: no crea conexión ni usa credencial embebida', async () => {
    asRole('superadmin')
    vi.stubEnv('DATABASE_URI', '')
    vi.stubEnv('DATABASE_URL', '')
    const response = await getHealth(req('/api/health'))
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.services.database.status).toBe('down')
    expect(m.poolCtor).not.toHaveBeenCalled()
    expect(JSON.stringify(m.poolCtor.mock.calls)).not.toContain('postgres:password@localhost')
  })

  it('si payload.auth falla responde 503 genérico sin fuga', async () => {
    m.auth.mockRejectedValue(new Error(SECRET_TEXT))
    const response = await getHealth(req('/api/health'))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(SECRET_TEXT)
  })
})

describe('DEP-04: POST /api/setup/create-bucket', () => {
  const post = () => createBucket.POST(req('/api/setup/create-bucket', { method: 'POST' }))

  it('ya no expone GET (la mutación de infraestructura no va por GET)', () => {
    expect((createBucket as Record<string, unknown>).GET).toBeUndefined()
  })

  it('anónimo recibe 401 sin llamar a S3', async () => {
    asAnonymous()
    expect((await post()).status).toBe(401)
    expect(m.s3Send).not.toHaveBeenCalled()
  })

  for (const role of ['viewer', 'editor', 'auditor', 'web-admin', 'hacker']) {
    it(`rol ${role} recibe 403 sin llamar a S3`, async () => {
      asRole(role)
      expect((await post()).status).toBe(403)
      expect(m.s3Send).not.toHaveBeenCalled()
    })
  }

  it('superadmin crea el bucket sin devolver la respuesta cruda de S3 ni imprimir el endpoint', async () => {
    asRole('superadmin')
    vi.stubEnv('S3_ENDPOINT', 'http://minio-interno.example:9000')
    m.s3Send.mockResolvedValue({ Location: '/unc-media', $metadata: { httpStatusCode: 200 } })
    const response = await post()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body).not.toHaveProperty('response')
    expect(JSON.stringify(body)).not.toContain('$metadata')
    const logged = JSON.stringify([...(console.log as any).mock.calls, ...(console.error as any).mock.calls])
    expect(logged).not.toContain('minio-interno.example')
  })

  it('bucket ya existente devuelve 200', async () => {
    asRole('superadmin')
    m.s3Send.mockRejectedValue(Object.assign(new Error('exists'), { Code: 'BucketAlreadyOwnedByYou' }))
    const response = await post()
    expect(response.status).toBe(200)
    expect((await response.json()).success).toBe(true)
  })

  it('error de S3 devuelve 500 genérico sin el texto interno', async () => {
    asRole('superadmin')
    m.s3Send.mockRejectedValue(new Error(`${SECRET_TEXT} http://minio-interno.example:9000`))
    const response = await post()
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).not.toContain(SECRET_TEXT)
    expect(text).not.toContain('minio-interno')
  })
})
