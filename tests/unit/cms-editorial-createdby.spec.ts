// DEP-03 F3: autoría (`createdBy`) y reglas que dependen de ella.
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md (escenarios 4, 7, 17, 18) | RDD-DEP-58, RDD-DEP-63.
// Amenaza: aprobar o publicar lo propio; que un corresponsal lea o edite borradores ajenos; que el cliente
// elija el autor; que la lectura pública filtre IDs de autores.
// Límite: access y hooks reales con `req` sintético; el `where` real contra Postgres es hipótesis H1/H2.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findByID } = vi.hoisted(() => ({ findByID: vi.fn() }))

vi.mock('payload', () => ({
  getPayload: async () => ({ findByID }),
  APIError: class APIError extends Error {
    status: number
    isPublic?: boolean
    constructor(message: string, status = 500, _data?: unknown, isPublic?: boolean) {
      super(message)
      this.status = status
      this.isPublic = isPublic
    }
  },
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit: vi.fn(),
  getClientIP: vi.fn(() => '127.0.0.1'),
  extractChanges: vi.fn(() => ({})),
}))
vi.mock('../../apps/cms/src/utilities/notifications', () => ({
  notifyApprovalStateChange: vi.fn(),
  notifyN8N: vi.fn(),
}))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))

import { Noticias } from '../../apps/cms/src/collections/Noticias'
import { Paginas } from '../../apps/cms/src/collections/Paginas'

type Doc = Record<string, any>
type AnyFn = (args: any) => any

const collections = [
  ['noticias', Noticias],
  ['paginas', Paginas],
] as const

const EDITORIAL_READ = ['superadmin', 'web-admin', 'publisher', 'editor', 'correspondent', 'reviewer']
const NON_EDITORIAL = ['media-manager', 'auditor', 'viewer', 'hacker']

const userOf = (role: string, id = 10) => ({ id, role, email: `${role}@unc.test` })

const docIn = (approvalStatus: string, over: Doc = {}): Doc => ({
  id: 1,
  title: 'Título original',
  slug: 'titulo-original',
  approvalStatus,
  _status: approvalStatus === 'publicado' ? 'published' : 'draft',
  approvalHistory: [],
  ...over,
})

function findField(fields: any[], name: string): any {
  for (const f of fields) {
    if (f.name === name) return f
    if (f.type === 'tabs') {
      for (const tab of f.tabs) {
        const hit = findField(tab.fields, name)
        if (hit) return hit
      }
    }
  }
  return undefined
}

async function runBeforeChange(
  collection: any,
  opts: { operation?: 'create' | 'update'; user: unknown; original?: Doc; data?: Doc },
): Promise<Doc> {
  const operation = opts.operation ?? 'update'
  const hooks: AnyFn[] = collection.hooks?.beforeChange ?? []
  expect(hooks.length, `${collection.slug} no declara hooks.beforeChange (DEP-03)`).toBeGreaterThan(0)
  let data: Doc = operation === 'update' ? { ...(opts.original ?? {}), ...(opts.data ?? {}) } : { ...(opts.data ?? {}) }
  for (const hook of hooks) {
    data =
      (await hook({
        collection: { slug: collection.slug },
        context: {},
        data,
        operation,
        originalDoc: operation === 'update' ? opts.original : undefined,
        req: { user: opts.user, payload: { findByID }, context: {} },
      })) || data
  }
  return data
}

const rejected = (p: Promise<unknown>, status: number) => expect(p).rejects.toMatchObject({ status })
const call = async (fn: unknown, user: unknown) => {
  expect(typeof fn).toBe('function')
  return (fn as AnyFn)({ req: { user } })
}

beforeEach(() => vi.clearAllMocks())

