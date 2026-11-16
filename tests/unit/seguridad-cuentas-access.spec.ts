// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S1 y S4).
// Qué comprueba: mientras una cuenta tiene el cambio de contraseña pendiente (marcado por un administrador o vencida a los
//   90 días, o sin fecha de cambio), el SERVIDOR le niega todo permiso de rol y toda escritura por id propio; solo conserva
//   la lectura de su propia ficha (`/me`) y la entrada al panel (para llegar a la pantalla de cambio). Tras cambiarla,
//   recupera exactamente los permisos anteriores.
// Amenaza: una cuenta con contraseña provisoria o vencida que sigue publicando o administrando por REST.
// Límite: prueba las funciones de acceso con usuarios sintéticos; la prueba HTTP real es la sonda local del informe.
import { describe, expect, it } from 'vitest'

import {
  canCreateUsers,
  canDeleteUsers,
  canReadAuditLog,
  canReadEditorialVersions,
  canReadProtectedUserFields,
  canReadUsers,
  canUpdateEditorial,
  canUpdateUsers,
  canWriteInstitutional,
  hasRole,
  isAuthenticated,
  isPasswordChangePending,
  isSuperAdmin,
  readPublishedOrEditorial,
} from '../../apps/cms/src/access/roles'
import { Users } from '../../apps/cms/src/collections/Users'

const DAY = 24 * 60 * 60 * 1000
const now = () => new Date().toISOString()
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()

const account = (role: string, extra: Record<string, unknown> = {}) => ({
  id: 7,
  role,
  collection: 'users',
  mustChangePassword: false,
  passwordChangedAt: now(),
  ...extra,
})
const req = (user: unknown) => ({ req: { user } }) as never
const published = { _status: { equals: 'published' } }

describe('S1: cambio obligatorio pendiente niega todo salvo /me y el panel', () => {
  const pendientes = {
    marcada: account('superadmin', { mustChangePassword: true }),
    vencida: account('superadmin', { passwordChangedAt: daysAgo(91) }),
    sinFecha: account('superadmin', { passwordChangedAt: null }),
    sinCampo: { id: 7, role: 'superadmin', collection: 'users' },
  }

  for (const [caso, user] of Object.entries(pendientes)) {
    it(`superadmin ${caso}: sin permisos de rol ni de escritura`, () => {
      expect(isPasswordChangePending(user)).toBe(true)
      expect(hasRole(user, ['superadmin'])).toBe(false)
      expect(isSuperAdmin(req(user))).toBe(false)
      expect(canCreateUsers(req(user))).toBe(false)
      expect(canUpdateUsers(req(user))).toBe(false)
      expect(canDeleteUsers(req(user))).toBe(false)
      expect(canWriteInstitutional(req(user))).toBe(false)
      expect(canReadAuditLog(req(user))).toBe(false)
      expect(canUpdateEditorial('noticias')(req(user))).toBe(false)
      expect(readPublishedOrEditorial(req(user))).toEqual(published)
    })

    it(`superadmin ${caso}: conserva solo su propia ficha (/me) y la entrada al panel`, () => {
      expect(canReadUsers(req(user))).toEqual({ id: { equals: 7 } })
      expect(isAuthenticated(req(user))).toBe(true)
      expect(canReadProtectedUserFields(req(user))).toBe(true)
    })
  }

  it('corresponsal pendiente: pierde también los permisos por autoría (createdBy)', () => {
    const user = account('correspondent', { mustChangePassword: true })
    expect(canUpdateEditorial('noticias')(req(user))).toBe(false)
    expect(readPublishedOrEditorial(req(user))).toEqual(published)
    expect(canReadEditorialVersions(req(user))).toBe(false)
  })

  it('S4: a los 89 días todavía no vence; a los 90 sí', () => {
    expect(isPasswordChangePending(account('editor', { passwordChangedAt: daysAgo(89) }))).toBe(false)
    expect(isPasswordChangePending(account('editor', { passwordChangedAt: daysAgo(90) }))).toBe(true)
  })
})

describe('S1: tras cambiar la contraseña recupera exactamente los permisos previos', () => {
  it('superadmin al día', () => {
    const user = account('superadmin')
    expect(isPasswordChangePending(user)).toBe(false)
    expect(canCreateUsers(req(user))).toBe(true)
    expect(canUpdateUsers(req(user))).toBe(true)
    expect(canReadUsers(req(user))).toBe(true)
    expect(canReadAuditLog(req(user))).toBe(true)
  })

  it('corresponsal al día: vuelve su filtro por autoría', () => {
    const user = account('correspondent')
    expect(canUpdateEditorial('noticias')(req(user))).toEqual({ createdBy: { equals: 7 } })
    expect(canReadEditorialVersions(req(user))).toEqual({ 'version.createdBy': { equals: 7 } })
  })

  it('editor al día: actualiza solo su propia cuenta', () => {
    expect(canUpdateUsers(req(account('editor')))).toEqual({ id: { equals: 7 } })
  })
})

describe('regresión: usuarios sintéticos de pruebas previas (sin campos de seguridad ni marca de colección)', () => {
  it('hasRole y los accesos se comportan como antes', () => {
    expect(hasRole({ id: 1, role: 'editor' }, ['editor'])).toBe(true)
    expect(canCreateUsers(req({ id: 1, role: 'superadmin' }))).toBe(true)
    expect(canUpdateUsers(req({ id: 2, role: 'viewer' }))).toEqual({ id: { equals: 2 } })
    expect(isPasswordChangePending(null)).toBe(false)
    expect(isPasswordChangePending({ id: 1, role: 'editor' })).toBe(false)
  })
})

describe('contrato de campos de users (S1, S6)', () => {
  const field = (name: string) => Users.fields.find((f) => 'name' in f && f.name === name) as Record<string, any>

  it('nombre y apellido: texto opcional', () => {
    expect(field('nombre')).toMatchObject({ type: 'text' })
    expect(field('apellido')).toMatchObject({ type: 'text' })
    expect(field('nombre').required).not.toBe(true)
  })

  it('mustChangePassword y passwordChangedAt: solo los escribe el servidor; los lee la propia cuenta o el superadmin', async () => {
    for (const name of ['mustChangePassword', 'passwordChangedAt']) {
      const f = field(name)
      expect(f, name).toBeDefined()
      expect(await f.access.create(req(account('superadmin'))), name).toBe(false)
      expect(await f.access.update(req(account('superadmin'))), name).toBe(false)
      const own = { req: { user: account('editor') }, doc: { id: 7 }, id: 7 } as never
      const other = { req: { user: account('editor', { id: 8 }) }, doc: { id: 7 }, id: 7 } as never
      const sa = { req: { user: account('superadmin', { id: 1 }) }, doc: { id: 7 }, id: 7 } as never
      expect(await f.access.read(own), `${name} propia`).toBe(true)
      expect(await f.access.read(other), `${name} ajena`).toBe(false)
      expect(await f.access.read(sa), `${name} superadmin`).toBe(true)
    }
    expect(field('mustChangePassword').type).toBe('checkbox')
    expect(field('passwordChangedAt').type).toBe('date')
  })

  it('passwordHistory: oculto y sin lectura ni escritura para nadie', async () => {
    const f = field('passwordHistory')
    expect(f.hidden).toBe(true)
    for (const op of ['read', 'create', 'update']) {
      expect(await f.access[op](req(account('superadmin'))), op).toBe(false)
    }
  })
})
