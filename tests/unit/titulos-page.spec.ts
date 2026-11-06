// TITULOS-01 (T4): página /titulos — render por estado, accesibilidad básica y ausencia de datos fijos
// (spec docs/specs/portal/TITULOS.md §2.2, §2.5 y §3; tarea odd/tasks/titulos-cms.md, S1, S3, S4 y S9).
// Amenazas: (1) contenido institucional escrito en el código (se desactualiza sin que nadie pueda corregirlo);
// (2) un estado de error mudo o que solo se resuelva con una ventana modal (patrón SweetAlert2): debe verse en línea,
// accesible y con una salida; (3) un `acento` o un enlace del CMS llevados sin filtrar al HTML; (4) un monto de
// arancel inventado cuando falta la fila enlazada.
// Límite: render estático en entorno node (sin navegador): el aspecto visual, el foco y el móvil se verifican aparte.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Traductor simulado: devuelve la clave (y los valores) para comprobar QUÉ texto se pide, sin depender del idioma.
vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
const getTitulosInscripcion = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/titulos', () => ({ getTitulosInscripcion }))

import TitulosPage, { generateMetadata } from '../../app/[locale]/titulos/page'
import type { TitulosInscripcionData } from '../../lib/cms/titulos'

const DATA: TitulosInscripcionData = {
  titulo: 'Título desde el CMS',
  descripcion: 'Descripción desde el CMS.',
  unidad: 'Unidad desde el CMS',
  plazo: { min: 8, max: 24 },
  arancel: { concepto: 'Inscripción de Títulos Universitarios', monto: 200000 },
  notaCones: { texto: 'Nota del CONES desde el CMS.', url: 'https://www.cones.gov.py/' },
  tipos: [
    { slug: 'extranjera', etiqueta: 'Etiqueta A', titulo: 'Tipo A', subtitulo: 'Subtítulo A', acento: 'verde', requisitos: ['Requisito A1', 'Requisito A2'] },
    { slug: 'publica', etiqueta: 'Etiqueta B', titulo: 'Tipo B', subtitulo: null, acento: 'azul', requisitos: ['Requisito B1'] },
  ],
  pasos: [
    { numero: 1, responsable: 'Responsable uno', descripcion: 'Descripción del paso uno.' },
    { numero: 2, responsable: 'Responsable dos', descripcion: 'Descripción del paso dos.' },
  ],
  updatedAt: '2026-11-05T10:00:00.000Z',
}

async function render(locale = 'es') {
  return renderToStaticMarkup(await TitulosPage({ params: Promise.resolve({ locale }) }))
}
const idx = (html: string, needle: string) => html.indexOf(needle)

describe('TITULOS-01 página: estado ok', () => {
  let html = ''
  beforeEach(async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'ok', data: DATA })
    html = await render()
  })

  it('el título y la descripción vienen del CMS y hay un solo h1', () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>Título desde el CMS<\/h1>/)
    expect(html).toContain('Descripción desde el CMS.')
    expect(html).toContain('Unidad desde el CMS')
  })

  it('plazo y arancel se muestran como datos del trámite; el monto sale del CMS con formato de guaraníes', () => {
    expect(html).toContain('facts.plazoValue::min=8;max=24')
    expect(html).toMatch(/Gs\.\s200\.000/)
    expect(html).not.toContain('facts.arancelPending')
  })

  it('cada tipo tiene ancla, su lista de requisitos y un índice de salto con su cantidad', () => {
    for (const slug of ['extranjera', 'publica']) {
      expect(html).toContain(`id="tipo-${slug}"`)
      expect(html).toContain(`href="#tipo-${slug}"`)
    }
    expect(html).toContain('index.countOther::count=2')
    expect(html).toContain('index.countOne')
    expect(html).toContain('<li')
    for (const r of ['Requisito A1', 'Requisito A2', 'Requisito B1']) expect(html).toContain(r)
    expect(idx(html, 'Tipo A')).toBeLessThan(idx(html, 'Tipo B')) // orden del panel
  })

  it('el acento sale de una lista cerrada (clase propia), no de un estilo del CMS', () => {
    expect(html).toMatch(/data-acento="verde"/)
    expect(html).toMatch(/data-acento="azul"/)
    expect(html).not.toMatch(/style="[^"]*background/)
  })

  it('los pasos van en una lista ordenada, en el orden del CMS', () => {
    // El breadcrumb también es un <ol>: se busca la lista dentro de la sección del procedimiento.
    expect(html.slice(idx(html, 'id="titulos-procedimiento"'))).toMatch(/<ol[ >]/)
    expect(idx(html, 'Descripción del paso uno.')).toBeLessThan(idx(html, 'Descripción del paso dos.'))
    expect(html).toContain('procedure.step::number=1')
    expect(html).toContain('procedure.total::min=8;max=24')
  })

  it('la nota del CONES enlaza al host del CMS en una pestaña nueva y segura', () => {
    expect(html).toContain('Nota del CONES desde el CMS.')
    expect(html).toMatch(/<a[^>]*href="https:\/\/www\.cones\.gov\.py\/"[^>]*rel="noopener noreferrer"/)
    expect(html).toMatch(/<a[^>]*href="https:\/\/www\.cones\.gov\.py\/"[^>]*target="_blank"/)
  })

  it('sin URL del CONES se muestra el texto sin enlace', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'ok', data: { ...DATA, notaCones: { texto: 'Solo texto.', url: null } } })
    const out = await render()
    expect(out).toContain('Solo texto.')
    expect(out).not.toContain('cones.gov.py')
  })

  it('sin la fila de arancel NO inventa un monto: avisa y enlaza a los aranceles del Rectorado', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'ok', data: { ...DATA, arancel: null } })
    const out = await render()
    expect(out).toContain('facts.arancelPending')
    expect(out).toContain('href="/aranceles-rectorado"')
    expect(out).not.toMatch(/Gs\./)
  })

  it('sin plazo (incoherente en el CMS) omite el dato sin ocultar el resto', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'ok', data: { ...DATA, plazo: null } })
    const out = await render()
    expect(out).not.toContain('facts.plazoValue')
    expect(out).toContain('Tipo A')
  })

  it('los enlaces internos respetan el prefijo del idioma', async () => {
    const en = await render('en')
    expect(en).toContain('href="/en/legalizaciones"')
    expect(en).toContain('href="/en/contacto"')
    expect(html).toContain('href="/legalizaciones"')
  })

  it('no usa ventanas modales ni diálogos para nada de la página', () => {
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|<dialog|aria-modal/)
  })
})

