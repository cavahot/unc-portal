import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth, resolveAlert, setThreshold, getThresholds } = vi.hoisted(() => ({
  auth: vi.fn(),
  resolveAlert: vi.fn(),
  setThreshold: vi.fn(),
  getThresholds: vi.fn(() => ({})),
}))

vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../lib/monitoring/alerts', () => ({
  alertManager: { resolveAlert, setThreshold, getThresholds },
}))

import { POST } from '../../apps/cms/src/app/api/alerts/route'
import { isAuthenticated } from '../../apps/cms/src/access/roles'
import { Auditoria } from '../../apps/cms/src/collections/Auditoria'

/** SEC-05: ejercita el handler real con autenticación sintética, sin CMS ni base de datos. */
function request(action: string, body: object): Request {
  return new Request(`http://localhost:3002/api/alerts?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('SEC-05: rutas administrativas con autorización efectiva', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza a viewer antes de modificar umbrales', async () => {
    auth.mockResolvedValue({ user: { id: 2, role: 'viewer' } })
    const response = await POST(request('set-threshold', { thresholdKey: 'cpu', value: 1 }))
    expect(response.status).toBe(403)
    expect(setThreshold).not.toHaveBeenCalled()
  })

  it('rechaza a anónimo antes de resolver alertas', async () => {
    auth.mockResolvedValue({ user: null })
    const response = await POST(request('resolve', { alertId: 'sample' }))
    expect(response.status).toBe(401)
    expect(resolveAlert).not.toHaveBeenCalled()
  })

  it('conserva la operación autorizada para superadmin', async () => {
    auth.mockResolvedValue({ user: { id: 1, role: 'superadmin' } })
    const response = await POST(request('resolve', { alertId: 'sample' }))
    expect(response.status).toBe(200)
    expect(resolveAlert).toHaveBeenCalledWith('sample')
  })
})

describe('SEC-05: nadie falsifica eventos de auditoría desde la API', () => {
  /** La escritura de eventos corresponde al servidor, nunca a una sesión de cliente. */
  it('rechaza creación para viewer y superadmin incluso con sesión válida', async () => {
    const create = Auditoria.access?.create
    expect(create).toBeDefined()
    for (const role of ['viewer', 'superadmin']) {
      const result = await create!({ req: { user: { id: 1, role } } } as never)
      expect(result).toBe(false)
    }
  })
})

describe('SEC-05: entrada al panel CMS', () => {
  /** Evita aceptar objetos de sesión sin rol válido como autenticación suficiente. */
  it('rechaza rol ausente o desconocido', () => {
    for (const role of [undefined, null, 'hacker']) {
      expect(isAuthenticated({ req: { user: { id: 4, role } } } as never)).toBe(false)
    }
  })

  it('conserva el acceso al panel para un rol declarado', () => {
    expect(isAuthenticated({ req: { user: { id: 1, role: 'superadmin' } } } as never)).toBe(true)
  })
})
