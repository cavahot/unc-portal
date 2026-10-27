// PRA-02: render estático de la sección pública «Premios y acreditaciones».
// Amenazas: sección vacía visible, imágenes sin alt, enlaces externos sin rel, hotlink a hosts de terceros.
// Límite: render a HTML estático (sin jsdom): no prueba hover ni la animación de Reveal; eso se verificó
// en el navegador (capturas en el informe de la fase).
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AwardsAccreditationsSection, { type AwardsLabels } from '@/components/home/AwardsAccreditationsSection'
import type { Recognition } from '@/lib/cms/queries/recognitions'
import type { AccreditationGroup } from '@/lib/cms/queries/accreditations'

const labels: AwardsLabels = {
  sectionLabel: 'Reconocimientos',
  title: 'Premios y acreditaciones',
  description: 'Calidad respaldada.',
  awardedBy: 'Otorgado por {name}',
  officialSite: 'Sitio oficial',
  source: 'Fuente',
  externalHint: 'se abre en una pestaña nueva',
  editionsTitle: 'Ediciones en que fuimos distinguidos',
  distinction: {
    premio: 'Premio',
    premioCategoria: 'Premio por categoría',
    mencionEspecial: 'Mención especial',
    reconocimiento: 'Reconocimiento',
  },
  accreditationsTitle: 'Acreditaciones',
  accreditationsBody: 'Agencia Nacional de Evaluación y Acreditación de la Educación Superior',
  model: { modeloNacional: 'Modelo Nacional', arcuSur: 'ARCU-SUR' },
  organism: { aneaes: 'ANEAES', arcusur: 'ARCU-SUR', otro: 'Otro organismo' },
  validUntil: 'hasta {year}',
  otherPrograms: 'Otros programas acreditados',
  logoAlt: 'Logo de {name}',
}

const rec: Recognition = {
  id: 1,
  nombre: 'Premio Nacional a la Calidad',
  entidad: 'CONACYT',
  sitioOficial: 'https://www.conacyt.gov.py',
  logoSrc: '/images/reconocimientos/premio-calidad-conacyt.jpg',
  logoAlt: 'Logo del Premio Nacional a la Calidad',
  ediciones: [
    { anio: 2025, distincion: 'por-confirmar', categoria: 'Sector Público', fuenteUrl: 'https://www.conacyt.gov.py/a' },
    { anio: 2016, distincion: 'mencion-especial', categoria: 'Pública Grande', fuenteUrl: 'https://www.conacyt.gov.py/b' },
  ],
}
const groups: AccreditationGroup[] = [
  {
    key: 'f-1',
    nombre: 'Facultad de Ciencias Económicas y Administrativas',
    siglas: 'FCEA',
    logoSrc: '/images/facultades/economicas.png',
    items: [
      {
        id: 1,
        programa: 'Contaduría Pública',
        sede: 'Filial Horqueta',
        organism: 'aneaes',
        modelo: 'modelo-nacional',
        vigenciaAnio: 2029,
        fuenteUrl: 'https://www.aneaes.gov.py/d.pdf',
        orden: 0,
      },
    ],
  },
  { key: 'sin-facultad', nombre: '', items: [{ id: 2, programa: 'Medicina', organism: 'aneaes', orden: 0 }] },
]

const render = (recognitions: Recognition[], g: AccreditationGroup[]) =>
  renderToStaticMarkup(createElement(AwardsAccreditationsSection, { recognitions, groups: g, labels }))

describe('AwardsAccreditationsSection', () => {
  it('no renderiza nada sin datos (ni título)', () => {
    expect(render([], [])).toBe('')
  })

  it('con datos: sección etiquetada por su h2, ids estables y orden semántico', () => {
    const html = render([rec], groups)
    expect(html).toContain('id="premios"')
    expect(html).toContain('aria-labelledby="awards-title"')
    expect(html).toContain('<h2 id="awards-title"')
    expect(html).toContain('<ol')
    expect(html).toContain('<ul')
    expect(html.indexOf('2025')).toBeLessThan(html.indexOf('2016'))
  })

  it('solo premio o solo acreditaciones oculta el otro bloque', () => {
    const onlyAward = render([rec], [])
    expect(onlyAward).toContain('Premio Nacional a la Calidad')
    expect(onlyAward).not.toContain('>Acreditaciones<')
    const onlyAcr = render([], groups)
    expect(onlyAcr).toContain('Contaduría Pública')
    expect(onlyAcr).not.toContain('Ediciones en que fuimos distinguidos')
  })

  it('muestra la distinción solo cuando está confirmada (por-confirmar no se imprime)', () => {
    const html = render([rec], [])
    expect(html).toContain('Mención especial')
    expect(html).not.toMatch(/por[- ]confirmar/i)
  })

  it('cada img tiene alt no vacío y solo rutas locales /images/', () => {
    const html = render([rec], groups)
    const imgs = html.match(/<img[^>]*>/g) ?? []
    expect(imgs.length).toBeGreaterThanOrEqual(2)
    for (const tag of imgs) {
      expect(tag).toMatch(/alt="[^"]+"/)
    }
    expect(html).not.toMatch(/(src|srcSet|srcset)="https?:/)
  })

  it('enlaces externos con target _blank y rel noopener noreferrer, con aviso accesible', () => {
    const html = render([rec], groups)
    const anchors = html.match(/<a [^>]*href="https:[^>]*>/g) ?? []
    expect(anchors.length).toBeGreaterThanOrEqual(4)
    for (const a of anchors) {
      expect(a).toContain('target="_blank"')
      expect(a).toContain('rel="noopener noreferrer"')
    }
    expect(html).toContain('se abre en una pestaña nueva')
  })

  it('muestra siglas, organismo, modelo y vigencia; el grupo sin facultad usa el rótulo genérico', () => {
    const html = render([], groups)
    expect(html).toContain('FCEA')
    expect(html).toContain('Otros programas acreditados')
    expect(html).toContain('hasta 2029')
    expect(html).toContain('ANEAES')
    expect(html).toContain('Modelo Nacional')
  })

  it('respeta reducción de movimiento (clases motion-reduce en elementos animados)', () => {
    expect(render([rec], groups)).toContain('motion-reduce:')
  })
})
