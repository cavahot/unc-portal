// DEP-03 (SEC-03 aprobada): el flujo editorial se impone en el servidor.
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md | RDD: RDD-DEP-57..66.
// Amenaza: un rol salta estados (draft -> publicado), publica sin revisión, falsifica `approvalHistory`
// o deja contenido editado publicado sin pasar por revisión.
// Método: ejercita los hooks y access REALES de `Noticias` y `Paginas` con `req` sintético (sin Payload
// ni base de datos). El helper reproduce solo lo que Payload hace ANTES del hook de colección
// (rellenar campos ausentes desde `originalDoc`, update.js:90-136 / getFallbackValue.js:3-17).
// Límite: no prueba la operación real de Payload ni Postgres (hipótesis H1..H8 de la spec).
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { logAudit, notifyApprovalStateChange, notifyN8N, findByID } = vi.hoisted(() => ({
  logAudit: vi.fn(),
  notifyApprovalStateChange: vi.fn(),
  notifyN8N: vi.fn(),
  findByID: vi.fn(),
}))

// `APIError` simulado con la misma forma pública que el real (status, message).
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
  logAudit,
  getClientIP: vi.fn(() => '127.0.0.1'),
  extractChanges: vi.fn(() => ({})),
}))
vi.mock('../../apps/cms/src/utilities/notifications', () => ({ notifyApprovalStateChange, notifyN8N }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))

import { Noticias } from '../../apps/cms/src/collections/Noticias'
import { Paginas } from '../../apps/cms/src/collections/Paginas'

type Doc = Record<string, any>
type AnyFn = (args: any) => any

const ROLES = [
  'superadmin',
  'web-admin',
  'publisher',
  'reviewer',
  'editor',
  'correspondent',
  'media-manager',
  'auditor',
  'viewer',
] as const
const STATES = ['draft', 'en_revision', 'rechazado', 'aprobado', 'publicado'] as const

const collections = [
  ['noticias', Noticias],
  ['paginas', Paginas],
] as const

const userOf = (role: string, id = 10) => ({ id, role, email: `${role}@unc.test` })

/** Documento base en el estado indicado; `_status` coherente con el estado. */
const docIn = (approvalStatus: string, over: Doc = {}): Doc => ({
  id: 1,
  title: 'Título original',
  slug: 'titulo-original',
  summary: 'Resumen original de la noticia',
  approvalStatus,
  _status: approvalStatus === 'publicado' ? 'published' : 'draft',
  approvalHistory: [{ id: 'h1', revisor: 'previo@unc.test', accion: 'sent_to_review', fecha: '2026-10-01T00:00:00.000Z' }],
  ...over,
})

/** Recorre campos (incluye pestañas) y devuelve el campo por nombre. */
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

/**
 * Corre los hooks `beforeChange` REALES de la colección como lo hace Payload:
 * `data` = lo enviado sobre `originalDoc` (campos ausentes se rellenan desde el original).
 */
