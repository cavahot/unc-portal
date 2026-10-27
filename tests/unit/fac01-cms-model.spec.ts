// FAC-01: contrato de las colecciones `facultades`, `carreras` y `aranceles-facultad` (spec docs/specs/portal/FACULTADES.md §3).
// Amenazas: (1) lectura anónima de filas desactivadas (SEC-10); (2) escritura por roles no institucionales;
// (3) enlaces del CMS a hosts ajenos con la marca UNC; (4) montos corruptos publicados como oficiales;
// (5) obligar a inventar duración/título para poder cargar una carrera.
// Límite: prueba la configuración y los validadores puros; no ejecuta Payload ni la BD.
import { describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => 'x' }))

import { Facultades } from '../../apps/cms/src/collections/Facultades'
import { Carreras } from '../../apps/cms/src/collections/Carreras'
import { ArancelesFacultad } from '../../apps/cms/src/collections/ArancelesFacultad'
import { canWriteInstitutional, readActiveOrInstitutional, readFlagOrInstitutional } from '../../apps/cms/src/access/roles'
import {
  validateResolucionNumero,
  validateResolucionEnlace,
  validateRedUrl,
} from '../../apps/cms/src/utilities/validators'

type F = { name?: string; type?: string; required?: boolean; fields?: F[]; relationTo?: string; options?: Array<{ value: string }>; validate?: unknown; maxRows?: number; defaultValue?: unknown }
const get = (c: { fields: readonly unknown[] }, name: string) => {
  const f = (c.fields as F[]).find((x) => x.name === name)
  if (!f) throw new Error(`falta el campo ${name}`)
  return f
}
const read = (c: { access?: { read?: unknown } }, user: unknown) => (c.access?.read as (a: unknown) => unknown)({ req: { user } })

describe('FAC-01: lectura limitada a filas activas (SEC-10)', () => {
  it('readFlagOrInstitutional usa el campo indicado', () => {
    expect(readFlagOrInstitutional('activa')({ req: { user: null } } as never)).toEqual({ activa: { equals: true } })
    expect(readFlagOrInstitutional('activa')({ req: { user: { id: 1, role: 'superadmin' } } } as never)).toBe(true)
  })
  it.each([null, { id: 2, role: 'editor' }, { id: 3, role: 'hacker' }])('facultades y carreras: %j solo ve activas', (user) => {
    expect(read(Facultades, user)).toEqual({ activa: { equals: true } })
    expect(read(Carreras, user)).toEqual({ activa: { equals: true } })
  })
  it('aranceles-facultad reutiliza readActiveOrInstitutional y escritura institucional', () => {
    expect(ArancelesFacultad.access?.read).toBe(readActiveOrInstitutional)
    for (const op of ['create', 'update', 'delete'] as const) expect(ArancelesFacultad.access?.[op]).toBe(canWriteInstitutional)
    expect(Facultades.access?.update).toBe(canWriteInstitutional)
    expect(Carreras.access?.create).toBe(canWriteInstitutional)
  })
})

describe('FAC-01: facultades (campos nuevos)', () => {
  it('historia, direccion, sitioWeb, correosAdicionales y redes; conserva activa, imagen y logoPath', () => {
    expect(get(Facultades, 'historia').type).toBe('textarea')
    expect(get(Facultades, 'direccion').type).toBe('text')
    expect(get(Facultades, 'sitioWeb').type).toBe('text')
    expect(get(Facultades, 'correosAdicionales')).toMatchObject({ type: 'array', maxRows: 4 })
    const redes = get(Facultades, 'redes')
    expect(redes).toMatchObject({ type: 'array', maxRows: 6 })
    expect((redes.fields ?? []).find((f) => f.name === 'red')?.options?.map((o) => o.value)).toEqual(['facebook', 'instagram', 'x', 'youtube'])
    get(Facultades, 'activa')
    get(Facultades, 'imagen')
    get(Facultades, 'logoPath')
  })
  it('sitioWeb rechaza http y javascript', () => {
    const v = get(Facultades, 'sitioWeb').validate as (x: unknown) => unknown
    expect(v('https://www.founc.edu.py/')).toBe(true)
    expect(v('http://www.founc.edu.py')).not.toBe(true)
    expect(v('javascript:alert(1)')).not.toBe(true)
  })
})

