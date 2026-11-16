// REDISEÑO /preguntas-frecuentes: sistema visual del portal, textos por idioma y estados ok/empty/unavailable.
// Amenazas: (1) una caída del CMS mostrada como «sin preguntas» o preguntas de demostración en producción; (2) el estilo
// antiguo (cabecera #09231D con verde neón) y el voseo; (3) /en y /pt-BR con textos en español porque la página y el
// acordeón traían literales; (4) un enlace a /contacto sin el prefijo del idioma; (5) filtrar el mensaje de un error.
// Límite: render estático con el CMS simulado; el aspecto visual y el foco se verifican en el navegador. Las preguntas y
// respuestas vienen del CMS y hoy solo existen en español.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getFAQsResult = vi.hoisted(() => vi.fn())
const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))
vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never) }))
vi.mock('@/lib/cms/queries/faqs', async (orig) => ({ ...(await orig<typeof import('../../lib/cms/queries/faqs')>()), getFAQsResult }))

import FaqPage from '../../app/[locale]/preguntas-frecuentes/page'
import FaqError from '../../app/[locale]/preguntas-frecuentes/error'

// La consulta real (el módulo está simulado arriba para la página): se importa la implementación original.
const realGetFAQsResult = async () => (await vi.importActual<typeof import('../../lib/cms/queries/faqs')>('../../lib/cms/queries/faqs')).getFAQsResult()

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const render = async (locale = 'es') => renderToStaticMarkup(await FaqPage({ params: Promise.resolve({ locale }) }))

const lexical = (text: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ text }] }] } })
const items = [
  { id: 1, question: '¿Cuál es el horario?', answer: lexical('De lunes a viernes.'), category: 'horarios', order: 1 },
  { id: 2, question: '¿Cómo me inscribo?', answer: lexical('En Secretaría.'), category: 'admision', order: 1 },
]

describe('/preguntas-frecuentes', () => {
  beforeEach(() => getFAQsResult.mockResolvedValue({ status: 'ok', data: items }))

  it('un solo h1, cabecera verde del portal, fondo claro y sin el estilo antiguo', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).toContain('bg-[#F4F7F5]')
    expect(html).not.toMatch(/bg-\[#09231D\] px-4 pb-20|uppercase tracking-widest text-\[#37D448\]/)
  })

  it('muestra las preguntas del CMS y los textos salen del catálogo', async () => {
    const html = await render()
    expect(html).toContain('¿Cuál es el horario?')
    expect(html).toContain('hero.title')
    expect(html).toContain('search.placeholder')
  })

  it('el enlace de contacto lleva el prefijo del idioma', async () => {
    expect(await render('en')).toContain('href="/en/contacto"')
    expect(await render('es')).toContain('href="/contacto"')
  })

  it('con el CMS caído avisa «no disponible» con reintentar y no muestra preguntas', async () => {
    getFAQsResult.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).not.toContain('¿Cuál es el horario?')
  })

  it('sin preguntas muestra «vacío» sin reintentar', async () => {
    getFAQsResult.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
  })

  it('el código de la página y del acordeón no trae textos en español escritos', () => {
    const code = strip(read('app/[locale]/preguntas-frecuentes/page.tsx')) + strip(read('components/faq/FAQAccordion.tsx'))
    expect(code).not.toMatch(/ayudarte|Ayuda institucional|Buscá|Contactá|encontraste|Probá|Ver todas las preguntas|Buscar una pregunta|Ir a Contacto/)
  })
})

describe('getFAQsResult', () => {
  beforeEach(() => {
    cmsFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('ok con preguntas, empty sin ellas, unavailable en una caída (sin datos de demostración ni filtrar el error)', async () => {
    cmsFetch.mockResolvedValue({ docs: items })
    expect(await realGetFAQsResult()).toEqual({ status: 'ok', data: items })
    cmsFetch.mockResolvedValue({ docs: [] })
    expect(await realGetFAQsResult()).toEqual({ status: 'empty' })
    cmsFetch.mockRejectedValue(new Error('http://cms.interno SECRETO'))
    expect(await realGetFAQsResult()).toEqual({ status: 'unavailable' })
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(' ')
    expect(logged).not.toContain('SECRETO')
  })
})

describe('error, esqueleto y catálogos', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref015' })
    const html = renderToStaticMarkup(createElement(FaqError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.preguntas-frecuentes.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo, en/pt-BR traducen, y el cargador registra el namespace', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Buscá|Contactá|encontraste|Probá|explorá|Encontrá)\b/)
    for (const loc of ['en', 'pt-BR']) expect(load(loc)['hero.title']).not.toBe(es['hero.title'])
    expect(read('lib/i18n/server.ts')).toContain("'pages.preguntas-frecuentes'")
  })
})
