// PRA-01 (fase CMS): auditoría de cambios en colecciones institucionales.
// Amenaza: cambios de datos públicos (premios, acreditaciones) sin rastro de quién los hizo.
// Límite: la auditoría no es transaccional con el cambio y no copia contenido (solo colección, id, acción
// y usuario); `logAudit` nunca lanza, así que un fallo del log no bloquea al editor.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit,
  getClientIP: () => '127.0.0.1',
}))

import {
  makeAuditAfterChange,
  makeAuditAfterDelete,
} from '../../apps/cms/src/hooks/audit/auditInstitutionalChange'

const req = { user: { email: 'admin@example.invalid', role: 'web-admin' }, payload: { tag: 'payload' } }

describe('PRA-01: auditInstitutionalChange', () => {
  beforeEach(() => logAudit.mockReset())

  it('afterChange create -> accion crear, con colección, id y usuario', async () => {
    await makeAuditAfterChange('reconocimientos', 'Reconocimiento')({
      doc: { id: 7, nombre: 'secreto' },
      operation: 'create',
      req,
    } as never)
    expect(logAudit).toHaveBeenCalledTimes(1)
    const [data, payload] = logAudit.mock.calls[0]
    expect(data).toMatchObject({
      usuario: 'admin@example.invalid',
      rol: 'web-admin',
      accion: 'crear',
      coleccion: 'reconocimientos',
      documento: '7',
      resultado: 'exito',
    })
    expect(payload).toBe(req.payload)
  })

  it('afterChange update -> accion actualizar', async () => {
    await makeAuditAfterChange('acreditaciones', 'Acreditación')({ doc: { id: 3 }, operation: 'update', req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'actualizar', coleccion: 'acreditaciones', documento: '3' })
  })

  it('afterDelete -> accion eliminar', async () => {
    await makeAuditAfterDelete('acreditaciones', 'Acreditación')({ doc: { id: 9 }, id: 9, req } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'eliminar', coleccion: 'acreditaciones', documento: '9' })
  })

  it('no copia el contenido del documento', async () => {
    await makeAuditAfterChange('reconocimientos', 'Reconocimiento')({
      doc: { id: 1, nombre: 'CONTENIDO-SENSIBLE', fuenteUrl: 'https://x.example' },
      operation: 'create',
      req,
    } as never)
    expect(JSON.stringify(logAudit.mock.calls[0])).not.toContain('CONTENIDO-SENSIBLE')
    expect(logAudit.mock.calls[0][0].cambiosRelevantes).toBeUndefined()
  })

  it('sin usuario registra «sistema» y nunca lanza si logAudit falla', async () => {
    logAudit.mockRejectedValueOnce(new Error('boom'))
    await expect(
      makeAuditAfterChange('reconocimientos', 'Reconocimiento')({ doc: { id: 2 }, operation: 'create', req: { payload: {} } } as never),
    ).resolves.toBeDefined()
    logAudit.mockReset()
    await makeAuditAfterChange('reconocimientos', 'Reconocimiento')({ doc: { id: 2 }, operation: 'create', req: { payload: {} } } as never)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ usuario: 'sistema', rol: 'system' })
  })

  it('devuelve el documento sin modificarlo (contrato de afterChange)', async () => {
    const doc = { id: 5 }
    const out = await makeAuditAfterChange('reconocimientos', 'Reconocimiento')({ doc, operation: 'create', req } as never)
    expect(out).toBe(doc)
  })
})
