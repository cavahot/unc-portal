// GLO-GN-APPROVAL-02: regresiones del flujo de aprobación del glosario guaraní.
// Qué hace: fija tres defectos hallados en la revisión previa al PR: (1) el endpoint de aprobación no
// propagaba la sesión al hook, (2) una glosa aprobada no se podía rechazar ni revocar y (3) editar una
// glosa aprobada reescribía al aprobador y la fecha.
// Amenaza: una traducción errónea que no se puede retirar del portal y una auditoría de aprobación falsa.
// Límite: pruebas unitarias con dobles de Payload; no ejercitan la base de datos ni el panel real.
import { describe, expect, it, vi } from 'vitest'
import { enforceGuaraniApproval } from '../../apps/cms/src/hooks/guaraniApproval'
import { guaraniApprovalEndpoint } from '../../apps/cms/src/endpoints/guaraniApproval'

/** Glosa aprobada y completa, tal como queda en la base tras una aprobación válida. */
const aprobada = {
  terminoEs: 'Facultad',
  terminoGn: 'Mbo\'ehaoty',
  oficial: true,
  fuenteUrl: 'https://spl.gov.py/es/diccionario-guarani-paraguayo/',
  confianza: 'A',
  estadoRevision: 'aprobado',
  revisado: true,
  aprobadoPor: 7,
  fechaAprobacion: '2026-01-01T00:00:00.000Z',
}

/** Ejecuta el hook con la misma forma de argumentos que usa Payload. */
function runHook(data: Record<string, unknown>, originalDoc: Record<string, unknown> | undefined, user?: { id: number; role: string }) {
  return enforceGuaraniApproval({ data, originalDoc, req: { user } } as never) as Record<string, unknown>
}

describe('GLO-GN-APPROVAL-02 hook', () => {
  it('un superadmin puede rechazar una glosa ya aprobada y deja de ser pública', () => {
    const result = runHook({ estadoRevision: 'rechazado' }, aprobada, { id: 9, role: 'superadmin' })
    expect(result.estadoRevision).toBe('rechazado')
    expect(result.revisado).toBe(false)
  })

  it('desmarcar «revisado» revoca la aprobación y la devuelve a pendiente', () => {
    const result = runHook({ revisado: false }, aprobada, { id: 9, role: 'superadmin' })
    expect(result.estadoRevision).toBe('pendiente')
    expect(result.revisado).toBe(false)
  })

  it('al revocar se limpian aprobador y fecha para no dejar una auditoría falsa', () => {
    const result = runHook({ estadoRevision: 'rechazado' }, aprobada, { id: 9, role: 'superadmin' })
    expect(result.aprobadoPor).toBeNull()
    expect(result.fechaAprobacion).toBeNull()
  })

  it('editar una glosa aprobada NO cambia quién la aprobó ni cuándo', () => {
    const result = runHook({ terminoGn: 'Mbo\'ehaoty renovado' }, aprobada, { id: 9, role: 'superadmin' })
    // Payload fusiona `data` con el documento: si el hook no lo toca, se conserva el valor original.
    expect(result.aprobadoPor === undefined || result.aprobadoPor === aprobada.aprobadoPor).toBe(true)
    expect(result.fechaAprobacion === undefined || result.fechaAprobacion === aprobada.fechaAprobacion).toBe(true)
    expect(result.estadoRevision).toBe('aprobado')
    expect(result.revisado).toBe(true)
  })

  it('una aprobación nueva registra al superadmin actual y la fecha', () => {
    const pendiente = { ...aprobada, estadoRevision: 'pendiente', revisado: false, aprobadoPor: undefined, fechaAprobacion: undefined }
    const result = runHook({ estadoRevision: 'aprobado' }, pendiente, { id: 9, role: 'superadmin' })
    expect(result.estadoRevision).toBe('aprobado')
    expect(result.revisado).toBe(true)
    expect(result.aprobadoPor).toBe(9)
    expect(typeof result.fechaAprobacion).toBe('string')
  })

  it('un rol no superadmin sigue sin poder tocar una glosa aprobada', () => {
    expect(() => runHook({ estadoRevision: 'rechazado' }, aprobada, { id: 3, role: 'web-admin' })).toThrow(/aprobada/i)
  })
})

describe('GLO-GN-APPROVAL-02 endpoint', () => {
  /** Arma un `req` con Payload simulado que registra cómo se invoca. */
  function fakeReq(role: string | undefined) {
    const payload = {
      findByID: vi.fn().mockResolvedValue({ terminoEs: 'Facultad' }),
      update: vi.fn().mockResolvedValue({ terminoEs: 'Facultad', terminoGn: 'Mbo\'ehaoty', fuente: 'SPL' }),
    }
    const user = role ? { id: 9, role } : undefined
    return { req: { user, payload, routeParams: { id: '5' } }, payload }
  }

  it('propaga la sesión (`req`) a update y findByID para que el hook identifique al superadmin', async () => {
    const { req, payload } = fakeReq('superadmin')
    const res = await guaraniApprovalEndpoint.handler(req as never)
    expect(res.status).toBe(200)
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({ req }))
    expect(payload.findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  it('rechaza con 403 a quien no es superadmin y no escribe nada', async () => {
    const { req, payload } = fakeReq('web-admin')
    const res = await guaraniApprovalEndpoint.handler(req as never)
    expect(res.status).toBe(403)
    expect(payload.update).not.toHaveBeenCalled()
  })
})
