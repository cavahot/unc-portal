// GLO-GN-APPROVAL-03: pruebas adversariales del flujo de aprobación del glosario guaraní (SEC-027).
// Qué hace: intenta saltarse el control como lo haría un rol editorial o un cliente de la API y fija
// (1) códigos HTTP correctos, (2) que un web-admin no pueda borrar una glosa aprobada y (3) que cada
// aprobación, rechazo o revocación deje una fila propia en la auditoría.
// Amenaza: publicar o retirar traducciones sin el superadmin y sin rastro; errores 500 que disparan alertas
// en Kubernetes cuando en realidad son rechazos de negocio (403/400).
// Límite: dobles de Payload; no ejercitan base de datos, caché del portal ni varias réplicas.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const logAudit = vi.fn()
// Se simula el módulo de auditoría: el real importa payload.config (arranque completo de Payload).
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
  getClientIP: () => '10.0.0.1',
}))

import {
  enforceGuaraniApproval,
  enforceGuaraniDeleteGuard,
  validateGuaraniApproval,
} from '../../apps/cms/src/hooks/guaraniApproval'
import { auditGuaraniReviewTransition } from '../../apps/cms/src/hooks/guaraniReviewAudit'

const aprobada = {
  id: 5,
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
const pendiente = { ...aprobada, estadoRevision: 'pendiente', revisado: false, aprobadoPor: null, fechaAprobacion: null }

/** Devuelve el error lanzado (o undefined) para poder inspeccionar su `status`. */
function caught(fn: () => unknown): { status?: number; message?: string } | undefined {
  try {
    fn()
  } catch (error) {
    return error as { status?: number; message?: string }
  }
  return undefined
}

const runHook = (data: Record<string, unknown>, originalDoc: Record<string, unknown> | undefined, user?: { id: number; role: string; email?: string }) =>
  enforceGuaraniApproval({ data, originalDoc, req: { user } } as never) as Record<string, unknown>

describe('GLO-GN-APPROVAL-03 códigos HTTP', () => {
  it('un rol no superadmin que intenta aprobar recibe 403, no 500', () => {
    const error = caught(() => validateGuaraniApproval({ data: { ...pendiente, estadoRevision: 'aprobado' }, originalDoc: pendiente, role: 'web-admin' }))
    expect(error?.status).toBe(403)
  })

  it('modificar una glosa aprobada siendo web-admin recibe 403', () => {
    const error = caught(() => validateGuaraniApproval({ data: { terminoGn: 'x' }, originalDoc: aprobada, role: 'web-admin' }))
    expect(error?.status).toBe(403)
  })

  it('aprobar con datos incompletos recibe 400 (el superadmin debe corregirlos)', () => {
    for (const faltante of [{ terminoGn: '' }, { fuenteUrl: '' }, { oficial: false }, { confianza: 'C' }]) {
      const error = caught(() => validateGuaraniApproval({ data: { ...pendiente, estadoRevision: 'aprobado', ...faltante }, originalDoc: pendiente, role: 'superadmin' }))
      expect(error?.status, JSON.stringify(faltante)).toBe(400)
    }
  })
})

describe('GLO-GN-APPROVAL-03 intentos de evasión', () => {
  it('un web-admin no puede crear una glosa ya aprobada', () => {
    expect(() => runHook({ ...pendiente, estadoRevision: 'aprobado' }, undefined, { id: 3, role: 'web-admin' })).toThrow(/superadmin/)
  })

  it('un web-admin no puede aprobar solo con `revisado: true`', () => {
    expect(() => runHook({ revisado: true }, pendiente, { id: 3, role: 'web-admin' })).toThrow(/superadmin/)
  })

  it('el cliente no puede falsear aprobador ni fecha en una glosa pendiente', () => {
    const result = runHook({ aprobadoPor: 99, fechaAprobacion: '2020-01-01T00:00:00.000Z', terminoGn: 'otro' }, pendiente, { id: 3, role: 'web-admin' })
    expect(result.aprobadoPor).toBeNull()
    expect(result.fechaAprobacion).toBeNull()
  })

  it('un superadmin no puede falsear el aprobador original al editar una glosa aprobada', () => {
    const result = runHook({ aprobadoPor: 99, fechaAprobacion: '2020-01-01T00:00:00.000Z' }, aprobada, { id: 9, role: 'superadmin' })
    expect(result.aprobadoPor).toBe(7)
    expect(result.fechaAprobacion).toBe(aprobada.fechaAprobacion)
  })

  it('un registro incoherente (estado aprobado pero revisado=false) sigue protegido frente a un web-admin', () => {
    const incoherente = { ...aprobada, revisado: false }
    expect(() => runHook({ terminoGn: 'x' }, incoherente, { id: 3, role: 'web-admin' })).toThrow(/superadmin/)
  })

  it('un registro heredado (estado pendiente pero revisado=true) se trata como aprobado y exige superadmin', () => {
    const heredado = { ...aprobada, estadoRevision: 'pendiente', revisado: true, aprobadoPor: null }
    expect(() => runHook({ terminoGn: 'x' }, heredado, { id: 3, role: 'web-admin' })).toThrow(/aprobada/i)
  })

  it('sin sesión (script o llamada interna sin `req.user`) no se puede aprobar', () => {
    expect(() => runHook({ estadoRevision: 'aprobado' }, pendiente, undefined)).toThrow(/superadmin/)
  })
})

describe('GLO-GN-APPROVAL-03 borrado', () => {
  const guard = (user: { id: number; role: string } | undefined, doc: Record<string, unknown>) => {
    const findByID = vi.fn().mockResolvedValue(doc)
    const result = enforceGuaraniDeleteGuard({ id: 5, req: { user, payload: { findByID } } } as never)
    return { result, findByID }
  }

  it('un web-admin no puede borrar una glosa aprobada (403)', async () => {
    const { result } = guard({ id: 3, role: 'web-admin' }, aprobada)
    await expect(result).rejects.toMatchObject({ status: 403 })
  })

  it('un superadmin sí puede borrar una glosa aprobada', async () => {
    const { result } = guard({ id: 9, role: 'superadmin' }, aprobada)
    await expect(result).resolves.not.toThrow()
  })

  it('un web-admin sí puede borrar una glosa pendiente', async () => {
    const { result } = guard({ id: 3, role: 'web-admin' }, pendiente)
    await expect(result).resolves.not.toThrow()
  })

  it('la consulta del documento viaja con `req` (misma sesión y transacción)', async () => {
    const { result, findByID } = guard({ id: 3, role: 'web-admin' }, pendiente)
    await result
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ collection: 'glosario-guarani', id: 5, req: expect.anything() }))
  })
})

