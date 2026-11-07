// FAC-01 (refinamiento de diseño y uso): render estático de los componentes compartidos de la página de facultad.
// Amenazas que cubre: (1) un lector asume que los aranceles están vigentes cuando la página no lo dice;
// (2) enlaces de resolución sin nombre accesible completo; (3) tarjeta lateral vacía cuando falta logo y datos;
// (4) objetivos táctiles < 44 px; (5) tablas ilegibles por ancho excesivo. Límite: no mide pixeles; el aspecto real
// se verificó en el navegador (escritorio y móvil).
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ArancelesTable from '@/components/facultades/ArancelesTable'
import CarrerasList from '@/components/facultades/CarrerasList'
import FacultadHero from '@/components/facultades/FacultadHero'

const state = vi.hoisted(() => ({ result: {} as any }))
vi.mock('@/lib/cms/queries/facultad', () => ({ getFacultadDetalle: async () => state.result, FACULTAD_TAGS: [] }))
vi.mock('@/lib/i18n/server', () => ({ getT: async () => (key: string) => key }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))
vi.mock('next/image', () => ({ default: (p: any) => createElement('img', { src: p.src, alt: p.alt }) }))

const arancelLabels = {
  concept: 'Concepto',
  amount: 'Monto',
  currencyName: 'guaraníes',
  groupIndex: 'Grupos de aranceles',
  caption: (g: string) => `${g}: concepto y monto`,
  grupos: { multas: 'Multas', venta: 'Venta', servicios: 'Servicios', medicos: 'Médicos' },
}
const item = (id: number, grupo: 'multas' | 'venta', extra = {}) => ({ id, concepto: `Concepto ${id}`, monto: 20000 * id, grupo, orden: id, ...extra })

describe('ArancelesTable (refinamiento)', () => {
  const two = [
    { grupo: 'multas' as const, items: [item(1, 'multas')] },
    { grupo: 'venta' as const, items: [item(2, 'venta', { nota: 'Por unidad' }), item(3, 'venta')] },
  ]
  const html = renderToStaticMarkup(createElement(ArancelesTable, { groups: two, labels: arancelLabels }))

  it('con 2+ grupos ofrece un índice de salto con un enlace por grupo y anclas con id', () => {
    expect(html).toContain('aria-label="Grupos de aranceles"')
    expect(html).toContain('href="#aranceles-multas"')
    expect(html).toContain('href="#aranceles-venta"')
    expect(html).toContain('id="aranceles-multas"')
    expect(html).toContain('id="aranceles-venta"')
  })
  it('con un solo grupo no hay índice de salto (sería ruido)', () => {
    const one = renderToStaticMarkup(createElement(ArancelesTable, { groups: [two[1]], labels: arancelLabels }))
    expect(one).not.toContain('aria-label="Grupos de aranceles"')
  })
  it('la moneda es visible en el encabezado de monto, no solo en un title', () => {
    expect(html).toMatch(/Monto[^<]*\(guaraníes\)/)
  })
  it('una sola columna de lectura (sin tablas a medio ancho) y sin transition-all', () => {
    expect(html).not.toContain('lg:grid-cols-2')
    expect(html).not.toContain('lg:col-span-2')
    expect(html).toContain('max-w-3xl')
    expect(html).not.toContain('transition-all')
  })
  it('conserva la nota junto a la fila que explica y el monto exacto en <data>', () => {
    expect(html).toContain('Por unidad')
    expect(html).toContain('<data value="40000">')
  })
  it('las filas resaltan al pasar el puntero', () => {
    expect(html).toMatch(/<tr class="[^"]*hover:bg-/)
  })
})

