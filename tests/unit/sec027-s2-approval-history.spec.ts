// SEC-027 S-2 (diagnóstico previo al deploy, 2026-11-12): lectura del historial de aprobaciones de noticias y páginas.
// Qué comprueba: el campo `approvalHistory` (correos de revisores y publicadores, comentarios de rechazo) solo lo leen
// los roles editoriales y el corresponsal; el público, viewer, auditor, media-manager y una cuenta con el cambio de
// contraseña pendiente no lo reciben. Amenaza: un anónimo leía correos del personal y comentarios internos en todo
// contenido publicado. Límite: prueba la regla de acceso del campo; la sonda HTTP es P12 de la matriz SEC-027.
import { describe, expect, it } from 'vitest'

import { approvalHistoryField } from '../../apps/cms/src/fields/approvalHistory'

const now = new Date().toISOString()
const userOf = (role: string, extra: Record<string, unknown> = {}) => ({ id: 5, collection: 'users', role, passwordChangedAt: now, ...extra })
const read = (user: unknown) => (approvalHistoryField.access?.read as (args: unknown) => boolean)({ req: { user } })

describe('S-2: approvalHistory no viaja al público', () => {
  it('tiene regla de lectura', () => {
    expect(typeof approvalHistoryField.access?.read).toBe('function')
  })

  it('lo leen los roles editoriales y el corresponsal', () => {
    for (const role of ['superadmin', 'web-admin', 'publisher', 'editor', 'reviewer', 'correspondent']) {
      expect(read(userOf(role)), role).toBe(true)
    }
  })

  it('no lo leen el anónimo, viewer, auditor, media-manager ni una cuenta con el cambio de contraseña pendiente', () => {
    expect(read(null)).toBe(false)
    for (const role of ['viewer', 'auditor', 'media-manager']) expect(read(userOf(role)), role).toBe(false)
    expect(read(userOf('superadmin', { mustChangePassword: true }))).toBe(false)
  })
})
