// GLO-GN-APPROVAL-01: contrato de aprobación del glosario por superadmin.
// Qué hace: protege la transición pendiente → aprobado y exige traducción, fuente y confianza.
// Amenaza: evita que una glosa incompleta o un rol editorial publique una traducción en el portal.
import { describe, expect, it } from 'vitest'
import { validateGuaraniApproval } from '../../apps/cms/src/hooks/guaraniApproval'

describe('GLO-GN-APPROVAL-01', () => {
  it('permite aprobar solo con superadmin y datos completos', () => {
    expect(() => validateGuaraniApproval({
      data: { terminoGn: 'Jeporekapy', oficial: true, fuenteUrl: 'https://spl.gov.py/es/diccionario-guarani-paraguayo/', confianza: 'A', estadoRevision: 'aprobado' },
      originalDoc: {},
      role: 'superadmin',
    })).not.toThrow()
  })

  it('rechaza aprobación de web-admin y glosa sin fuente', () => {
    expect(() => validateGuaraniApproval({
      data: { terminoGn: 'Jeporekapy', oficial: true, fuenteUrl: '', confianza: 'A', estadoRevision: 'aprobado' },
      originalDoc: {},
      role: 'web-admin',
    })).toThrow(/superadmin/)
    expect(() => validateGuaraniApproval({
      data: { terminoGn: 'Jeporekapy', oficial: true, fuenteUrl: '', confianza: 'A', estadoRevision: 'aprobado' },
      originalDoc: {},
      role: 'superadmin',
    })).toThrow(/fuente/i)
  })

  it('protege una entrada ya aprobada frente a cambios de otros roles', () => {
    expect(() => validateGuaraniApproval({
      data: { terminoGn: 'Forma nueva', estadoRevision: 'aprobado' },
      originalDoc: { revisado: true, terminoGn: 'Forma anterior' },
      role: 'web-admin',
    })).toThrow(/aprobada/i)
  })
})