async function runBeforeChange(
  collection: any,
  opts: { operation?: 'create' | 'update'; user: unknown; original?: Doc; data?: Doc },
): Promise<Doc> {
  const operation = opts.operation ?? 'update'
  const hooks: AnyFn[] = collection.hooks?.beforeChange ?? []
  // Si el control no existe, falla aquí con la razón correcta (no hay hook que lo imponga).
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

beforeEach(() => {
  vi.clearAllMocks()
  findByID.mockImplementation(async ({ id }: { id: number }) => ({
    id,
    // El hook normaliza el id a texto: se compara por su representación.
    email: String(id) === '20' ? 'autor@unc.test' : `user${id}@unc.test`,
    telefono: '',
    telegramUserId: '',
  }))
})

describe.each(collections)('DEP-03 negativas de la matriz en %s', (_slug, collection) => {
  it('1a. correspondent no puede fijar aprobado ni publicado (403)', async () => {
    const user = userOf('correspondent')
    await rejected(runBeforeChange(collection, { user, original: docIn('en_revision'), data: { approvalStatus: 'aprobado' } }), 403)
    await rejected(runBeforeChange(collection, { user, original: docIn('en_revision'), data: { approvalStatus: 'publicado' } }), 403)
    await rejected(
      runBeforeChange(collection, { user, original: docIn('aprobado'), data: { _status: 'published' } }),
      403,
    )
    await rejected(
      runBeforeChange(collection, { user, original: docIn('aprobado'), data: { approvalStatus: 'publicado', _status: 'published' } }),
      403,
    )
  })

  it('1b. editor no puede publicar un aprobado (403)', async () => {
    const user = userOf('editor')
    await rejected(runBeforeChange(collection, { user, original: docIn('aprobado'), data: { _status: 'published' } }), 403)
    await rejected(
      runBeforeChange(collection, { user, original: docIn('aprobado'), data: { approvalStatus: 'publicado', _status: 'published' } }),
      403,
    )
  })

  it('1c. web-admin y superadmin tampoco aprueban ni rechazan', async () => {
    for (const role of ['web-admin', 'superadmin']) {
      const user = userOf(role)
      await rejected(runBeforeChange(collection, { user, original: docIn('en_revision'), data: { approvalStatus: 'aprobado' } }), 403)
      await rejected(
        runBeforeChange(collection, { user, original: docIn('en_revision'), data: { approvalStatus: 'rechazado', reviewComment: 'x' } }),
        403,
      )
    }
  })

  it('2a. revisor aprueba lo que está en revisión y NO cambia el contenido', async () => {
    const user = userOf('reviewer')
    const out = await runBeforeChange(collection, {
      user,
      original: docIn('en_revision'),
      data: { approvalStatus: 'aprobado', title: 'Título manipulado', summary: 'otro resumen' },
    })
    expect(out.approvalStatus).toBe('aprobado')
    expect(out._status).toBe('draft')
    expect(out.title).toBe('Título original')
    expect(out.summary).toBe('Resumen original de la noticia')
  })

  it('2b. revisor no publica, no envía a revisión ni salta estados', async () => {
    const user = userOf('reviewer')
    await rejected(
      runBeforeChange(collection, { user, original: docIn('aprobado'), data: { approvalStatus: 'publicado', _status: 'published' } }),
      403,
    )
    await rejected(runBeforeChange(collection, { user, original: docIn('draft'), data: { approvalStatus: 'en_revision' } }), 403)
    await rejected(runBeforeChange(collection, { user, original: docIn('draft'), data: { approvalStatus: 'aprobado' } }), 422)
  })

  it('3. publicador no publica lo que no está aprobado (422)', async () => {
    const user = userOf('publisher')
    for (const from of ['draft', 'en_revision', 'rechazado'] as const) {
      await rejected(runBeforeChange(collection, { user, original: docIn(from), data: { _status: 'published' } }), 422)
      await rejected(
        runBeforeChange(collection, { user, original: docIn(from), data: { approvalStatus: 'publicado', _status: 'published' } }),
        422,
      )
    }
  })

  it('3b. publicador no aprueba ni rechaza (403)', async () => {
    const user = userOf('publisher')
    await rejected(runBeforeChange(collection, { user, original: docIn('en_revision'), data: { approvalStatus: 'aprobado' } }), 403)
    await rejected(
      runBeforeChange(collection, { user, original: docIn('en_revision'), data: { approvalStatus: 'rechazado', reviewComment: 'x' } }),
      403,
    )
  })

  it('3c. publicador publica lo aprobado con el botón Publicar del admin (solo _status) y no cambia contenido', async () => {
    const user = userOf('publisher')
    const out = await runBeforeChange(collection, {
      user,
      original: docIn('aprobado'),
      data: { _status: 'published', title: 'Cambio de última hora' },
    })
    expect(out.approvalStatus).toBe('publicado')
    expect(out._status).toBe('published')
    expect(out.title).toBe('Título original')
  })

  it('3d. superadmin publica lo aprobado (se comporta como Publicador)', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('superadmin'),
      original: docIn('aprobado'),
      data: { _status: 'published' },
    })
    expect(out.approvalStatus).toBe('publicado')
    expect(out._status).toBe('published')
  })

  it('3e. approvalStatus: publicado sin _status published no es una orden de publicar (422 al Publicador, 403 al autor)', async () => {
    await rejected(
      runBeforeChange(collection, { user: userOf('publisher'), original: docIn('aprobado'), data: { approvalStatus: 'publicado' } }),
      422,
    )
    await rejected(
      runBeforeChange(collection, { user: userOf('editor'), original: docIn('aprobado'), data: { approvalStatus: 'publicado' } }),
      403,
    )
  })

  it('4a. approvalHistory enviado por el cliente se ignora: queda el historial del servidor + 1 entrada', async () => {
    const forged = [{ revisor: 'rector@unc.edu.py', accion: 'approved', fecha: '2026-01-01T00:00:00.000Z', comentario: 'falso' }]
    const user = userOf('editor')
    const original = docIn('draft')
    const out = await runBeforeChange(collection, { user, original, data: { approvalStatus: 'en_revision', approvalHistory: forged } })
    expect(out.approvalHistory).toHaveLength(2)
    expect(out.approvalHistory[0]).toEqual(original.approvalHistory[0])
    expect(out.approvalHistory[1]).toMatchObject({ revisor: 'editor@unc.test', accion: 'sent_to_review' })
    expect(typeof out.approvalHistory[1].fecha).toBe('string')
    expect(JSON.stringify(out.approvalHistory)).not.toContain('rector@unc.edu.py')
  })

  it('4b. sin transición, el historial enviado tampoco se acepta', async () => {
    const forged = [{ revisor: 'x@unc', accion: 'approved', fecha: '2026-01-01T00:00:00.000Z' }]
    const original = docIn('draft')
    const out = await runBeforeChange(collection, {
      user: userOf('editor'),
      original,
      data: { title: 'Nuevo título', approvalHistory: forged },
    })
    expect(out.approvalHistory).toEqual(original.approvalHistory)
  })

  it('4c. el field access de approvalHistory niega create y update a todos los roles (Payload borra la clave enviada)', async () => {
    const field = findField(collection.fields as any[], 'approvalHistory')
    expect(field, 'campo approvalHistory').toBeDefined()
    for (const op of ['create', 'update'] as const) {
      expect(typeof field.access?.[op], `approvalHistory.access.${op}`).toBe('function')
      for (const role of ROLES) {
        expect(await field.access[op]({ req: { user: userOf(role) } })).toBe(false)
      }
      expect(await field.access[op]({ req: { user: null } })).toBe(false)
    }
  })

  it('5. rechazar exige comentario (422): vacío, solo espacios, ausente y demasiado largo', async () => {
    const user = userOf('reviewer')
    const original = docIn('en_revision')
    for (const reviewComment of [undefined, '', '   \n ', 'x'.repeat(2001)]) {
      await rejected(runBeforeChange(collection, { user, original, data: { approvalStatus: 'rechazado', reviewComment } }), 422)
    }
  })

  it('5b. el rechazo con comentario queda en el historial del servidor y no persiste reviewComment', async () => {
    const user = userOf('reviewer')
    const out = await runBeforeChange(collection, {
      user,
      original: docIn('en_revision'),
      data: { approvalStatus: 'rechazado', reviewComment: '  Falta la fuente del dato  ' },
    })
    expect(out.approvalStatus).toBe('rechazado')
    expect(out._status).toBe('draft')
    expect(out.approvalHistory.at(-1)).toMatchObject({
      revisor: 'reviewer@unc.test',
      accion: 'rejected',
      comentario: 'Falta la fuente del dato',
    })
    expect(out.reviewComment).toBeUndefined()
  })

  it('5c. reviewComment es un campo virtual (no crea columna)', () => {
    const field = findField(collection.fields as any[], 'reviewComment')
    expect(field, 'campo reviewComment').toBeDefined()
    expect(field.virtual).toBe(true)
  })

  it('6. la creación siempre nace en draft con historial vacío', async () => {
    for (const role of ['editor', 'correspondent', 'superadmin'] as const) {
      const out = await runBeforeChange(collection, { operation: 'create', user: userOf(role), data: { title: 'Nueva nota' } })
      expect(out.approvalStatus).toBe('draft')
      expect(out._status).toBe('draft')
      expect(out.approvalHistory).toEqual([])
    }
  })

  it('6b. crear fijando un estado distinto de draft se rechaza', async () => {
    const user = userOf('editor')
    await rejected(runBeforeChange(collection, { operation: 'create', user, data: { approvalStatus: 'publicado' } }), 403)
    await rejected(runBeforeChange(collection, { operation: 'create', user, data: { approvalStatus: 'aprobado' } }), 403)
    await rejected(runBeforeChange(collection, { operation: 'create', user, data: { _status: 'published' } }), 403)
    await rejected(runBeforeChange(collection, { operation: 'create', user, data: { approvalStatus: 'en_revision' } }), 422)
  })

  it('6c. roles sin función de autor no crean (403)', async () => {
    for (const role of ['publisher', 'reviewer', 'media-manager', 'auditor', 'viewer']) {
      await rejected(runBeforeChange(collection, { operation: 'create', user: userOf(role), data: {} }), 403)
    }
  })

  it('7. saltos inválidos: 403 si el rol no tiene autoridad sobre el destino, 422 si la tiene pero el origen no lo admite', async () => {
    await rejected(runBeforeChange(collection, { user: userOf('editor'), original: docIn('draft'), data: { approvalStatus: 'aprobado' } }), 403)
    await rejected(runBeforeChange(collection, { user: userOf('editor'), original: docIn('en_revision'), data: { approvalStatus: 'draft' } }), 422)
    await rejected(runBeforeChange(collection, { user: userOf('editor'), original: docIn('rechazado'), data: { approvalStatus: 'en_revision' } }), 422)
    await rejected(runBeforeChange(collection, { user: userOf('editor'), original: docIn('aprobado'), data: { approvalStatus: 'en_revision' } }), 422)
    await rejected(runBeforeChange(collection, { user: userOf('reviewer'), original: docIn('rechazado'), data: { approvalStatus: 'aprobado' } }), 422)
  })

  it('8. flujo feliz: draft -> en_revision (autor) -> aprobado (revisor) -> publicado (publicador)', async () => {
    let doc = docIn('draft', { approvalHistory: [] })
    const step = async (role: string, data: Doc) => {
      const out = await runBeforeChange(collection, { user: userOf(role), original: doc, data })
      doc = { ...doc, ...out }
      return out
    }
    expect((await step('editor', { approvalStatus: 'en_revision' })).approvalStatus).toBe('en_revision')
    expect((await step('reviewer', { approvalStatus: 'aprobado' })).approvalStatus).toBe('aprobado')
    const published = await step('publisher', { _status: 'published' })
    expect(published).toMatchObject({ approvalStatus: 'publicado', _status: 'published' })
    expect(published.approvalHistory.map((h: Doc) => h.accion)).toEqual(['sent_to_review', 'approved'])
  })

  it('8b. rechazado -> draft (autor) -> en_revision (autor)', async () => {
    const user = userOf('editor')
    const back = await runBeforeChange(collection, { user, original: docIn('rechazado'), data: { approvalStatus: 'draft', title: 'Corregido' } })
    expect(back).toMatchObject({ approvalStatus: 'draft', title: 'Corregido' })
    await rejected(runBeforeChange(collection, { user: userOf('reviewer'), original: docIn('rechazado'), data: { approvalStatus: 'draft' } }), 403)
  })

  it('9a. editar un documento aprobado lo devuelve a draft', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('editor'),
      original: docIn('aprobado'),
      // Payload fija _status = 'draft' en el guardado de borrador (update.js:31-33)
      data: { title: 'Título editado', _status: 'draft' },
    })
    expect(out.approvalStatus).toBe('draft')
    expect(out._status).toBe('draft')
    expect(out.title).toBe('Título editado')
  })

  it('9b. editar un documento publicado produce un borrador (draft/draft) y no puede dejarlo publicado', async () => {
    const user = userOf('editor')
    const out = await runBeforeChange(collection, {
      user,
      original: docIn('publicado'),
      data: { title: 'Título editado', _status: 'draft' },
    })
    expect(out).toMatchObject({ approvalStatus: 'draft', _status: 'draft', title: 'Título editado' })
    // Escritura no-borrador sin _status explícito: el fallback trae 'published' y NO puede quedar publicado.
    await rejected(runBeforeChange(collection, { user, original: docIn('publicado'), data: { title: 'Editado en vivo' } }), 403)
    await rejected(
      runBeforeChange(collection, { user, original: docIn('publicado'), data: { title: 'Editado en vivo', _status: 'published' } }),
      403,
    )
  })

  it('9c. un autor no despublica (PATCH solo _status: draft sin cambios de contenido = 403)', async () => {
    for (const role of ['editor', 'correspondent']) {
      await rejected(runBeforeChange(collection, { user: userOf(role), original: docIn('publicado'), data: { _status: 'draft' } }), 403)
    }
  })

  it('9d. el Publicador despublica (draft/draft) y no toca el contenido', async () => {
    const out = await runBeforeChange(collection, {
      user: userOf('publisher'),
      original: docIn('publicado'),
      data: { _status: 'draft', title: 'No debería cambiar' },
    })
    expect(out).toMatchObject({ approvalStatus: 'draft', _status: 'draft', title: 'Título original' })
  })

  it('9e. el Superadmin despublica con el botón (solo _status) y, si además edita, conserva su edición como autor', async () => {
    const user = userOf('superadmin')
    const plain = await runBeforeChange(collection, { user, original: docIn('publicado'), data: { _status: 'draft' } })
    expect(plain).toMatchObject({ approvalStatus: 'draft', _status: 'draft', title: 'Título original' })
    const edited = await runBeforeChange(collection, { user, original: docIn('publicado'), data: { _status: 'draft', title: 'Editado' } })
    expect(edited).toMatchObject({ approvalStatus: 'draft', _status: 'draft', title: 'Editado' })
  })

  it('9f. el Superadmin no edita contenido publicado en vivo (sin guardar como borrador): 422 y no se descarta en silencio', async () => {
    await rejected(
      runBeforeChange(collection, { user: userOf('superadmin'), original: docIn('publicado'), data: { title: 'Edición en vivo' } }),
      422,
    )
  })

  it('10. invariante: _status published <=> approvalStatus publicado para toda combinación rol × origen × destino', async () => {
    let allowed = 0
    for (const role of ROLES) {
      for (const from of STATES) {
        for (const toState of STATES) {
          for (const toStatus of ['draft', 'published']) {
            const original = docIn(from)
            try {
              const out = await runBeforeChange(collection, {
                user: userOf(role),
                original,
                data: { approvalStatus: toState, _status: toStatus, reviewComment: 'motivo' },
              })
              allowed += 1
              expect(out._status === 'published', `${role} ${from}->${toState}/${toStatus}`).toBe(out.approvalStatus === 'publicado')
            } catch (error) {
              const status = (error as { status?: number }).status
              expect([403, 422], `${role} ${from}->${toState}/${toStatus}: ${String(error)}`).toContain(status)
            }
          }
        }
      }
    }
    expect(allowed).toBeGreaterThan(0)
  })

  it('11. roles sin función editorial o anónimos con sesión desconocida reciben 403', async () => {
    for (const role of ['viewer', 'auditor', 'media-manager', 'hacker', undefined]) {
      await rejected(runBeforeChange(collection, { user: { id: 3, role, email: 'x@unc.test' }, original: docIn('draft'), data: { approvalStatus: 'en_revision' } }), 403)
    }
  })

  it('11b. un intento denegado (403) queda en auditoría con resultado error; un 422 no', async () => {
    await rejected(
      runBeforeChange(collection, { user: userOf('editor'), original: docIn('aprobado'), data: { _status: 'published' } }),
      403,
    )
    expect(logAudit).toHaveBeenCalledTimes(1)
    expect(logAudit.mock.calls[0][0]).toMatchObject({
      usuario: 'editor@unc.test',
      accion: 'publicar',
      coleccion: collection.slug,
      resultado: 'error',
    })
    logAudit.mockClear()
    await rejected(runBeforeChange(collection, { user: userOf('publisher'), original: docIn('draft'), data: { _status: 'published' } }), 422)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('11c. reviewComment solo lo escribe el Revisor (access) y nadie lo crea', async () => {
    const field = findField(collection.fields as any[], 'reviewComment')
    for (const role of ROLES) {
      expect(await field.access.update({ req: { user: userOf(role) } }), role).toBe(role === 'reviewer')
      expect(await field.access.create({ req: { user: userOf(role) } }), role).toBe(false)
    }
    expect(field.admin.readOnly).toBe(false)
  })

  it('12. sin usuario (Local API del servidor: semillas) el validador no interviene', async () => {
    const out = await runBeforeChange(collection, {
      operation: 'create',
      user: undefined,
      data: { title: 'Semilla', approvalStatus: 'publicado', _status: 'published' },
    })
    expect(out).toMatchObject({ approvalStatus: 'publicado', _status: 'published' })
  })
})

