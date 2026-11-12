// INST-08 (modelo y consulta): `mapRevista`, `mapRevistas` y `getRevistasCatalogo` de /revistas.
// Amenazas: (1) un enlace a OJS con `javascript:`, `http:` o credenciales llegando a un href; (2) una caída del CMS
// mostrada como «sin revistas» (la consulta anterior devolvía una lista vacía ante cualquier error); (3) una fila corrupta
// que rompa la página; (4) una portada con una URL ajena al CMS llegando a `next/image`.
// Límite: funciones puras y un cliente del CMS simulado; el render va en revistas-page.spec.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { mapRevista, mapRevistas } from '../../lib/cms/revistasCatalogo'
import { getRevistasCatalogo } from '../../lib/cms/queries/revistasCatalogo'

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  nombre: 'Revista Científica UNC',
  descripcion: 'Investigación de la universidad.',
  anioInicio: 2015,
  urlOjs: 'https://ojs.example.org/rcunc',
  activa: true,
  portada: null,
  ...over,
})

describe('INST-08 mapRevista', () => {
  it('convierte una fila válida y recorta los textos', () => {
    expect(mapRevista(row({ nombre: '  Revista  ' }))).toMatchObject({ id: 1, nombre: 'Revista', anioInicio: 2015, urlOjs: 'https://ojs.example.org/rcunc' })
  })

  it('descarta filas inactivas o sin id, nombre o descripción', () => {
    for (const bad of [row({ activa: false }), row({ id: undefined }), row({ nombre: '  ' }), row({ descripcion: '' }), null, 'x', []]) expect(mapRevista(bad)).toBeNull()
  })

  it('solo acepta enlaces https sin credenciales; si no, la revista se muestra sin enlace', () => {
    for (const bad of ['javascript:alert(1)', 'http://ojs.example.org', 'https://u:p@ojs.example.org', 'data:text/html,x', '', 5, undefined]) {
      const r = mapRevista(row({ urlOjs: bad }))
      expect(r, String(bad)).not.toBeNull()
      expect(r!.urlOjs).toBeUndefined()
    }
  })

  it('un año fuera de rango no descarta la revista, solo se omite el año', () => {
    for (const bad of [1500, 2300, 2015.5, '2015', undefined]) expect(mapRevista(row({ anioInicio: bad }))!.anioInicio).toBeUndefined()
  })

  it('la portada solo se acepta con una URL de medios válida y con texto alternativo', () => {
    // `resolveMediaUrl` antepone el origen del CMS a la ruta relativa: se comprueba el final y el alt.
    const ok = mapRevista(row({ portada: { url: '/api/media/file/rc.png', alt: 'Portada' } }))!.portada
    expect(ok?.url).toMatch(/\/api\/media\/file\/rc\.png$/)
    expect(ok?.alt).toBe('Portada')
    expect(mapRevista(row({ portada: { url: 'javascript:alert(1)', alt: 'x' } }))!.portada).toBeUndefined()
    expect(mapRevista(row({ portada: { url: null } }))!.portada).toBeUndefined()
    expect(mapRevista(row({ portada: { url: '/api/media/file/rc.png' } }))!.portada?.alt).toBe('')
  })

  it('mapRevistas conserva el orden recibido y descarta las inválidas', () => {
    const out = mapRevistas([row({ id: 2, nombre: 'B' }), row({ id: 3, activa: false }), row({ id: 1, nombre: 'A' })])
    expect(out.map((r) => r.nombre)).toEqual(['B', 'A'])
    expect(mapRevistas('no es lista')).toEqual([])
  })
})

describe('INST-08 getRevistasCatalogo', () => {
  beforeEach(() => {
    cmsFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('pide solo las activas, por nombre, con la etiqueta `revistas`', async () => {
    cmsFetch.mockResolvedValue({ docs: [row()], totalDocs: 1 })
    await getRevistasCatalogo()
    const [path, opts] = cmsFetch.mock.calls[0]
    expect(path).toContain('/revistas?')
    expect(path).toContain('where%5Bactiva%5D%5Bequals%5D=true')
    expect(path).toContain('sort=nombre')
    expect(opts).toEqual({ tags: ['revistas'] })
  })

  it('ok con revistas, empty sin ninguna válida', async () => {
    cmsFetch.mockResolvedValue({ docs: [row()], totalDocs: 1 })
    expect(await getRevistasCatalogo()).toMatchObject({ status: 'ok', docs: [{ nombre: 'Revista Científica UNC' }] })
    cmsFetch.mockResolvedValue({ docs: [], totalDocs: 0 })
    expect(await getRevistasCatalogo()).toEqual({ status: 'empty' })
    cmsFetch.mockResolvedValue({ docs: [row({ activa: false })] })
    expect(await getRevistasCatalogo()).toEqual({ status: 'empty' })
  })

  it('una caída o una respuesta sin lista es `unavailable`, nunca `empty`, y no filtra el mensaje del error', async () => {
    cmsFetch.mockRejectedValue(new Error('http://cms.interno:3002 SECRETO'))
    expect(await getRevistasCatalogo()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue({ nope: true })
    expect(await getRevistasCatalogo()).toEqual({ status: 'unavailable' })
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(' ')
    expect(logged).not.toContain('SECRETO')
  })
})
