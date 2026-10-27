// PRA-01 (fase CMS): configuración de `reconocimientos`, `acreditaciones` y los campos nuevos de `facultades`.
// Amenazas: (1) un dato sin fuente o sin confirmar visible al público; (2) escritura por roles no
// institucionales; (3) lectura anónima de filas inactivas; (4) logos con rutas arbitrarias.
// Límite: contrato sobre la configuración; no ejecuta Payload ni la BD.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {},
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => 'x' }))

import { Reconocimientos } from '../../apps/cms/src/collections/Reconocimientos'
import { Acreditaciones } from '../../apps/cms/src/collections/Acreditaciones'
import { Facultades } from '../../apps/cms/src/collections/Facultades'
import { canWriteInstitutional, readActiveOrInstitutional } from '../../apps/cms/src/access/roles'
import {
  validateFacultadLogoPath,
  validateReconocimientoLogoPath,
} from '../../apps/cms/src/utilities/validators'

type F = {
  name?: string
  type?: string
  required?: boolean
  defaultValue?: unknown
  validate?: unknown
  fields?: F[]
  relationTo?: string
  options?: Array<{ value: string } | string>
  label?: string
  admin?: { description?: string }
  maxLength?: number
  minRows?: number
}
const fieldsOf = (c: { fields: readonly unknown[] }) => c.fields as F[]
const get = (fields: F[], name: string) => {
  const f = fields.find((x) => x.name === name)
  expect(f, `campo ${name}`).toBeDefined()
  return f as F
}
const values = (f: F) => (f.options ?? []).map((o) => (typeof o === 'string' ? o : o.value))

describe('PRA-01: reconocimientos', () => {
  const fields = fieldsOf(Reconocimientos)

  it('slug, título del panel y columnas', () => {
    expect(Reconocimientos.slug).toBe('reconocimientos')
    expect(Reconocimientos.admin?.useAsTitle).toBe('nombre')
    expect(Reconocimientos.admin?.defaultColumns).toEqual(
      expect.arrayContaining(['nombre', 'entidad', 'orden', 'active', 'verificado']),
    )
    expect(Reconocimientos.defaultSort).toBe('orden')
  })

  it('tiene los campos del modelo y los obligatorios correctos', () => {
    expect(get(fields, 'nombre').required).toBe(true)
    expect(get(fields, 'entidad').required).toBe(true)
    for (const n of ['sitioOficial', 'logoPath', 'logo', 'logoAlt', 'orden', 'active', 'verificado', 'ediciones']) {
      get(fields, n)
    }
    expect(get(fields, 'logo')).toMatchObject({ type: 'upload', relationTo: 'media' })
  })

  it('active y verificado nacen en false (nada público sin confirmar)', () => {
    expect(get(fields, 'active').defaultValue).toBe(false)
    expect(get(fields, 'verificado').defaultValue).toBe(false)
  })

  it('la descripción de verificado explica qué significa', () => {
    expect(get(fields, 'verificado').admin?.description).toMatch(/fuente/i)
  })

  it('ediciones: array con fuenteUrl obligatoria y validada, año y distinción obligatorios', () => {
    const ed = get(fields, 'ediciones')
    expect(ed.type).toBe('array')
    expect(ed.minRows).toBe(1)
    const sub = ed.fields as F[]
    expect(get(sub, 'anio')).toMatchObject({ type: 'number', required: true })
    expect(get(sub, 'distincion').required).toBe(true)
    expect(values(get(sub, 'distincion'))).toEqual(
      expect.arrayContaining(['premio', 'premio-categoria', 'mencion-especial', 'reconocimiento', 'por-confirmar']),
    )
    expect(get(sub, 'fuenteUrl').required).toBe(true)
    expect(typeof get(sub, 'fuenteUrl').validate).toBe('function')
    get(sub, 'categoria')
    get(sub, 'nota')
    expect(get(sub, 'verificado').defaultValue).toBe(false)
  })

  it('valida sitioOficial (https) y logoPath (carpeta reconocimientos)', () => {
    const site = get(fields, 'sitioOficial').validate as (v: unknown) => unknown
    expect(site('javascript:alert(1)')).not.toBe(true)
    expect(site('https://www.conacyt.gov.py/')).toBe(true)
    expect(get(fields, 'logoPath').validate).toBe(validateReconocimientoLogoPath)
  })

  it('la fuente obligatoria rechaza vacío y http, acepta https', () => {
    const sub = get(fields, 'ediciones').fields as F[]
    const v = get(sub, 'fuenteUrl').validate as (v: unknown) => unknown
    expect(v('')).not.toBe(true)
    expect(v('http://x.example')).not.toBe(true)
    expect(v('https://x.example/a')).toBe(true)
  })
})