describe.each(collections)('DEP-03 hook beforeOperation de %s: autores y revisores nunca escriben la fila principal', (_slug, collection) => {
  const run = async (user: unknown, operation: string) => {
    const hooks: AnyFn[] = (collection.hooks as any)?.beforeOperation ?? []
    expect(hooks.length, `${collection.slug} no declara hooks.beforeOperation (DEP-03)`).toBeGreaterThan(0)
    let args: Doc = { collection: {}, id: 1, data: {}, req: { user } }
    for (const hook of hooks) {
      args = (await hook({ args, collection: {}, context: {}, operation, req: { user } })) ?? args
    }
    return args
  }

  it.each(['editor', 'correspondent', 'reviewer', 'web-admin', 'auditor', 'viewer'])('fuerza draft: true para %s', async (role) => {
    expect((await run(userOf(role), 'update')).draft).toBe(true)
  })

  it.each(['publisher', 'superadmin'])('no toca la actualización de %s', async (role) => {
    expect((await run(userOf(role), 'update')).draft).toBeUndefined()
  })

  it('no toca create ni las operaciones del servidor sin usuario', async () => {
    expect((await run(userOf('editor'), 'create')).draft).toBeUndefined()
    expect((await run(undefined, 'update')).draft).toBeUndefined()
  })
})

