// CNV-01: modelo puro de /convenios (spec docs/specs/portal/CONVENIOS.md §2 y escenarios 1–5, 8).
// Amenazas: (1) enlaces javascript:/http:/hosts ajenos publicados con la marca UNC; (2) filas basura que rompen la
// página; (3) búsqueda que no encuentra por tildes o mayúsculas. Límite: funciones puras, sin red ni React.
import { describe, expect, it } from 'vitest'
import {
  ALLOWED_CONVENIO_HOSTS,
  countByCategoria,
  displayLabel,
  filterConvenioGroups,
  groupByYear,
  isAllowedConvenioUrl,
  linkKind,
  mapConvenios,
  yearSpan,
} from '@/lib/cms/convenios'
import { CONVENIOS_INTERNACIONALES, CONVENIOS_NACIONALES, toCmsPayloadConvenio } from '../../scripts/lib/conveniosSeedData.mjs'

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  year: 2023,
  type: 'nacional',
  title: 'Convenio de Cooperación.',
  parties: 'Universidad Nacional de Concepción y el Ministerio de Salud Pública y Bienestar Social',
  objective: 'Regular la relación interinstitucional',
  signedMonth: '08 de Febrero.',
  duration: '3 Años.',
  driveUrl: 'https://drive.google.com/file/d/abcdefghijklmnopqrstuvwxyz/view',
  categoria: 'institucional',
  orden: 1,
  ...over,
})

describe('CNV-01: enlaces', () => {
  it('allowlist exacta de 4 hosts', () => {
    expect([...ALLOWED_CONVENIO_HOSTS].sort()).toEqual(['docs.google.com', 'drive.google.com', 'unc.edu.py', 'www.unc.edu.py'])
  })
  it.each([
    'javascript:alert(1)',
    'http://drive.google.com/file/d/x/view',
    'https://drive.google.com.evil.example/x',
    'https://softcon.wnpower.host/x',
    'https://u:p@drive.google.com/x',
    ' https://drive.google.com/x',
    '',
    null,
  ])('rechaza %s', (url) => {
    expect(isAllowedConvenioUrl(url)).toBe(false)
  })
  it('acepta https a hosts permitidos y clasifica el tipo de enlace', () => {
    expect(isAllowedConvenioUrl('https://drive.google.com/file/d/x/view')).toBe(true)
    expect(linkKind('https://docs.google.com/x')).toBe('drive')
    expect(linkKind('https://www.unc.edu.py/wp-content/x.pdf')).toBe('web')
    expect(linkKind('https://evil.example/x')).toBeNull()
  })
})

describe('CNV-01: mapConvenios', () => {
  it('mapea una fila completa y omite el enlace no permitido sin descartar la fila', () => {
    const [a, b] = mapConvenios([row(), row({ id: 2, driveUrl: 'https://softcon.wnpower.host/x' })])
    expect(a).toMatchObject({ id: 1, year: 2023, href: 'https://drive.google.com/file/d/abcdefghijklmnopqrstuvwxyz/view', linkKind: 'drive', categoria: 'institucional', orden: 1 })
    expect(b.href).toBeNull()
    expect(b.linkKind).toBeNull()
  })
  it('descarta filas sin año, título, participantes o id y nunca lanza con basura', () => {
    expect(mapConvenios([row({ title: '  ' }), row({ year: 'x' }), row({ id: undefined }), row({ parties: null }), null, 7])).toEqual([])
    expect(mapConvenios([row({ objective: null })])[0].objective).toBeNull()
    expect(mapConvenios('nope')).toEqual([])
  })
  it('valores ausentes o desconocidos usan los valores por defecto', () => {
    const [c] = mapConvenios([row({ categoria: 'otra', orden: null, signedMonth: '', duration: null, nota: '  ' })])
    expect(c.categoria).toBe('institucional')
    expect(c.orden).toBe(99)
    expect(c.signedMonth).toBeNull()
    expect(c.duration).toBeNull()
    expect(c.nota).toBeNull()
  })
  it('colapsa espacios repetidos pero conserva el texto (erratas incluidas)', () => {
    const [c] = mapConvenios([row({ title: 'Covenio   de  Colaboración' })])
    expect(c.title).toBe('Covenio de Colaboración')
  })
})

