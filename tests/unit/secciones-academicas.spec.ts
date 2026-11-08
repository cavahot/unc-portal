// REDISEÑO secciones académicas: la plantilla AcademicSectionPage y sus tres páginas con contenido fijo (aseguramiento de la
// calidad, bienestar institucional, dirección general académica) por idioma.
// Amenazas: (1) textos en español visibles en /en, /pt-BR y /gn porque la plantilla traía literales; (2) un enlace a /contacto
// sin el prefijo del idioma; (3) una miga «Academia» con href «#» que parece un enlace y no lleva a ningún lado;
// (4) catálogos incompletos o con voseo; (5) un namespace no registrado en el cargador (la página mostraría la clave).
// Límite: render estático con next-intl simulado; el aspecto visual se verifica en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ locale: 'es' }))
vi.mock('next-intl/server', () => ({ getLocale: async () => state.locale }))
vi.mock('@/lib/i18n/server', () => ({
  getT: async (_l: string, ns: string) => (key: string) => `${ns}:${key}`,
}))
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never) }))
vi.mock('@/components/motion/Reveal', () => ({ default: ({ children }: { children?: unknown }) => createElement('div', null, children as never) }))

import AcademicSectionPage from '../../components/pages/AcademicSectionPage'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const render = async (locale: string, props: Record<string, unknown> = {}) => {
  state.locale = locale
  return renderToStaticMarkup(await AcademicSectionPage({ title: 'T', description: 'D', ...props } as never))
}

describe('plantilla AcademicSectionPage', () => {
  it('no trae textos en español escritos en el código', () => {
    const code = strip(read('components/pages/AcademicSectionPage.tsx'))
    expect(code).not.toMatch(/Contenido en preparación|Más información|Área académica|En desarrollo|Áreas de trabajo|¿Consultas sobre|>Contacto</)
  })

  it('los textos salen del catálogo y el enlace de contacto lleva el prefijo del idioma', async () => {
    const html = await render('en')
    expect(html).toContain('pages.seccion-academica:moreInfo')
    expect(html).toContain('href="/en/contacto"')
    expect(html).not.toContain('href="/contacto"')
    expect((await render('es'))).toContain('href="/contacto"')
  })

  it('la miga «#» no es un enlace y la miga de inicio lleva el idioma', async () => {
    const html = await render('pt-BR', { breadcrumb: [{ label: 'Academia', href: '#' }] })
    expect(html).not.toContain('href="#"')
    expect(html).toContain('Academia')
    expect(html).toContain('href="/pt-BR"')
  })

  it('sin áreas muestra el aviso «en preparación» del catálogo', async () => {
    const html = await render('gn')
    expect(html).toContain('pages.seccion-academica:emptyTitle')
  })
})

describe('páginas con contenido fijo', () => {
  const pages = ['aseguramiento-calidad', 'bienestar-institucional', 'direccion-general-academica']
  it.each(pages)('%s: sin literales de contenido y con su catálogo', (slug) => {
    const code = strip(read(`app/[locale]/${slug}/page.tsx`))
    expect(code).not.toMatch(/Autoevaluación institucional|Salud mental|Necesitás|La UNC cuida|articula los procesos/)
    expect(code).toContain(`pages.${slug}`)
  })

  it('los namespaces están registrados en el cargador de mensajes', () => {
    const server = read('lib/i18n/server.ts')
    for (const ns of ['pages.seccion-academica', 'pages.aseguramiento-calidad', 'pages.bienestar-institucional', 'pages.direccion-general-academica']) {
      expect(server).toContain(`'${ns}'`)
    }
  })
})

describe('catálogos', () => {
  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string, ns: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.${ns}.json`)) as Json))
  const namespaces = ['seccion-academica', 'aseguramiento-calidad', 'bienestar-institucional', 'direccion-general-academica']

  it.each(namespaces)('%s: gn, en y pt-BR tienen las mismas claves que es', (ns) => {
    const es = load('es', ns)
    for (const loc of ['gn', 'en', 'pt-BR']) expect(Object.keys(load(loc, ns)).sort()).toEqual(Object.keys(es).sort())
  })

  it('es no usa voseo y en/pt-BR traducen las claves propias', () => {
    for (const ns of namespaces) expect(Object.values(load('es', ns)).join(' ')).not.toMatch(/\b(Necesitás|Consultá|podés|querés|Mirá)\b/)
    for (const loc of ['en', 'pt-BR']) expect(load(loc, 'bienestar-institucional')['hero.title']).not.toBe(load('es', 'bienestar-institucional')['hero.title'])
  })
})