describe.each(collections)('DEP-03 F3: campo createdBy en %s', (_slug, collection) => {
  it('es una relación nullable a users, no obligatoria', () => {
    const field = findField(collection.fields as any[], 'createdBy')
    expect(field, 'campo createdBy').toBeDefined()
    expect(field.type).toBe('relationship')
    expect(field.relationTo).toBe('users')
    expect(field.required).not.toBe(true)
    expect(field.hasMany).not.toBe(true)
  })

  it('solo lectura para clientes: access create/update niegan a todos', async () => {
    const field = findField(collection.fields as any[], 'createdBy')
    for (const op of ['create', 'update'] as const) {
      for (const role of [...EDITORIAL_READ, ...NON_EDITORIAL]) {
        expect(await call(field.access?.[op], userOf(role)), `${op} ${role}`).toBe(false)
      }
    }
  })

  it('lectura del campo solo para roles editoriales (no filtra IDs de autores al público)', async () => {
    const field = findField(collection.fields as any[], 'createdBy')
    for (const role of EDITORIAL_READ) expect(await call(field.access?.read, userOf(role)), role).toBe(true)
    for (const role of NON_EDITORIAL) expect(await call(field.access?.read, userOf(role)), role).toBe(false)
    expect(await call(field.access?.read, null)).toBe(false)
  })
})

describe.each(collections)('DEP-03 F3: corresponsal solo ve y edita lo suyo en %s', (_slug, collection) => {
  const me = userOf('correspondent', 33)

  it('read: publicados o creados por él', async () => {
    expect(await call(collection.access?.read, me)).toEqual({
      or: [{ _status: { equals: 'published' } }, { createdBy: { equals: 33 } }],
    })
  })

  it('update: solo documentos con createdBy = él', async () => {
    expect(await call(collection.access?.update, me)).toEqual({ createdBy: { equals: 33 } })
  })

  it('readVersions: solo versiones de documentos suyos', async () => {
    expect(await call(collection.access?.readVersions, me)).toEqual({ 'version.createdBy': { equals: 33 } })
  })

  it('un usuario sin id no obtiene filtro ampliable (cae a solo publicados / denegado)', async () => {
    const anon = { role: 'correspondent' }
    expect(await call(collection.access?.read, anon)).toEqual({ _status: { equals: 'published' } })
    expect(await call(collection.access?.update, anon)).toBe(false)
    expect(await call(collection.access?.readVersions, anon)).toBe(false)
  })

  it('los demás roles editoriales conservan lectura completa y versiones', async () => {
    for (const role of ['superadmin', 'web-admin', 'publisher', 'editor', 'reviewer']) {
      expect(await call(collection.access?.read, userOf(role)), role).toBe(true)
      expect(await call(collection.access?.readVersions, userOf(role)), role).toBe(true)
    }
  })
})

describe.each(collections)('DEP-03 F3: el servidor fija createdBy en %s', (_slug, collection) => {
  it('en create toma el id de la sesión aunque el cliente envíe otro', async () => {
    const out = await runBeforeChange(collection, {
      operation: 'create',
      user: userOf('correspondent', 33),
      data: { title: 'Nueva', createdBy: 999 },
    })
    expect(out.createdBy).toBe(33)
  })

  it('en update conserva el autor original aunque el cliente envíe otro', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('editor', 40),
      original: docIn('draft', { createdBy: 33 }),
      data: { title: 'Editado', createdBy: 999 },
    })
    expect(out.createdBy).toBe(33)
  })

  it('en update sin autor (heredado) no se infiere ni se asigna uno', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('editor', 40),
      original: docIn('draft'),
      data: { title: 'Editado', createdBy: 999 },
    })
    expect(out.createdBy ?? null).toBeNull()
  })
})