describe('CNV-01: displayLabel', () => {
  it('quita un único punto final al mostrar, sin tocar el dato', () => {
    expect(displayLabel('Convenio de Cooperación.')).toBe('Convenio de Cooperación')
    expect(displayLabel('S.A.')).toBe('S.A')
    expect(displayLabel('Hasta tanto culmine la obra')).toBe('Hasta tanto culmine la obra')
    expect(displayLabel('Etc...')).toBe('Etc...')
  })
})

describe('CNV-01: agrupación y conteos', () => {
  const items = mapConvenios([
    row({ id: 1, year: 2014, orden: 2, title: 'B' }),
    row({ id: 2, year: 2024, orden: 1 }),
    row({ id: 3, year: 2014, orden: 1, title: 'Z' }),
    row({ id: 4, year: 2014, orden: 2, title: 'A', categoria: 'beneficios' }),
  ])
  it('años descendentes; dentro, orden y luego denominación', () => {
    const g = groupByYear(items)
    expect(g.map((x) => x.year)).toEqual([2024, 2014])
    expect(g[1].items.map((i) => i.id)).toEqual([3, 4, 1])
  })
  it('conteos por categoría y período', () => {
    expect(countByCategoria(items)).toEqual({ institucional: 3, beneficios: 1 })
    expect(yearSpan(items)).toEqual({ from: 2014, to: 2024 })
    expect(yearSpan([])).toBeNull()
  })
})

describe('CNV-01: filtros sobre el dataset real (escenarios 2–5)', () => {
  const items = mapConvenios(CONVENIOS_NACIONALES.map((r, i) => ({ id: i + 1, ...toCmsPayloadConvenio(r) })))
  const groups = groupByYear(items)
  const f = (o: { query?: string; categoria?: 'institucional' | 'beneficios' | null; year?: number | null }) => filterConvenioGroups(groups, o)

  it('sin filtros: 104 en 18 años, de 2024 a 2005', () => {
    const r = f({})
    expect(r.matched).toBe(104)
    expect(r.total).toBe(104)
    expect(r.groups).toHaveLength(18)
    expect(r.groups[0].year).toBe(2024)
    expect(r.groups.at(-1)?.year).toBe(2005)
  })
  it.each([
    ['becas', 3],
    ['BECAS', 3],
    ['MSPyBS', 2],
    ['salud publica', 8],
    ['odontología', 6],
    ['2014', 10],
    ['zzzz', 0],
  ])('búsqueda «%s» -> %i', (query, n) => {
    expect(f({ query }).matched).toBe(n)
  })
  it('internacionales: 45 en 15 años (la UFGD 2009 viene de la tabla nacional), ordenadas por año aunque el sitio no lo esté; la fila sin finalidad se conserva', () => {
    const intl = mapConvenios(CONVENIOS_INTERNACIONALES.map((r, i) => ({ id: 1000 + i, ...toCmsPayloadConvenio(r) })))
    const g = groupByYear(intl)
    expect(intl).toHaveLength(45)
    expect(g.map((x) => x.year)).toEqual([2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2011, 2010, 2009])
    expect(g.find((x) => x.year === 2014)?.items[0].title).toBe('Convenio de Cooperación y Movilidad Internacional.')
    expect(intl.filter((c) => c.objective === null)).toHaveLength(1)
    // Deusto 2014 (Erasmus Mundus) y Burgos 2017 y 2018 (Erasmus + KA 107).
    expect(filterConvenioGroups(g, { query: 'erasmus' }).matched).toBe(3)
  })

  it('categoría beneficios -> 28; año 2014 -> 10; combinados con búsqueda', () => {
    expect(f({ categoria: 'beneficios' }).matched).toBe(28)
    expect(f({ categoria: 'institucional' }).matched).toBe(76)
    expect(f({ year: 2014 }).matched).toBe(10)
    expect(f({ year: 2023, categoria: 'beneficios', query: 'descuentos' }).matched).toBe(21)
  })
})
