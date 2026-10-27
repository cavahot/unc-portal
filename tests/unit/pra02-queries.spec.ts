// PRA-02: consultas del portal para «Premios y acreditaciones».
// Amenazas: (1) mostrar datos no confirmados; (2) sobre-pedir campos internos (`nota`) al CMS;
// (3) que una caída del CMS rompa o enmascare la portada con datos demo.
// Límite: se simula `fetch`; no se ejecuta Payload ni Postgres (la verificación en vivo se hizo aparte).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRecognitions, mapRecognitions } from '@/lib/cms/queries/recognitions'
import { getAccreditations, mapAccreditations, groupAccreditationsByFaculty } from '@/lib/cms/queries/accreditations'

const NOW = new Date('2026-10-23T12:00:00Z')

function stubFetch(body: unknown, status = 200) {
  const calls: { url: URL; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push({ url: new URL(href), init })
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const edition = (over: Record<string, unknown> = {}) => ({
  anio: 2016,
  distincion: 'mencion-especial',
  categoria: 'Pública Grande',
  fuenteUrl: 'https://www.conacyt.gov.py/x',
  verificado: true,
  ...over,
})
const recognition = (over: Record<string, unknown> = {}) => ({
  id: 1,
  nombre: 'Premio Nacional a la Calidad',
  entidad: 'CONACYT',
  sitioOficial: 'https://www.conacyt.gov.py',
  logoPath: '/images/reconocimientos/premio-calidad-conacyt.jpg',
  logoAlt: 'Logo del premio',
  active: true,
  verificado: true,
  ediciones: [edition()],
  ...over,
})

describe('getRecognitions (URL)', () => {
  it('pide solo activos y verificados, con tag, select anidado sin notas y límite acotado', async () => {
    const calls = stubFetch({ docs: [] })
    await getRecognitions()
    const sp = calls[0].url.searchParams
    expect(calls[0].url.pathname).toBe('/api/reconocimientos')
    expect(sp.get('where[active][equals]')).toBe('true')
    expect(sp.get('where[verificado][equals]')).toBe('true')
    expect(sp.get('sort')).toBe('orden')
    expect(Number(sp.get('limit'))).toBeLessThanOrEqual(10)
    expect(sp.getAll('depth')).toEqual(['0'])
    expect(sp.get('select[nombre]')).toBe('true')
    expect(sp.get('select[ediciones][anio]')).toBe('true')
    expect(sp.get('select[ediciones][verificado]')).toBe('true')
    expect(sp.get('select[nota]')).toBeNull()
    expect(sp.get('select[ediciones][nota]')).toBeNull()
    expect((calls[0].init as { next?: { tags?: string[] } }).next?.tags).toEqual(['reconocimientos'])
  })
})

describe('getAccreditations (URL)', () => {
  it('pide solo activas y verificadas, depth 1, populate mínimo de facultad, tag y límite', async () => {
    const calls = stubFetch({ docs: [] })
    await getAccreditations(NOW)
    const sp = calls[0].url.searchParams
    expect(calls[0].url.pathname).toBe('/api/acreditaciones')
    expect(sp.get('where[active][equals]')).toBe('true')
    expect(sp.get('where[verificado][equals]')).toBe('true')
    expect(sp.getAll('depth')).toEqual(['1'])
    expect(Number(sp.get('limit'))).toBeLessThanOrEqual(100)
    expect(sp.get('select[programa]')).toBe('true')
    expect(sp.get('select[nota]')).toBeNull()
    expect(sp.get('select[resolucion]')).toBeNull()
    expect(sp.get('populate[facultades][nombre]')).toBe('true')
    expect(sp.get('populate[facultades][siglas]')).toBe('true')
    expect(sp.get('populate[facultades][logoPath]')).toBe('true')
    expect(sp.get('populate[facultades][descripcion]')).toBeNull()
    expect((calls[0].init as { next?: { tags?: string[] } }).next?.tags).toEqual(['acreditaciones', 'facultades'])
  })
})

describe('caída del CMS (nunca rompe la portada, nunca usa demo)', () => {
  it('reconocimientos: red caída -> []', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    await expect(getRecognitions()).resolves.toEqual([])
  })
  it('acreditaciones: 500 -> []', async () => {
    stubFetch({ message: 'boom' }, 500)
    await expect(getAccreditations(NOW)).resolves.toEqual([])
  })
  it('respuesta sin datos activos -> []', async () => {
    stubFetch({ docs: [] })
    await expect(getRecognitions()).resolves.toEqual([])
    await expect(getAccreditations(NOW)).resolves.toEqual([])
  })
})

describe('mapRecognitions', () => {
  it('mapea un reconocimiento válido y ordena las ediciones de la más reciente a la más antigua', () => {
    const out = mapRecognitions([recognition({ ediciones: [edition(), edition({ anio: 2025, distincion: 'premio' })] })])
    expect(out).toHaveLength(1)
    expect(out[0].logoSrc).toBe('/images/reconocimientos/premio-calidad-conacyt.jpg')
    expect(out[0].ediciones.map((e) => e.anio)).toEqual([2025, 2016])
  })
  it('omite ediciones no verificadas y fuentes no https', () => {
    const out = mapRecognitions([
      recognition({
        ediciones: [
          edition({ verificado: false }),
          edition({ anio: 2020, fuenteUrl: 'javascript:alert(1)' }),
          edition({ anio: 2021, fuenteUrl: 'http://x.test' }),
          edition({ anio: 2025 }),
        ],
      }),
    ])
    expect(out[0].ediciones.map((e) => e.anio)).toEqual([2025])
  })
  it('omite un reconocimiento sin ediciones visibles, inactivo o no verificado', () => {
    expect(mapRecognitions([recognition({ ediciones: [edition({ verificado: false })] })])).toEqual([])
    expect(mapRecognitions([recognition({ active: false })])).toEqual([])
    expect(mapRecognitions([recognition({ verificado: false })])).toEqual([])
  })
  it('descarta logoPath inválido y sitioOficial inseguro, y usa el nombre como alt si falta', () => {
    const out = mapRecognitions([recognition({ logoPath: 'https://x.test/a.png', sitioOficial: 'javascript:1', logoAlt: '' })])
    expect(out[0].logoSrc).toBeUndefined()
    expect(out[0].sitioOficial).toBeUndefined()
    expect(out[0].logoAlt).toBe('Premio Nacional a la Calidad')
  })
  it('tolera basura sin lanzar', () => {
    expect(mapRecognitions([null, 3, 'x', {}] as unknown[])).toEqual([])
    expect(mapRecognitions(undefined as unknown as unknown[])).toEqual([])
  })
})

const fac = (id: number, nombre: string, extra: Record<string, unknown> = {}) => ({ id, nombre, ...extra })
const acr = (over: Record<string, unknown> = {}) => ({
  id: 10,
  programa: 'Contaduría Pública',
  facultad: fac(1, 'Facultad de Ciencias Económicas y Administrativas', {
    siglas: 'FCEA',
    logoPath: '/images/facultades/economicas.png',
  }),
  sede: 'Filial Horqueta',
  organismo: 'aneaes',
  modelo: 'modelo-nacional',
  fuenteUrl: 'https://www.aneaes.gov.py/doc.pdf',
  orden: 0,
  active: true,
  verificado: true,
  ...over,
})

describe('mapAccreditations y groupAccreditationsByFaculty', () => {
  it('agrupa por facultad, ordena por orden y omite vacías', () => {
    const rows = mapAccreditations(
      [
        acr({ id: 1, programa: 'Z', orden: 5 }),
        acr({ id: 2, programa: 'A', orden: 1 }),
        acr({
          id: 3,
          programa: 'Odontología',
          orden: 0,
          facultad: fac(2, 'Odontología', { logoPath: '/images/facultades/odontologia.png' }),
        }),
      ],
      NOW,
    )
    const groups = groupAccreditationsByFaculty(rows)
    expect(groups.map((g) => g.nombre)).toEqual(['Odontología', 'Facultad de Ciencias Económicas y Administrativas'])
    expect(groups[1].items.map((i) => i.programa)).toEqual(['A', 'Z'])
    expect(groupAccreditationsByFaculty([])).toEqual([])
  })
  it('las filas sin facultad van a un grupo aparte al final, sin logo', () => {
    const rows = mapAccreditations([acr({ id: 1 }), acr({ id: 2, programa: 'Medicina', facultad: null, orden: -5 })], NOW)
    const groups = groupAccreditationsByFaculty(rows)
    expect(groups).toHaveLength(2)
    expect(groups[1].key).toBe('sin-facultad')
    expect(groups[1].logoSrc).toBeUndefined()
    expect(groups[1].items[0].programa).toBe('Medicina')
  })
  it('oculta acreditaciones vencidas, inactivas o no verificadas; conserva vigencia futura o vacía', () => {
    const rows = mapAccreditations(
      [
        acr({ id: 1, vigenciaHasta: '2025-01-01T00:00:00.000Z' }),
        acr({ id: 2, active: false }),
        acr({ id: 3, verificado: false }),
        acr({ id: 4, vigenciaHasta: '2029-06-30T00:00:00.000Z' }),
        acr({ id: 5 }),
      ],
      NOW,
    )
    expect(rows.map((r) => r.id)).toEqual([4, 5])
    expect(rows[0].vigenciaAnio).toBe(2029)
    expect(rows[1].vigenciaAnio).toBeUndefined()
  })
  it('descarta logo inválido de facultad y fuente insegura; facultad no poblada (id) cuenta como sin facultad', () => {
    const rows = mapAccreditations(
      [
        acr({ id: 1, facultad: fac(1, 'X', { logoPath: '../../a.png' }), fuenteUrl: 'javascript:1' }),
        acr({ id: 2, facultad: 7 }),
      ],
      NOW,
    )
    expect(rows[0].facultad?.logoSrc).toBeUndefined()
    expect(rows[0].fuenteUrl).toBeUndefined()
    expect(rows[1].facultad).toBeUndefined()
  })
})