describe.each(collections)('DEP-03 F3: nadie aprueba ni publica lo propio en %s', (_slug, collection) => {
  it('el revisor no aprueba ni rechaza un documento cuyo autor es él (403)', async () => {
    const user = userOf('reviewer', 50)
    const original = docIn('en_revision', { createdBy: 50 })
    await rejected(runBeforeChange(collection, { user, original, data: { approvalStatus: 'aprobado' } }), 403)
    await rejected(runBeforeChange(collection, { user, original, data: { approvalStatus: 'rechazado', reviewComment: 'x' } }), 403)
  })

  it('el id del autor puede venir poblado como objeto o como texto', async () => {
    const user = userOf('reviewer', 50)
    await rejected(
      runBeforeChange(collection, { user, original: docIn('en_revision', { createdBy: { id: 50 } }), data: { approvalStatus: 'aprobado' } }),
      403,
    )
    await rejected(
      runBeforeChange(collection, { user, original: docIn('en_revision', { createdBy: '50' }), data: { approvalStatus: 'aprobado' } }),
      403,
    )
  })

  it('el revisor aprueba lo de otra persona', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('reviewer', 50),
      original: docIn('en_revision', { createdBy: 20 }),
      data: { approvalStatus: 'aprobado' },
    })
    expect(out.approvalStatus).toBe('aprobado')
  })

  it('publicador y superadmin no publican lo propio (403); lo ajeno sí', async () => {
    for (const role of ['publisher', 'superadmin']) {
      const user = userOf(role, 60)
      await rejected(
        runBeforeChange(collection, { user, original: docIn('aprobado', { createdBy: 60 }), data: { _status: 'published' } }),
        403,
      )
      const out = await runBeforeChange(collection, {
        user,
        original: docIn('aprobado', { createdBy: 20 }),
        data: { _status: 'published' },
      })
      expect(out.approvalStatus).toBe('publicado')
    }
  })

  it('con autor nulo (271 noticias heredadas) nadie queda bloqueado por «lo propio»', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('publisher', 60),
      original: docIn('aprobado'),
      data: { _status: 'published' },
    })
    expect(out.approvalStatus).toBe('publicado')
    const approved = await runBeforeChange(collection, {
      user: userOf('reviewer', 50),
      original: docIn('en_revision'),
      data: { approvalStatus: 'aprobado' },
    })
    expect(approved.approvalStatus).toBe('aprobado')
  })

  it('defensa en profundidad: un corresponsal no modifica un documento ajeno aunque llegue al hook (403)', async () => {
    await rejected(
      runBeforeChange(collection, {
        user: userOf('correspondent', 33),
        original: docIn('draft', { createdBy: 20 }),
        data: { title: 'Intento de edición ajena' },
      }),
      403,
    )
    const own = await runBeforeChange(collection, {
      user: userOf('correspondent', 33),
      original: docIn('draft', { createdBy: 33 }),
      data: { title: 'Mi edición' },
    })
    expect(own.title).toBe('Mi edición')
  })
})

// DEP-03 D1 / SEC-03: `sort=createdBy` no debe revelar agrupación por autor a quien no lee la autoría.
// Amenaza: canal lateral que ordena publicados por autor sin exponer ids. Límite: solo `find`; no
// valida el orden real en Postgres.
describe.each(collections)('DEP-03 D1: sort por autoría en %s', (_slug, collection) => {
  const run = (user: unknown, sort: unknown, operation = 'find') => {
    const hooks: AnyFn[] = (collection as any).hooks?.beforeOperation ?? []
    let args: Doc = { sort }
    for (const h of hooks) args = h({ args, operation, req: { user } }) ?? args
    return args.sort
  }

  it.each([undefined, ...NON_EDITORIAL.map((r) => userOf(r))])(
    'descarta createdBy y -createdBy para %o',
    (user) => {
      expect(run(user, 'createdBy')).toBeUndefined()
      expect(run(user, '-createdBy')).toBeUndefined()
      expect(run(user, 'title,-createdBy')).toBe('title')
      expect(run(user, ['createdBy', '-title'])).toEqual(['-title'])
    },
  )

  it('conserva sorts legítimos del público', () => {
    expect(run(undefined, '-publishedAt')).toBe('-publishedAt')
  })

  it.each(EDITORIAL_READ.map((r) => userOf(r)))('no altera el sort de %o', (user) => {
    expect(run(user, 'createdBy')).toBe('createdBy')
  })
})
