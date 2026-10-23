import { describe, expect, it, vi } from 'vitest'

// Mocks como en cms-rbac.spec.ts: las colecciones importan payload y hooks con efectos; no se usa DB ni red.
vi.mock('payload', () => ({
  getPayload: async () => ({}),
  // DEP-03: los hooks editoriales importan APIError; el valor real no se usa en estas pruebas de lectura.
  APIError: class APIError extends Error {},
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit: vi.fn(),
  getClientIP: vi.fn(),
  extractChanges: vi.fn(() => ({})),
}))
vi.mock('../../apps/cms/src/utilities/notifications', () => ({
  notifyApprovalStateChange: vi.fn(),
  notifyN8N: vi.fn(),
}))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({
  revalidatePortalTag: vi.fn(),
}))

import { Noticias } from '../../apps/cms/src/collections/Noticias'
import { Paginas } from '../../apps/cms/src/collections/Paginas'

/** DEP-02 (spec docs/specs/deploy/DEP-02-lectura-publica-solo-publicado.md): filtro exacto para lectores sin función editorial. */
const PUBLISHED_ONLY = { _status: { equals: 'published' } }
// DEP-03 (SEC-03 decisión 5): `correspondent` ya no tiene lectura completa; su filtro por autoría
// (`createdBy`) se prueba en cms-editorial-createdby.spec.ts. Aquí solo se exige que NO sea `true`.
const EDITORIAL_ROLES = ['superadmin', 'web-admin', 'publisher', 'editor', 'reviewer']
const RESTRICTED_USERS: Array<[string, unknown]> = [
  ['anónimo', null],
  ['viewer', { id: 2, role: 'viewer' }],
  ['auditor', { id: 3, role: 'auditor' }],
  ['media-manager', { id: 4, role: 'media-manager' }],
  ['rol nulo', { id: 5, role: null }],
  ['rol desconocido', { id: 6, role: 'hacker' }],
]

const collections = [
  ['noticias', Noticias],
  ['paginas', Paginas],
] as const

/** Invoca la función de acceso real con un req sintético (sin sesión real). */
const call = async (fn: unknown, user: unknown) => {
  expect(typeof fn).toBe('function')
  return (fn as (a: unknown) => unknown)({ req: { user } })
}

describe.each(collections)('DEP-02: lectura de %s', (_slug, collection) => {
  it.each(RESTRICTED_USERS)('limita a publicados para %s', async (_name, user) => {
    expect(await call(collection.access?.read, user)).toEqual(PUBLISHED_ONLY)
  })

  it.each(EDITORIAL_ROLES)('conserva lectura completa para %s', async (role) => {
    expect(await call(collection.access?.read, { id: 1, role })).toBe(true)
  })

  it.each(RESTRICTED_USERS)('niega versiones a %s', async (_name, user) => {
    expect(await call(collection.access?.readVersions, user)).toBe(false)
  })

  it.each(EDITORIAL_ROLES)('permite versiones a %s', async (role) => {
    expect(await call(collection.access?.readVersions, { id: 1, role })).toBe(true)
  })

  it('DEP-03: correspondent no tiene lectura completa ni versiones completas', async () => {
    const user = { id: 7, role: 'correspondent' }
    expect(await call(collection.access?.read, user)).not.toBe(true)
    expect(await call(collection.access?.readVersions, user)).not.toBe(true)
  })

  it('DEP-03 (SEC-03 decisión 7): auditor y viewer no leen borradores ni versiones', async () => {
    for (const role of ['auditor', 'viewer']) {
      expect(await call(collection.access?.read, { id: 8, role })).toEqual(PUBLISHED_ONLY)
      expect(await call(collection.access?.readVersions, { id: 8, role })).toBe(false)
    }
  })
})