describe('FAC-01: carreras', () => {
  it('duracion y titulo dejan de ser obligatorios (no se inventan)', () => {
    expect(get(Carreras, 'duracion').required).not.toBe(true)
    expect(get(Carreras, 'titulo').required).not.toBe(true)
  })
  it('perfil, orden y resoluciones (≤ 6) con validadores', () => {
    expect(get(Carreras, 'perfil').type).toBe('textarea')
    expect(get(Carreras, 'orden')).toMatchObject({ type: 'number', defaultValue: 99 })
    const res = get(Carreras, 'resoluciones')
    expect(res).toMatchObject({ type: 'array', maxRows: 6 })
    expect(res.fields?.find((f) => f.name === 'numero')?.validate).toBe(validateResolucionNumero)
    expect(res.fields?.find((f) => f.name === 'enlace')?.validate).toBe(validateResolucionEnlace)
  })
  it('revalida al borrar además de al guardar', async () => {
    revalidatePortalTag.mockClear()
    for (const hook of Carreras.hooks?.afterDelete ?? []) await (hook as (a: unknown) => unknown)({ doc: {} })
    expect(revalidatePortalTag).toHaveBeenCalledWith('carreras')
  })
})

describe('FAC-01: validadores de enlaces y números', () => {
  it.each(['165/15', '497/21', '18/16', '1234/2016'])('número válido %s', (n) => expect(validateResolucionNumero(n)).toBe(true))
  it.each(['', '165', 'abc/15', '165/15; drop', '12345/16'])('número inválido %j', (n) => expect(validateResolucionNumero(n)).not.toBe(true))
  it.each([
    'https://drive.google.com/open?id=0B5YtqOEn25_NTzBFTlJzZjVWY2M',
    'https://www.unc.edu.py/wp-content/uploads/x.pdf',
    'https://www.founc.edu.py/doc.pdf',
  ])('enlace permitido %s', (u) => expect(validateResolucionEnlace(u)).toBe(true))
  it.each([
    'http://drive.google.com/open?id=x',
    'https://drive.google.com.evil.example/x',
    'https://evil.example/?u=https://drive.google.com',
    'javascript:alert(1)',
  ])('enlace rechazado %s', (u) => expect(validateResolucionEnlace(u)).not.toBe(true))
  it('red social: host por red', () => {
    expect(validateRedUrl('https://www.facebook.com/founc.py', { siblingData: { red: 'facebook' } })).toBe(true)
    expect(validateRedUrl('https://x.com/fo_unc', { siblingData: { red: 'x' } })).toBe(true)
    expect(validateRedUrl('https://www.instagram.com/fo_unc/', { siblingData: { red: 'instagram' } })).toBe(true)
    expect(validateRedUrl('https://evil.example/founc', { siblingData: { red: 'facebook' } })).not.toBe(true)
    expect(validateRedUrl('https://x.com/fo_unc', { siblingData: { red: 'facebook' } })).not.toBe(true)
    expect(validateRedUrl('http://www.facebook.com/founc.py', { siblingData: { red: 'facebook' } })).not.toBe(true)
  })
})

describe('FAC-01: aranceles-facultad', () => {
  it('campos, grupos de la fuente e índice único por facultad+grupo+concepto', () => {
    expect(ArancelesFacultad.slug).toBe('aranceles-facultad')
    expect(get(ArancelesFacultad, 'facultad')).toMatchObject({ type: 'relationship', relationTo: 'facultades', required: true })
    expect(get(ArancelesFacultad, 'grupo').options?.map((o) => o.value)).toEqual(['multas', 'venta', 'servicios', 'medicos'])
    expect(get(ArancelesFacultad, 'active').defaultValue).toBe(true)
    expect(ArancelesFacultad.indexes).toEqual([{ fields: ['facultad', 'grupo', 'concepto'], unique: true }])
  })
  it.each([[10.5], [-1], [200_000_000], ['50000']])('monto inválido %j', async (m) => {
    const v = get(ArancelesFacultad, 'monto').validate as (x: unknown) => unknown
    expect(await v(m)).not.toBe(true)
  })
  it('monto válido', async () => {
    const v = get(ArancelesFacultad, 'monto').validate as (x: unknown) => unknown
    expect(await v(450000)).toBe(true)
  })
  it('revalida la etiqueta propia al guardar y al borrar', async () => {
    revalidatePortalTag.mockClear()
    const hooks = [...(ArancelesFacultad.hooks?.afterChange ?? []), ...(ArancelesFacultad.hooks?.afterDelete ?? [])]
    for (const hook of hooks) await (hook as (a: unknown) => unknown)({ doc: { id: 1 }, req: { user: null, headers: new Headers() }, operation: 'create' })
    expect(revalidatePortalTag).toHaveBeenCalledWith('aranceles-facultad', { collection: 'aranceles-facultad' })
  })
})
