// GLO-GN-INST-01 (odd/tasks/glosario-gn-institucional.md, S1–S5): aprobación de traducciones institucionales de la UNC.
// Qué comprueba: una glosa `institucional` se aprueba sin fuente oficial solo con traductor, cargo y revisor nativo;
// los demás tipos siguen exigiendo fuente oficial; el diccionario del portal incluye las institucionales aprobadas sin
// exponer los nombres; la auditoría registra a los responsables. Amenaza: publicar en el portal una glosa sin nadie que
// responda por ella. Límite: pruebas con `req` y `payload` simulados; la prueba real va en el log de la tarea.
import { describe, expect, it, vi } from 'vitest'

const logAudit = vi.fn()
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
  getClientIP: () => '10.0.0.1',
}))

import { GlosarioGuarani } from '../../apps/cms/src/collections/GlosarioGuarani'
import { guaraniDictionaryEndpoint } from '../../apps/cms/src/endpoints/guaraniDictionary'
import { validateGuaraniApproval } from '../../apps/cms/src/hooks/guaraniApproval'
import { auditGuaraniReviewTransition } from '../../apps/cms/src/hooks/guaraniReviewAudit'

const institucional = {
  terminoEs: 'Rectorado',
  terminoGn: 'Mburuvicha Guasu Róga',
  tipo: 'institucional',
  confianza: 'B',
  fuente: 'Traducción institucional UNC',
  oficial: false,
  traductorNombre: 'Ana Prueba',
  traductorCargo: 'Traductora, Dirección de Comunicación',
  revisorNativo: 'Juan Prueba',
  estadoRevision: 'pendiente',
}
const aprobar = (data: Record<string, unknown>) =>
  validateGuaraniApproval({ data: { ...data, estadoRevision: 'aprobado', revisado: true }, originalDoc: { ...data }, role: 'superadmin' })
const status = (fn: () => void) => {
  try {
    fn()
  } catch (error) {
    return (error as { status?: number; message?: string })
  }
  return undefined
}

describe('S1: aprobación de una glosa institucional', () => {
  it('se aprueba sin fuente oficial cuando tiene traductor, cargo y revisor nativo', () => {
    expect(() => aprobar(institucional)).not.toThrow()
  })

  it('sin traductor, cargo o revisor nativo: 400 con el motivo', () => {
    for (const falta of ['traductorNombre', 'traductorCargo', 'revisorNativo']) {
      const err = status(() => aprobar({ ...institucional, [falta]: '  ' }))
      expect(err?.status, falta).toBe(400)
      expect(err?.message, falta).toMatch(/traductor|cargo|hablante nativo/i)
    }
  })

  it('sigue exigiendo traducción y confianza A o B', () => {
    expect(status(() => aprobar({ ...institucional, terminoGn: '' }))?.status).toBe(400)
    expect(status(() => aprobar({ ...institucional, confianza: 'C' }))?.status).toBe(400)
  })

  it('los demás tipos siguen exigiendo fuente oficial aunque tengan traductor', () => {
    const err = status(() => aprobar({ ...institucional, tipo: 'diccionario' }))
    expect(err?.status).toBe(400)
    expect(err?.message).toMatch(/fuente oficial/)
  })

  it('S2: solo superadmin aprueba', () => {
    const err = status(() =>
      validateGuaraniApproval({ data: { ...institucional, estadoRevision: 'aprobado' }, originalDoc: institucional, role: 'web-admin' }),
    )
    expect(err?.status).toBe(403)
  })
})

describe('S3: diccionario del portal', () => {
  it('incluye oficiales e institucionales aprobadas y no expone a los responsables', async () => {
    const find = vi.fn(async () => ({
      docs: [{ terminoEs: 'Rectorado', terminoGn: 'Mburuvicha Guasu Róga', traductorNombre: 'Ana Prueba', revisorNativo: 'Juan Prueba' }],
    }))
    const res = (await guaraniDictionaryEndpoint.handler({ payload: { find } } as never)) as Response
    const where = JSON.stringify((find.mock.calls[0] as unknown as [{ where: unknown }])[0].where)
    expect(where).toContain('"institucional"')
    expect(where).toContain('"oficial":{"equals":true}')
    expect(where).toContain('"estadoRevision":{"equals":"aprobado"}')
    const body = await res.json()
    expect(body.terms).toEqual([{ terminoEs: 'Rectorado', terminoGn: 'Mburuvicha Guasu Róga' }])
    expect(JSON.stringify(body)).not.toMatch(/Ana Prueba|Juan Prueba/)
  })
})

describe('S4: auditoría de la aprobación', () => {
  it('registra traductor, cargo y revisor nativo al aprobar una glosa institucional', async () => {
    logAudit.mockClear()
    await auditGuaraniReviewTransition({
      doc: { id: 9, ...institucional, estadoRevision: 'aprobado' },
      previousDoc: { id: 9, ...institucional },
      operation: 'update',
      req: { user: { id: 1, email: 'admin@example.invalid', role: 'superadmin' }, payload: {}, headers: new Headers() },
    } as never)
    const entry = JSON.stringify(logAudit.mock.calls[0]?.[0] ?? {})
    expect(entry).toContain('Ana Prueba')
    expect(entry).toContain('Traductora, Dirección de Comunicación')
    expect(entry).toContain('Juan Prueba')
  })
})

describe('S5: campos del panel', () => {
  const field = (name: string) => JSON.stringify(GlosarioGuarani.fields).includes(`"name":"${name}"`)
  it('existen los tres campos de responsables', () => {
    for (const name of ['traductorNombre', 'traductorCargo', 'revisorNativo']) expect(field(name), name).toBe(true)
  })
})
