// SEC-027 (minimización de datos del autor): docs/security/SEC-027-MATRIZ-ROLES.md, observación sobre P10.
// Qué comprueba: (S1) al poblar un usuario relacionado (p. ej. `createdBy` con depth ≥ 1) solo viajan su correo y su rol,
//   nunca teléfono, Telegram ni sesiones; (S2) la auditoría no registra como «cambio» que un documento relacionado llegue
//   poblado y guarda solo su ID; (S3) nunca guarda claves sensibles (contraseña, sesiones, teléfono…) en ningún nivel;
//   (S4) las filas de arrays (historial de aprobación) conservan su contenido; (S5) el panel de revisión recibe solo el
//   correo del autor.
// Amenaza: copiar datos personales de cuentas a lugares que no los necesitan (la auditoría se conserva y se exporta).
// Límite: revisa la configuración y la función pura; la consulta real se prueba con scripts/security/probe-roles.ts.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { authorEmail, extractChanges } from '../../apps/cms/src/utilities/auditChanges'
import { Users } from '../../apps/cms/src/collections/Users'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')

const autorPoblado = {
  id: 7,
  email: 'autor@example.invalid',
  role: 'corresponsal',
  telefono: '+595 000 000',
  telegramUserId: '123',
  sessions: [{ id: 's1', createdAt: '2026-11-10', expiresAt: '2026-11-11' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('SEC-027: minimización de datos del autor', () => {
  it('S1: un usuario poblado solo trae correo y rol', () => {
    expect(Users.defaultPopulate).toEqual({ email: true, role: true })
  })

  it('S2: un documento relacionado que llega poblado no cuenta como cambio y se guarda solo su ID', () => {
    expect(extractChanges({ createdBy: 7, title: 'A' }, { createdBy: autorPoblado, title: 'A' })).toEqual({})

    const cambios = extractChanges({ createdBy: 7, featuredImage: 3 }, { createdBy: autorPoblado, featuredImage: { id: 4, url: '/m.jpg', createdAt: 'x' } })
    expect(cambios).toEqual({ featuredImage: { antes: 3, despues: 4 } })
  })

  it('S3: nunca guarda claves sensibles, en ningún nivel', () => {
    const cambios = extractChanges({}, { meta: { password: 'x', hash: 'h', salt: 's', telefono: '1', sessions: [], nota: 'ok' } })
    expect(JSON.stringify(cambios)).not.toMatch(/password|hash|salt|telefono|sessions/)
    expect(cambios).toEqual({ meta: { antes: undefined, despues: { nota: 'ok' } } })
    expect(JSON.stringify(extractChanges({}, { createdBy: autorPoblado }))).not.toMatch(/telefono|sessions|example\.invalid/)
  })

  it('S4: las filas del historial conservan su contenido y su usuario queda como ID', () => {
    const fila = { id: 'r1', accion: 'rejected', comentario: 'Falta la fuente', usuario: autorPoblado }
    expect(extractChanges({ approvalHistory: [] }, { approvalHistory: [fila] })).toEqual({
      approvalHistory: { antes: [], despues: [{ id: 'r1', accion: 'rejected', comentario: 'Falta la fuente', usuario: 7 }] },
    })
  })

  it('S5: el panel de revisión recibe solo el correo del autor', () => {
    expect(authorEmail(autorPoblado)).toBe('autor@example.invalid')
    expect(authorEmail(7)).toBeNull()
    expect(authorEmail(null)).toBeNull()
    expect(read('apps/cms/src/app/api/dashboard/noticias/route.ts')).toMatch(/createdBy: authorEmail\(n\.createdBy\)/)
  })
})