describe.each(collections)('DEP-03 access por operación en %s', (_slug, collection) => {
  const call = async (fn: unknown, user: unknown) => {
    expect(typeof fn).toBe('function')
    return (fn as AnyFn)({ req: { user } })
  }
  const isPaginas = collection === Paginas

  it('create: solo autores', async () => {
    const allowed = ['superadmin', 'editor', 'correspondent', ...(isPaginas ? ['web-admin'] : [])]
    for (const role of ROLES) {
      expect(await call(collection.access?.create, userOf(role)), role).toBe(allowed.includes(role))
    }
    expect(await call(collection.access?.create, null)).toBe(false)
  })

  it('update: editor, revisor, publicador y superadmin; correspondent nunca con acceso total', async () => {
    const full = ['superadmin', 'editor', 'reviewer', 'publisher', ...(isPaginas ? ['web-admin'] : [])]
    for (const role of ROLES) {
      const result = await call(collection.access?.update, userOf(role))
      if (role === 'correspondent') expect(result, role).not.toBe(true)
      else expect(result, role).toBe(full.includes(role))
    }
    expect(await call(collection.access?.update, null)).toBe(false)
    expect(await call(collection.access?.update, { id: 9, role: 'hacker' })).toBe(false)
  })

  it('delete no cambia (punto por confirmar de SEC-03)', async () => {
    for (const role of ROLES) {
      expect(await call(collection.access?.delete, userOf(role)), role).toBe(['superadmin', 'web-admin', 'publisher'].includes(role))
    }
  })

  it('read: auditor y viewer solo publicados; correspondent ya no tiene lectura completa', async () => {
    const PUBLISHED_ONLY = { _status: { equals: 'published' } }
    expect(await call(collection.access?.read, userOf('auditor'))).toEqual(PUBLISHED_ONLY)
    expect(await call(collection.access?.read, userOf('viewer'))).toEqual(PUBLISHED_ONLY)
    expect(await call(collection.access?.read, userOf('correspondent'))).not.toBe(true)
    expect(await call(collection.access?.readVersions, userOf('correspondent'))).not.toBe(true)
    expect(await call(collection.access?.readVersions, userOf('auditor'))).toBe(false)
  })
})

