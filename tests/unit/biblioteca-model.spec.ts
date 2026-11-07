// INST-06 (modelo y consulta): `normalizeQuery`, `mapTesis`, `mapTesisList` y `getTesisCatalogo` de /biblioteca.
// Amenazas: (1) un enlace de PDF con `javascript:`, `http:` o credenciales llegando a un href; (2) una caída del CMS
// mostrada como «sin resultados» (la consulta anterior devolvía una lista vacía de demostración ante cualquier error);
// (3) una fila corrupta que rompa la página; (4) un término de búsqueda enorme o con espacios que llegue tal cual al CMS.
// Límite: funciones puras y un cliente del CMS simulado; el render va en biblioteca-page.spec.ts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { MAX_QUERY_LENGTH, mapTesis, mapTesisList, normalizeQuery } from '../../lib/cms/tesisCatalogo'
import { getTesisCatalogo } from '../../lib/cms/queries/tesisCatalogo'

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  titulo: 'Una tesis',
  autor: 'Ana Pérez',
  anio: 2024,
  facultad: { nombre: 'Facultad de Medicina', slug: 'facultad-de-medicina' },
  resumen: 'Resumen',
  urlPdf: 'https://repositorio.example.org/tesis.pdf',
  ...over,
})

describe('INST-06 normalizeQuery', () => {
  it('recorta, junta espacios y limita a 100 caracteres', () => {
    expect(normalizeQuery('  hola    mundo  ')).toBe('hola mundo')
    expect(normalizeQuery('a'.repeat(500))).toHaveLength(MAX_QUERY_LENGTH)
    expect(normalizeQuery('b'.repeat(99) + '   c')).toBe('b'.repeat(99))
  })

  it('un valor que no es texto equivale a vacío y de una lista toma el primero', () => {
    for (const v of [undefined, null, 5, {}, '', '   ']) expect(normalizeQuery(v)).toBe('')
    expect(normalizeQuery(['uno', 'dos'])).toBe('uno')
  })
})

describe('INST-06 mapTesis', () => {
  it('mapea una fila completa con la facultad poblada', () => {
    expect(mapTesis(row())).toEqual({
      id: 1,
      titulo: 'Una tesis',
      autor: 'Ana Pérez',
      anio: 2024,
      facultad: 'Facultad de Medicina',
      resumen: 'Resumen',
      urlPdf: 'https://repositorio.example.org/tesis.pdf',
    })
  })

  it('sin facultad poblada, sin resumen o sin enlace no inventa nada', () => {
    const t = mapTesis(row({ facultad: 7, resumen: '  ', urlPdf: undefined }))!
    expect(t.facultad).toBeUndefined()
    expect(t.resumen).toBeUndefined()
    expect(t.urlPdf).toBeUndefined()
  })

  it('un enlace de PDF con javascript:, http:, credenciales o forma inválida pierde el enlace pero la tesis se conserva', () => {
    for (const urlPdf of ['javascript:alert(1)', 'http://repositorio.example.org/t.pdf', 'https://user:pass@repositorio.example.org/t.pdf', '//evil.example/t.pdf', 'no-es-url', 42]) {
      const t = mapTesis(row({ urlPdf }))
      expect(t, String(urlPdf)).not.toBeNull()
      expect(t!.urlPdf, String(urlPdf)).toBeUndefined()
    }
  })

  it('descarta filas sin id, título, autor o con un año fuera de rango', () => {
    expect(mapTesis(row({ id: undefined }))).toBeNull()
    expect(mapTesis(row({ titulo: ' ' }))).toBeNull()
    expect(mapTesis(row({ autor: '' }))).toBeNull()
    expect(mapTesis(row({ anio: 1800 }))).toBeNull()
    expect(mapTesis(row({ anio: 2024.5 }))).toBeNull()
    expect(mapTesis(row({ anio: '2024' }))).toBeNull()
    expect(mapTesis(null)).toBeNull()
    expect(mapTesisList(undefined)).toEqual([])
    expect(mapTesisList([row({ id: 1 }), row({ id: 2, titulo: '' })])).toHaveLength(1)
  })
})

describe('INST-06 getTesisCatalogo', () => {
  beforeEach(() => { cmsFetch.mockReset() })

  it('sin término pide las más recientes (sin filtro); con término busca por título o autor, con la etiqueta propia', async () => {
    cmsFetch.mockResolvedValue({ docs: [row()], totalDocs: 1 })
    await getTesisCatalogo({ q: '', limit: 12 })
    const sin = decodeURIComponent(cmsFetch.mock.calls[0][0])
    expect(sin).toContain('sort=-anio')
    expect(sin).not.toContain('where[or]')
    await getTesisCatalogo({ q: 'ana', limit: 12 })
    const con = decodeURIComponent(cmsFetch.mock.calls[1][0])
    expect(con).toContain('where[or][0][titulo][like]=ana')
    expect(con).toContain('where[or][1][autor][like]=ana')
    expect(cmsFetch.mock.calls[1][1]).toEqual({ tags: ['tesis'] })
  })

  it('devuelve las tesis con el total del CMS (que puede ser mayor que lo mostrado)', async () => {
    cmsFetch.mockResolvedValue({ docs: [row({ id: 1 }), row({ id: 2 })], totalDocs: 40 })
    const r = await getTesisCatalogo({ q: 'x' })
    expect(r.status).toBe('ok')
    expect(r.status === 'ok' && [r.docs.length, r.total]).toEqual([2, 40])
  })

  it('un total incoherente (menor que lo mostrado o ausente) se corrige a lo mostrado', async () => {
    cmsFetch.mockResolvedValue({ docs: [row({ id: 1 }), row({ id: 2 })], totalDocs: 1 })
    expect((await getTesisCatalogo()) as { total: number }).toMatchObject({ total: 2 })
    cmsFetch.mockResolvedValue({ docs: [row()] })
    expect((await getTesisCatalogo()) as { total: number }).toMatchObject({ total: 1 })
  })

  it('sin resultados es «empty»; con el CMS caído o una respuesta rara, «unavailable» (nunca una lista vacía de demostración)', async () => {
    cmsFetch.mockResolvedValue({ docs: [], totalDocs: 0 })
    expect(await getTesisCatalogo({ q: 'nada' })).toEqual({ status: 'empty' })
    cmsFetch.mockResolvedValue({ docs: [row({ titulo: '' })] })
    expect(await getTesisCatalogo()).toEqual({ status: 'empty' })
    cmsFetch.mockRejectedValue(new Error('boom'))
    expect(await getTesisCatalogo({ q: 'ana' })).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue({ nada: true })
    expect(await getTesisCatalogo()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue(undefined)
    expect(await getTesisCatalogo()).toEqual({ status: 'unavailable' })
  })

  it('el código del modelo y de la consulta no trae tesis ni datos de demostración', () => {
    for (const f of ['lib/cms/tesisCatalogo.ts', 'lib/cms/queries/tesisCatalogo.ts']) {
      expect(readFileSync(resolve(process.cwd(), f), 'utf8'), f).not.toMatch(/DEMO_|demoFallback|Medicina|Odontolog/)
    }
  })
})