describe('PRA-01: acreditaciones', () => {
  const fields = fieldsOf(Acreditaciones)

  it('slug, título del panel y columnas', () => {
    expect(Acreditaciones.slug).toBe('acreditaciones')
    expect(Acreditaciones.admin?.useAsTitle).toBe('programa')
    expect(Acreditaciones.admin?.defaultColumns).toEqual(
      expect.arrayContaining(['programa', 'facultad', 'organismo', 'orden', 'active', 'verificado']),
    )
    expect(Acreditaciones.defaultSort).toBe('orden')
  })

  it('campos y relaciones', () => {
    expect(get(fields, 'programa').required).toBe(true)
    expect(get(fields, 'carrera')).toMatchObject({ type: 'relationship', relationTo: 'carreras' })
    expect(get(fields, 'carrera').required).toBeFalsy()
    expect(get(fields, 'facultad')).toMatchObject({ type: 'relationship', relationTo: 'facultades' })
    for (const n of ['sede', 'modelo', 'ciclo', 'resolucion', 'vigenciaDesde', 'vigenciaHasta', 'nota', 'orden', 'nivel']) {
      get(fields, n)
    }
  })

  it('organismo: aneaes, arcusur, otro (obligatorio)', () => {
    const o = get(fields, 'organismo')
    expect(o.required).toBe(true)
    expect(values(o)).toEqual(['aneaes', 'arcusur', 'otro'])
    expect(values(get(fields, 'modelo'))).toEqual(expect.arrayContaining(['modelo-nacional', 'arcusur']))
  })

  it('vigencias son fechas y fuenteUrl obligatoria y validada', () => {
    expect(get(fields, 'vigenciaDesde').type).toBe('date')
    expect(get(fields, 'vigenciaHasta').type).toBe('date')
    const f = get(fields, 'fuenteUrl')
    expect(f.required).toBe(true)
    expect((f.validate as (v: unknown) => unknown)('http://x.example')).not.toBe(true)
  })

  it('active y verificado nacen en false', () => {
    expect(get(fields, 'active').defaultValue).toBe(false)
    expect(get(fields, 'verificado').defaultValue).toBe(false)
  })
})

describe('PRA-01: facultades (campos nuevos)', () => {
  const fields = fieldsOf(Facultades)
  it('siglas (máx. 12) y logoPath validado; conserva imagen y activa', () => {
    expect(get(fields, 'siglas')).toMatchObject({ type: 'text', maxLength: 12 })
    expect(get(fields, 'logoPath').validate).toBe(validateFacultadLogoPath)
    get(fields, 'imagen')
    get(fields, 'activa')
  })
  // FAC-01 (SEC-10): la lectura anónima pasó de `true` a solo facultades activas (spec FACULTADES.md §3.1).
  it('read anónimo solo activas y escritura institucional', () => {
    const read = Facultades.access?.read as (a: unknown) => unknown
    expect(read({ req: { user: null } })).toEqual({ activa: { equals: true } })
    expect(Facultades.access?.update).toBe(canWriteInstitutional)
  })
  it('revalida al borrar además de al guardar', async () => {
    revalidatePortalTag.mockClear()
    for (const hook of Facultades.hooks?.afterDelete ?? []) await (hook as (a: unknown) => unknown)({})
    expect(revalidatePortalTag).toHaveBeenCalledWith('facultades')
  })
})

const ACTIVE_ONLY = { active: { equals: true } }
const READERS_RESTRICTED: Array<[string, unknown]> = [
  ['anónimo', null],
  ['viewer', { id: 2, role: 'viewer' }],
  ['auditor', { id: 3, role: 'auditor' }],
  ['editor', { id: 4, role: 'editor' }],
  ['publisher', { id: 5, role: 'publisher' }],
  ['reviewer', { id: 6, role: 'reviewer' }],
  ['correspondent', { id: 7, role: 'correspondent' }],
  ['media-manager', { id: 8, role: 'media-manager' }],
  ['rol desconocido', { id: 9, role: 'hacker' }],
]
const call = (fn: unknown, user: unknown) => (fn as (a: unknown) => unknown)({ req: { user } })

describe.each([
  ['reconocimientos', Reconocimientos],
  ['acreditaciones', Acreditaciones],
])('PRA-01: acceso a %s', (_slug, collection) => {
  it('read usa readActiveOrInstitutional; escritura canWriteInstitutional (sin permisos nuevos)', () => {
    expect(collection.access?.read).toBe(readActiveOrInstitutional)
    expect(collection.access?.create).toBe(canWriteInstitutional)
    expect(collection.access?.update).toBe(canWriteInstitutional)
    expect(collection.access?.delete).toBe(canWriteInstitutional)
  })

  it.each(READERS_RESTRICTED)('%s solo lee filas activas', (_n, user) => {
    expect(call(collection.access?.read, user)).toEqual(ACTIVE_ONLY)
  })

  it.each(['superadmin', 'web-admin'])('%s lee todo y escribe', (role) => {
    const user = { id: 1, role }
    expect(call(collection.access?.read, user)).toBe(true)
    expect(call(collection.access?.create, user)).toBe(true)
    expect(call(collection.access?.update, user)).toBe(true)
    expect(call(collection.access?.delete, user)).toBe(true)
  })

  it.each(READERS_RESTRICTED)('%s no puede crear, actualizar ni borrar', (_n, user) => {
    expect(call(collection.access?.create, user)).toBe(false)
    expect(call(collection.access?.update, user)).toBe(false)
    expect(call(collection.access?.delete, user)).toBe(false)
  })
})

describe.each([
  ['reconocimientos', Reconocimientos],
  ['acreditaciones', Acreditaciones],
])('PRA-01: hooks de %s', (slug, collection) => {
  beforeEach(() => {
    revalidatePortalTag.mockClear()
    logAudit.mockReset()
  })

  it('afterChange revalida la etiqueta de la colección y audita', async () => {
    for (const hook of collection.hooks?.afterChange ?? []) {
      await (hook as (a: unknown) => unknown)({ doc: { id: 1 }, operation: 'create', req: { payload: {} } })
    }
    expect(revalidatePortalTag).toHaveBeenCalledWith(slug, expect.anything())
    expect(logAudit).toHaveBeenCalledTimes(1)
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'crear', coleccion: slug })
  })

  it('afterDelete revalida y audita eliminar', async () => {
    for (const hook of collection.hooks?.afterDelete ?? []) {
      await (hook as (a: unknown) => unknown)({ doc: { id: 1 }, id: 1, req: { payload: {} } })
    }
    expect(revalidatePortalTag).toHaveBeenCalledWith(slug, expect.anything())
    expect(logAudit.mock.calls[0][0]).toMatchObject({ accion: 'eliminar', coleccion: slug })
  })
})