describe.each(collections)('DEP-03 auditoría y notificaciones de %s (afterChange real)', (slug, collection) => {
  const runAfter = async (opts: { user: unknown; previousDoc?: Doc; doc: Doc; operation?: 'create' | 'update' }) => {
    const hooks: AnyFn[] = collection.hooks?.afterChange ?? []
    expect(hooks.length).toBeGreaterThan(0)
    let doc = opts.doc
    for (const hook of hooks) {
      doc =
        (await hook({
          collection: { slug },
          context: {},
          data: opts.doc,
          doc,
          operation: opts.operation ?? 'update',
          previousDoc: opts.previousDoc,
          req: { user: opts.user, payload: { findByID }, context: {}, headers: new Headers() },
        })) || doc
    }
  }

  const transition = (from: string, to: string, extra: Doc = {}) => ({
    previousDoc: docIn(from, { createdBy: 20 }),
    doc: docIn(to, { createdBy: 20, ...extra }),
  })

  const auditCalls = () => logAudit.mock.calls.map((c) => c[0] as Doc)

  it.each([
    ['draft', 'en_revision', 'editor', 'revisar'],
    ['en_revision', 'aprobado', 'reviewer', 'aprobar'],
    ['en_revision', 'rechazado', 'reviewer', 'rechazar'],
    ['aprobado', 'publicado', 'publisher', 'publicar'],
    ['rechazado', 'draft', 'editor', 'actualizar'],
    ['publicado', 'draft', 'publisher', 'actualizar'],
  ])('registra %s -> %s con la acción existente «%s»', async (from, to, role, accion) => {
    await runAfter({ user: userOf(role, 11), ...transition(from, to) })
    expect(auditCalls()).toHaveLength(1)
    expect(auditCalls()[0]).toMatchObject({ usuario: `${role}@unc.test`, accion, coleccion: slug, resultado: 'exito' })
  })

  it('la creación registra «crear» y una edición simple «actualizar»', async () => {
    await runAfter({ user: userOf('editor'), operation: 'create', previousDoc: undefined, doc: docIn('draft') })
    await runAfter({ user: userOf('editor'), previousDoc: docIn('draft'), doc: docIn('draft', { title: 'otro' }) })
    expect(auditCalls().map((c) => c.accion)).toEqual(['crear', 'actualizar'])
  })

  it('«aprobada», «rechazada» y «publicada» notifican al AUTOR (createdBy), no al actor', async () => {
    await runAfter({ user: userOf('reviewer', 11), ...transition('en_revision', 'aprobado') })
    await runAfter({ user: userOf('reviewer', 11), ...transition('en_revision', 'rechazado', { approvalHistory: [{ accion: 'rejected', comentario: 'Falta fuente' }] }) })
    await runAfter({ user: userOf('publisher', 12), ...transition('aprobado', 'publicado') })
    expect(notifyApprovalStateChange).toHaveBeenCalledTimes(3)
    for (const call of notifyApprovalStateChange.mock.calls) {
      expect(call[5], 'usuarioEmail (destinatario)').toBe('autor@unc.test')
    }
    expect(notifyApprovalStateChange.mock.calls[1][8], 'comentario del rechazo').toBe('Falta fuente')
  })

  it('sin autor conocido (createdBy nulo) no se notifica a nadie', async () => {
    await runAfter({
      user: userOf('reviewer', 11),
      previousDoc: docIn('en_revision'),
      doc: docIn('aprobado'),
    })
    expect(notifyApprovalStateChange).not.toHaveBeenCalled()
  })
})