describe('TITULOS-01 página: estados vacío y no disponible (errores capturados en el diseño)', () => {
  it('empty: aviso en línea con salida (contacto), título genérico y sin contenido de demostración', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toMatch(/<h1[^>]*>hero\.titulo<\/h1>/)
    expect(html).toMatch(/role="status"[^>]*>[\s\S]*states\.empty/)
    expect(html).toContain('href="/contacto"')
    expect(html).not.toMatch(/id="tipo-|id="titulos-procedimiento"/)
  })

  it('unavailable: aviso en línea accesible con reintento y contacto; la página no lanza', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toMatch(/role="status"[^>]*>[\s\S]*states\.unavailable/)
    expect(html).toContain('states.retry')
    expect(html).toMatch(/<a[^>]*href="\/titulos"/) // reintento: vuelve a pedir la misma página
    expect(html).toContain('href="/contacto"')
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|<dialog|aria-modal/)
  })

  it('en un idioma con prefijo, el reintento conserva el idioma', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'unavailable' })
    expect(await render('pt-BR')).toMatch(/<a[^>]*href="\/pt-BR\/titulos"/)
  })
})

describe('TITULOS-01 metadatos', () => {
  it('con contenido: título y descripción del CMS', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'ok', data: DATA })
    expect(await generateMetadata({ params: Promise.resolve({ locale: 'es' }) })).toMatchObject({
      title: expect.stringContaining('Título desde el CMS'),
      description: 'Descripción desde el CMS.',
    })
  })

  it('sin contenido: textos de la interfaz, sin lanzar', async () => {
    getTitulosInscripcion.mockResolvedValue({ status: 'unavailable' })
    expect(await generateMetadata({ params: Promise.resolve({ locale: 'es' }) })).toMatchObject({ title: 'meta.title', description: 'meta.description' })
  })
})

describe('TITULOS-01 sin datos fijos en el código de la página', () => {
  const root = process.cwd()
  const files = [
    'app/[locale]/titulos/page.tsx',
    ...readdirSync(resolve(root, 'components/titulos')).map((f) => `components/titulos/${f}`),
  ]
  it.each(files)('%s no contiene el contenido que ahora vive en el CMS ni redacción con voseo', (rel) => {
    const src = readFileSync(resolve(root, rel), 'utf8')
    expect(src).not.toMatch(/UNIVERSITY_TYPES|const STEPS/)
    expect(src).not.toMatch(/200\.?000/)
    expect(src).not.toMatch(/Mesa de Entrada|Perceptor[ií]a|Secretar[ií]a General/)
    expect(src).not.toMatch(/cones\.gov\.py/)
    expect(src).not.toMatch(/\b(Identificá|Consultá|Mirá|Necesitás)\b/)
    expect(src).not.toMatch(/slate-950/) // el fondo oscuro de la página anterior no es del sistema del portal
  })
})
