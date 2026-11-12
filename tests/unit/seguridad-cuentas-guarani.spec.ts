// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, S1; hallazgo del verificador T5): la aprobación de glosas guaraníes
// autorizaba por el rol crudo (`req.user.role`) y escribía con `overrideAccess`, así que un superadmin con la contraseña
// provisoria o vencida podía aprobar. Qué comprueba: endpoint y hooks niegan a esa cuenta y siguen aceptando al
// superadmin al día. Límite: pruebas unitarias con `req` simulado; el acceso real lo arma la estrategia JWT de Payload.
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => '10.0.0.1' }))

import { guaraniApprovalEndpoint } from '../../apps/cms/src/endpoints/guaraniApproval'
import { enforceGuaraniApproval, enforceGuaraniDeleteGuard } from '../../apps/cms/src/hooks/guaraniApproval'

const now = new Date().toISOString()
const alDia = { id: 1, collection: 'users', role: 'superadmin', mustChangePassword: false, passwordChangedAt: now }
const pendiente = { ...alDia, mustChangePassword: true }
const vencido = { ...alDia, passwordChangedAt: null }

const term = { id: 5, terminoEs: 'Rectorado', terminoGn: 'Mburuvicha róga', oficial: true, fuenteUrl: 'https://example.invalid/fuente', confianza: 'A' }

const callEndpoint = async (user: Record<string, unknown>) => {
  const update = vi.fn(async () => ({ ...term, revisado: true }))
  const req = { user, routeParams: { id: 5 }, payload: { findByID: vi.fn(async () => term), update } }
  const res = (await guaraniApprovalEndpoint.handler(req as never)) as Response
  return { status: res.status, updates: update.mock.calls.length }
}

describe('S1: aprobación guaraní con el cambio de contraseña pendiente', () => {
  it('el endpoint niega (403, sin escribir) al superadmin con cambio pendiente o contraseña vencida', async () => {
    expect(await callEndpoint(pendiente)).toEqual({ status: 403, updates: 0 })
    expect(await callEndpoint(vencido)).toEqual({ status: 403, updates: 0 })
  })

  it('el endpoint sigue aprobando con el superadmin al día', async () => {
    expect(await callEndpoint(alDia)).toEqual({ status: 200, updates: 1 })
  })

  it('el hook de aprobación rechaza aprobar con el cambio pendiente y acepta al día', async () => {
    const run = (user: Record<string, unknown>) =>
      enforceGuaraniApproval({
        data: { estadoRevision: 'aprobado' },
        originalDoc: { ...term, estadoRevision: 'pendiente', revisado: false },
        req: { user },
      } as never)
    expect(() => run(pendiente)).toThrow()
    expect(() => run(alDia)).not.toThrow()
  })

  it('el guardia de borrado rechaza borrar una glosa aprobada con el cambio pendiente', async () => {
    const guard = (user: Record<string, unknown>) =>
      enforceGuaraniDeleteGuard({
        id: 5,
        req: { user, payload: { findByID: vi.fn(async () => ({ ...term, estadoRevision: 'aprobado', revisado: true })) } },
      } as never)
    await expect(guard(pendiente)).rejects.toThrow()
    await expect(guard(alDia)).resolves.not.toThrow()
  })
})
