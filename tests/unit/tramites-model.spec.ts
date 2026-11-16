// INST-05 (T2): modelo y consulta de /tramites (`mapTramite`, `agruparTramites`, `getTramites`; spec docs/specs/portal/TRAMITES.md §2.4).
// Amenazas: (1) mostrar una caída del CMS como «sin trámites» o requisitos escritos en el código; (2) publicar un trámite
// inactivo o una fila corrupta; (3) inventar un dato que el CMS no trae (nota, descripción, orden); (4) una facultad o un
// trámite perdido en silencio por un orden mal formado.
// Límite: funciones puras y un cliente del CMS simulado; el render va en tramites-page.spec.ts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { agruparTramites, mapTramite } from '../../lib/cms/tramites'
import { getTramites } from '../../lib/cms/queries/tramites'

const FAC_A = { slug: 'facultad-a', nombre: 'Facultad de Álgebra' }
const FAC_B = { slug: 'facultad-b', nombre: 'Facultad de Zoología' }
const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  titulo: 'Inscripción',
  facultad: FAC_A,
  activa: true,
  requisitos: [{ id: 'a', texto: 'Cédula' }, { id: 'b', texto: '  Foto  ' }, { id: 'c', texto: '   ' }, { id: 'd' }],
  ...over,
})

describe('INST-05 mapTramite', () => {
  it('mapea una fila: recorta los requisitos, omite los vacíos y no inventa nota, descripción ni etiqueta', () => {
    const t = mapTramite(row())!
    expect(t).toMatchObject({ id: 1, titulo: 'Inscripción', requisitos: ['Cédula', 'Foto'], orden: 99, facultad: FAC_A })
    expect(t.nota).toBeUndefined()
    expect(t.descripcion).toBeUndefined()
    expect(t.etiqueta).toBeUndefined()
  })

  it('conserva la etiqueta, la descripción, la nota y un orden numérico', () => {
    const t = mapTramite(row({ etiqueta: 'Art. 150°', descripcion: 'Desc', nota: 'Nota', orden: 2 }))!
    expect(t).toMatchObject({ etiqueta: 'Art. 150°', descripcion: 'Desc', nota: 'Nota', orden: 2 })
  })

  it('descarta filas inactivas, sin id, sin título o sin facultad válida', () => {
    expect(mapTramite(row({ activa: false }))).toBeNull()
    expect(mapTramite(row({ id: undefined }))).toBeNull()
    expect(mapTramite(row({ titulo: '  ' }))).toBeNull()
    expect(mapTramite(row({ facultad: null }))).toBeNull()
    expect(mapTramite(row({ facultad: 7 }))).toBeNull()
    expect(mapTramite(row({ facultad: { slug: 'x' } }))).toBeNull()
    expect(mapTramite('x')).toBeNull()
    expect(mapTramite(null)).toBeNull()
  })

  it('un orden que no es número usa 99 y un trámite sin requisitos sigue siendo válido', () => {
    expect(mapTramite(row({ orden: 'x', requisitos: undefined }))).toMatchObject({ orden: 99, requisitos: [] })
  })
})

describe('INST-05 agruparTramites', () => {
  const rows = [
    row({ id: 1, titulo: 'Zeta', facultad: FAC_B, orden: 2 }),
    row({ id: 2, titulo: 'Alfa', facultad: FAC_B, orden: 1 }),
    row({ id: 3, titulo: 'Beta', facultad: FAC_A }),
    row({ id: 4, titulo: 'Inactivo', facultad: FAC_A, activa: false }),
    row({ id: 5, titulo: 'Gamma', facultad: FAC_B, orden: 1 }),
  ]

  it('agrupa por facultad en orden alfabético y ordena por «orden» y título', () => {
    const g = agruparTramites(rows)
    expect(g.map((x) => x.facultad.slug)).toEqual(['facultad-a', 'facultad-b'])
    expect(g[1].tramites.map((t) => t.titulo)).toEqual(['Alfa', 'Gamma', 'Zeta'])
  })

  it('no pierde ningún trámite válido y descarta el inactivo', () => {
    expect(agruparTramites(rows).reduce((n, g) => n + g.tramites.length, 0)).toBe(4)
  })

  it('una entrada que no es lista da un resultado vacío', () => {
    expect(agruparTramites(undefined)).toEqual([])
    expect(agruparTramites({})).toEqual([])
  })
})

describe('INST-05 getTramites', () => {
  beforeEach(() => { cmsFetch.mockReset() })

  it('devuelve los grupos cuando el CMS tiene trámites activos y pide solo los activos de la etiqueta propia', async () => {
    cmsFetch.mockResolvedValue({ docs: [row({ id: 1 }), row({ id: 2, facultad: FAC_B })] })
    const r = await getTramites()
    expect(r.status).toBe('ok')
    expect(r.status === 'ok' && r.grupos).toHaveLength(2)
    const [url, opts] = cmsFetch.mock.calls[0]
    expect(url).toContain('/tramites?')
    expect(decodeURIComponent(url)).toContain('where[activa][equals]=true')
    expect(opts).toEqual({ tags: ['tramites'] })
  })

  it('sin trámites activos es «empty»; con el CMS caído o una respuesta rara, «unavailable» (nunca requisitos inventados)', async () => {
    cmsFetch.mockResolvedValue({ docs: [] })
    expect(await getTramites()).toEqual({ status: 'empty' })
    cmsFetch.mockResolvedValue({ docs: [row({ activa: false }), row({ titulo: '' })] })
    expect(await getTramites()).toEqual({ status: 'empty' })
    cmsFetch.mockRejectedValue(new Error('boom'))
    expect(await getTramites()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue({ nada: true })
    expect(await getTramites()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue(undefined)
    expect(await getTramites()).toEqual({ status: 'unavailable' })
  })

  it('el código del modelo y de la consulta no trae requisitos ni nombres de facultades', () => {
    for (const f of ['lib/cms/tramites.ts', 'lib/cms/queries/tramites.ts']) {
      expect(readFileSync(resolve(process.cwd(), f), 'utf8'), f).not.toMatch(/Cédula|Bachiller|Medicina|Odontolog|Agrarias|NAUTILUS/)
    }
  })
})
