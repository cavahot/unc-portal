// INST-12 (T1-T2): validadores del CMS, mapeador y consulta de /contacto/dependencias (spec docs/specs/portal/DEPENDENCIAS.md §2.1-2.3).
// Amenazas: (1) un enlace `javascript:`/`data:` o una ruta de logo fuera de /images/ llegando al portal desde el CMS; (2) una fila
// corrupta que rompa la página; (3) una caída del CMS mostrada como «sin contenido»; (4) filtrar el mensaje de un error.
// Límite: validadores y mapeador puros; no comprueba que los teléfonos o correos sean los oficiales.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import {
  validateDependenciaCorreo,
  validateDependenciaLogo,
  validateDependenciaSlug,
  validateDependenciaWeb,
} from '../../apps/cms/src/utilities/validators'
import { mapDependencias, telHref } from '../../lib/cms/dependencias'
import { getDependencias } from '../../lib/cms/queries/dependencias'

const sede = (over: Record<string, unknown> = {}) => ({
  nombre: 'Campus',
  direccion: 'Ruta V Km 2, Concepción',
  telefonos: [{ texto: '(595 331) 241069' }],
  correos: [{ texto: 'secgral@unc.edu.py' }],
  web: 'https://www.unc.edu.py',
  ...over,
})
const dep = (over: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'rectorado',
  nombre: 'Rectorado',
  logo: '/images/campus-3d/logo-unc.png',
  destacada: true,
  orden: 1,
  sedes: [sede()],
  ...over,
})

describe('INST-12 validadores del CMS', () => {
  it('slug: minúsculas y guiones', () => {
    expect(validateDependenciaSlug('ciencias-exactas')).toBe(true)
    for (const bad of ['', 'Rectorado', 'a b', 'a--b', '-a', 'a_b', 'x'.repeat(61), undefined]) expect(validateDependenciaSlug(bad)).not.toBe(true)
  })
  it('logo: solo rutas bajo /images/ con extensión de imagen', () => {
    expect(validateDependenciaLogo('/images/facultades/medicina.png')).toBe(true)
    for (const bad of ['', 'images/a.png', '/other/a.png', '/images/../secret.png', '//evil.com/a.png', 'https://evil.com/a.png', '/images/a.php', '/images/a.png?x=1', '/images\\a.png', undefined])
      expect(validateDependenciaLogo(bad)).not.toBe(true)
  })
  it('correo: formato de correo, sin espacios', () => {
    expect(validateDependenciaCorreo('a@unc.edu.py')).toBe(true)
    for (const bad of ['', 'sin-arroba', 'a@b', 'a b@c.d', 'a@@c.d', undefined]) expect(validateDependenciaCorreo(bad)).not.toBe(true)
  })
  it('web: vacío es válido; solo http y https sin credenciales', () => {
    for (const ok of [undefined, null, '', 'http://www.fca-unc.edu.py', 'https://x.edu.py/a']) expect(validateDependenciaWeb(ok)).toBe(true)
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.org', 'www.sin-esquema.org', 'https://user:pw@x.org', 'no es url'])
      expect(validateDependenciaWeb(bad)).not.toBe(true)
  })
})

describe('INST-12 mapDependencias', () => {
  it('convierte una fila válida y conserva el orden recibido', () => {
    const r = mapDependencias([dep({ id: 2, slug: 'medicina', nombre: 'Medicina', destacada: false }), dep()])
    expect(r.map((d) => d.slug)).toEqual(['medicina', 'rectorado'])
    expect(r[1]).toMatchObject({ nombre: 'Rectorado', destacada: true, logo: '/images/campus-3d/logo-unc.png' })
    expect(r[1].sedes[0]).toEqual({ nombre: 'Campus', direccion: 'Ruta V Km 2, Concepción', telefonos: ['(595 331) 241069'], correos: ['secgral@unc.edu.py'], web: 'https://www.unc.edu.py' })
  })
  it('descarta lo inválido sin romper: sin nombre, sin sedes, sede sin dirección, no objeto', () => {
    const r = mapDependencias([null, 'x', dep({ nombre: ' ' }), dep({ sedes: [] }), dep({ sedes: [sede({ direccion: '' })] }), dep({ slug: 'ok', sedes: [sede({ direccion: '' }), sede()] })])
    expect(r).toHaveLength(1)
    expect(r[0].slug).toBe('ok')
    expect(r[0].sedes).toHaveLength(1)
  })
  it('descarta un logo fuera de /images/, un correo mal formado y una web peligrosa, sin descartar la fila', () => {
    const r = mapDependencias([dep({ logo: 'https://evil.com/a.png', sedes: [sede({ correos: [{ texto: 'no-es-correo' }, { texto: 'ok@unc.edu.py' }], web: 'javascript:alert(1)', telefonos: [{ texto: '  ' }, { texto: '123' }] })] })])
    expect(r[0].logo).toBeNull()
    expect(r[0].sedes[0].correos).toEqual(['ok@unc.edu.py'])
    expect(r[0].sedes[0].web).toBeUndefined()
    expect(r[0].sedes[0].telefonos).toEqual(['123'])
  })
  it('telHref deja solo dígitos', () => {
    expect(telHref('(595 331) 241069')).toBe('tel:595331241069')
  })
})

describe('INST-12 getDependencias', () => {
  beforeEach(() => {
    cmsFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  it('pide solo las activas ordenadas, con la etiqueta de la colección', async () => {
    cmsFetch.mockResolvedValue({ docs: [dep()] })
    await getDependencias()
    const [path, opts] = cmsFetch.mock.calls[0]
    expect(path).toContain('/dependencias-contacto?')
    expect(path).toContain('where%5Bactiva%5D%5Bequals%5D=true')
    expect(path).toContain('sort=orden')
    expect(opts.tags).toEqual(['dependencias-contacto'])
  })
  it('ok con filas válidas, empty sin ninguna válida, unavailable en caída o forma inesperada (sin filtrar el error)', async () => {
    cmsFetch.mockResolvedValue({ docs: [dep()] })
    expect(await getDependencias()).toMatchObject({ status: 'ok' })
    cmsFetch.mockResolvedValue({ docs: [] })
    expect(await getDependencias()).toEqual({ status: 'empty' })
    cmsFetch.mockResolvedValue({ docs: [dep({ sedes: [] })] })
    expect(await getDependencias()).toEqual({ status: 'empty' })
    cmsFetch.mockRejectedValue(new Error('http://cms.interno SECRETO'))
    expect(await getDependencias()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue({ nada: true })
    expect(await getDependencias()).toEqual({ status: 'unavailable' })
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(' ')
    expect(logged).not.toContain('SECRETO')
  })
})
