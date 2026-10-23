import { describe, expect, it, vi } from 'vitest'

// Mocks como en cms-drafts-read-access.spec.ts: las colecciones importan hooks con efectos; no se usa DB ni red.
vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {},
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({
  revalidatePortalTag: vi.fn(),
}))

import TribunalDocumentos from '../../apps/cms/src/collections/TribunalDocumentos'
import TribunalMiembros from '../../apps/cms/src/collections/TribunalMiembros'
import { readActiveOrInstitutional } from '../../apps/cms/src/access/roles'

/**
 * SEC-10 (política PROVISIONAL de solo estrechamiento): TribunalDocumentos/TribunalMiembros tenían
 * `read: () => true`, así que un anónimo leía también los registros con `active = false` por
 * REST/GraphQL/Local API. Amenaza: exponer miembros o documentos del tribunal retirados.
 * Límite: filas con `active` nulo quedan ocultas a propósito; no cubre Tesis ni Media; no cambia
 * create/update/delete.
 */
const ACTIVE_ONLY = { active: { equals: true } }
const RESTRICTED_USERS: Array<[string, unknown]> = [
  ['anónimo', null],
  ['viewer', { id: 2, role: 'viewer' }],
  ['auditor', { id: 3, role: 'auditor' }],
  ['editor', { id: 4, role: 'editor' }],
  ['publisher', { id: 5, role: 'publisher' }],
  ['reviewer', { id: 6, role: 'reviewer' }],
  ['correspondent', { id: 7, role: 'correspondent' }],
  ['media-manager', { id: 8, role: 'media-manager' }],
  ['rol nulo', { id: 9, role: null }],
  ['rol desconocido', { id: 10, role: 'hacker' }],
]
const INSTITUTIONAL_ROLES = ['superadmin', 'web-admin']

const collections = [
  ['tribunal-documentos', TribunalDocumentos],
  ['tribunal-miembros', TribunalMiembros],
] as const

const call = async (fn: unknown, user: unknown) => {
  expect(typeof fn).toBe('function')
  return (fn as (a: unknown) => unknown)({ req: { user } })
}

describe.each(collections)('SEC-10: lectura de %s', (_slug, collection) => {
  it('usa readActiveOrInstitutional como access.read (no () => true)', () => {
    expect(collection.access?.read).toBe(readActiveOrInstitutional)
  })

  it.each(RESTRICTED_USERS)('limita a activos para %s', async (_name, user) => {
    expect(await call(collection.access?.read, user)).toEqual(ACTIVE_ONLY)
  })

  it.each(INSTITUTIONAL_ROLES)('conserva lectura completa para %s', async (role) => {
    expect(await call(collection.access?.read, { id: 1, role })).toBe(true)
  })
})