describe('GLO-GN-APPROVAL-03 auditoría de la revisión', () => {
  const user = { id: 9, role: 'superadmin', email: 'revisor@example.test' }
  const run = (previousDoc: Record<string, unknown> | undefined, doc: Record<string, unknown>, operation: 'create' | 'update' = 'update') =>
    auditGuaraniReviewTransition({ doc, previousDoc, operation, req: { user, payload: {} } } as never)

  beforeEach(() => logAudit.mockClear())

  it('registra «aprobar» cuando una glosa pasa a aprobada', async () => {
    await run(pendiente, aprobada)
    expect(logAudit).toHaveBeenCalledTimes(1)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'aprobar', coleccion: 'glosario-guarani', documento: '5', usuario: 'revisor@example.test', resultado: 'exito' })
  })

  it('registra «rechazar» cuando pasa a rechazada', async () => {
    await run(aprobada, { ...pendiente, estadoRevision: 'rechazado' })
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'rechazar' })
  })

  it('registra «revisar» con mensaje de revocación cuando una aprobada vuelve a pendiente', async () => {
    await run(aprobada, pendiente)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'revisar' })
    expect(String(logAudit.mock.calls[0][0].mensaje)).toMatch(/revoc/i)
  })

  it('no registra nada si el estado de revisión no cambió', async () => {
    await run(aprobada, { ...aprobada, terminoGn: 'otra forma' })
    await run(pendiente, { ...pendiente, terminoGn: 'otra forma' })
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('registra «aprobar» si se crea ya aprobada', async () => {
    await run(undefined, aprobada, 'create')
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'aprobar' })
  })

  it('un fallo de auditoría no bloquea al editor', async () => {
    logAudit.mockRejectedValueOnce(new Error('boom'))
    await expect(run(pendiente, aprobada)).resolves.toBeDefined()
  })
})