describe('CarrerasList (refinamiento)', () => {
  const labels = {
    resLabel: 'Res. CONES',
    resOpen: (n: string) => `Resolución CONES ${n}`,
    sede: 'Sede',
    modalidad: 'Modalidad',
    titulo: 'Título',
    duracion: (n: number) => `${n} años`,
    perfil: 'Perfil',
  }
  const carrera = {
    id: 1,
    nombre: 'Licenciatura en Administración Agropecuaria con un nombre extraordinariamente largo',
    sede: 'Horqueta',
    duracion: 4,
    titulo: 'Licenciado/a',
    resoluciones: [
      { numero: '557/16', href: 'https://drive.google.com/file/d/abc/view' },
      { numero: '248/21', detalle: 'Rectificación', href: 'https://drive.google.com/file/d/def/view' },
      { numero: '1/20' },
    ],
  } as any
  const html = renderToStaticMarkup(createElement(CarrerasList, { items: [carrera], labels }))

  it('el nombre accesible del enlace incluye el detalle visible (p. ej. Rectificación)', () => {
    expect(html).toContain('aria-label="Resolución CONES 248/21, Rectificación"')
    expect(html).toContain('aria-label="Resolución CONES 557/16"')
  })
  it('la resolución sin enlace no se pinta como enlace', () => {
    expect(html.match(/<a /g)?.length).toBe(2)
  })
  it('la duración y el rótulo de resoluciones no se parten; el nombre largo se equilibra y envuelve', () => {
    expect(html).toMatch(/whitespace-nowrap[^>]*>4 años/)
    expect(html).toMatch(/whitespace-nowrap[^>]*>Res\. CONES/)
    expect(html).toMatch(/<h3 class="[^"]*text-balance[^"]*break-words|<h3 class="[^"]*break-words[^"]*text-balance/)
  })
  it('los rótulos de sede y título son visibles, no solo para lector de pantalla', () => {
    expect(html).not.toContain('class="sr-only">Sede')
    expect(html).toContain('Sede')
    expect(html).toContain('Título')
  })
  it('usa una escala tipográfica unificada y contenida para grado y posgrado', () => {
    expect(html).toContain('text-xl sm:text-[1.4rem]')
    expect(html).not.toContain('text-2xl sm:text-[1.85rem]')
  })
})

describe('FacultadHero (refinamiento)', () => {
  const base = {
    nombre: 'Facultad de Prueba',
    logoAlt: 'Logo',
    breadcrumb: { inicio: 'Inicio', inicioHref: '/', facultades: 'Facultades', facultadesHref: '/facultades' },
    ficha: { label: 'Datos de la facultad', rows: [] as Array<{ term: string; value: string }> },
  }
  it('sin logo ni datos no pinta una tarjeta lateral vacía', () => {
    const html = renderToStaticMarkup(createElement(FacultadHero, base))
    expect(html).not.toContain('<aside')
    expect(html).toContain('<h1')
  })
  it('con datos pinta la tarjeta con su rótulo accesible aunque falte el logo', () => {
    const html = renderToStaticMarkup(createElement(FacultadHero, { ...base, ficha: { label: 'Datos', rows: [{ term: 'Decano', value: 'Nombre Largo' }] } }))
    expect(html).toContain('<aside aria-label="Datos"')
  })
  it('los enlaces de migas de pan tienen objetivo táctil de 44 px', () => {
    const html = renderToStaticMarkup(createElement(FacultadHero, base))
    expect(html.match(/<a [^>]*min-h-11/g)?.length).toBe(2)
  })
})

describe('FacultadView (refinamiento)', () => {
  it('declara el límite de los aranceles: la página no indica su vigencia', async () => {
    state.result = {
      status: 'ok',
      facultad: { nombre: 'F', historia: [], emails: [], redes: [] },
      carreras: { status: 'ok', grado: [], posgrado: [] },
      decano: null,
      acreditaciones: [],
      aranceles: [{ grupo: 'multas', items: [item(1, 'multas')] }],
    }
    const { default: FacultadView } = await import('@/components/facultades/FacultadView')
    const html = renderToStaticMarkup(await FacultadView({ slug: 'f', locale: 'es' }))
    expect(html).toContain('aranceles.limite')
    expect(html).toMatch(/<h2 id="aranceles-title" class="[^"]*text-balance/)
  })
})
