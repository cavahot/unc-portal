// INST-10: /buscar en el sistema visual del portal, con estados por fuente (noticias y tesis).
// Amenazas: (1) una caída del CMS mostrada como «sin resultados» o una búsqueda que cae a 500; (2) el estilo oscuro anterior;
// (3) un término enorme que llegue tal cual al CMS; (4) el formulario perdiendo el prefijo del idioma al buscar; (5) una fuente
// caída que oculte los resultados de la otra; (6) claves de mensajes faltantes o voseo («Intentá»); (7) filtrar el mensaje de
// un error al visitante.
// Límite: render estático en entorno node con el CMS simulado; el aspecto visual y el foco se verifican en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
  getF: async () => ({ dateTime: () => '24 de julio de 2026' }),
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('next/image', () => ({ default: (p: { src: string; alt: string }) => createElement('img', { src: p.src, alt: p.alt }) }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const getNews = vi.hoisted(() => vi.fn())
const getNewsByQuery = vi.hoisted(() => vi.fn())
const getTesisCatalogo = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/news', () => ({ getNews, getNewsByQuery }))
vi.mock('@/lib/cms/queries/tesisCatalogo', () => ({ getTesisCatalogo }))

import BuscarPage from '../../app/[locale]/buscar/page'
import BuscarError from '../../app/[locale]/buscar/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const render = async (locale = 'es', q?: string | string[]) =>
  renderToStaticMarkup(await BuscarPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ q }) }))

const noticia = (id: number, title: string) => ({ id, slug: `n-${id}`, title, summary: 'Resumen.', category: 'eventos', publishedAt: '2026-07-24T12:00:00.000Z', featuredImage: null })
const news = (...titles: string[]) => ({ docs: titles.map((t, i) => noticia(i + 1, t)), totalDocs: titles.length })
const tesis = { status: 'ok', docs: [{ id: 1, titulo: 'Una tesis', autor: 'Ana Pérez', anio: 2024, urlPdf: 'https://repo.example.org/t.pdf' }], total: 1 }

describe('INST-10 /buscar', () => {
  beforeEach(() => {
    getNews.mockReset().mockResolvedValue(news('Última noticia', 'Otra noticia'))
    getNewsByQuery.mockReset().mockResolvedValue(news('Noticia sobre becas'))
    getTesisCatalogo.mockReset().mockResolvedValue(tesis)
  })

  it('un solo h1, cabecera compartida, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10|portalLabel/)
  })

  it('sin término lista las noticias más recientes y no consulta las tesis', async () => {
    const html = await render()
    expect(html).toContain('Última noticia')
    expect(html).toContain('results.latest')
    expect(getNews).toHaveBeenCalledTimes(1)
    expect(getNewsByQuery).not.toHaveBeenCalled()
    expect(getTesisCatalogo).not.toHaveBeenCalled()
  })

  it('con término muestra noticias y tesis con su cantidad, y el formulario conserva el idioma y el término', async () => {
    const html = await render('pt-BR', 'becas')
    expect(html).toContain('Noticia sobre becas')
    expect(html).toContain('Una tesis')
    expect(html).toContain('sections.news')
    expect(html).toContain('sections.tesis')
    expect(html).toContain('action="/pt-BR/buscar"')
    expect(html).toContain('value="becas"')
    expect(getNewsByQuery).toHaveBeenCalledWith('becas', expect.anything())
    expect(getTesisCatalogo).toHaveBeenCalledWith(expect.objectContaining({ q: 'becas' }))
  })

  it('normaliza el término: lo recorta, junta espacios y lo limita a 100 caracteres antes de pedirlo al CMS', async () => {
    await render('es', '  hola    mundo  ')
    expect(getNewsByQuery).toHaveBeenCalledWith('hola mundo', expect.anything())
    await render('es', 'x'.repeat(500))
    expect(getNewsByQuery.mock.calls[1][0]).toHaveLength(100)
    await render('es', ['uno', 'dos'])
    expect(getNewsByQuery.mock.calls[2][0]).toBe('uno')
  })

  it('con las dos fuentes caídas muestra «no disponible» con reintentar que conserva el término, y no «sin resultados»', async () => {
    getNewsByQuery.mockRejectedValue(new Error('http://cms.interno SECRETO'))
    getTesisCatalogo.mockResolvedValue({ status: 'unavailable' })
    const html = await render('pt-BR', 'becas')
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('href="/pt-BR/buscar?q=becas"')
    expect(html).not.toContain('states.noResults')
    expect(html).not.toContain('SECRETO')
  })

  it('si una fuente cae, los resultados de la otra se muestran con un aviso en línea', async () => {
    getNewsByQuery.mockRejectedValue(new Error('x'))
    let html = await render('es', 'becas')
    expect(html).toContain('Una tesis')
    expect(html).toContain('states.newsUnavailable')
    getNewsByQuery.mockResolvedValue(news('Noticia sobre becas'))
    getTesisCatalogo.mockResolvedValue({ status: 'unavailable' })
    html = await render('es', 'becas')
    expect(html).toContain('Noticia sobre becas')
    expect(html).toContain('states.tesisUnavailable')
  })

  it('sin resultados en ninguna fuente muestra «sin resultados» con salidas a noticias y biblioteca, sin reintentar', async () => {
    getNewsByQuery.mockResolvedValue({ docs: [], totalDocs: 0 })
    getTesisCatalogo.mockResolvedValue({ status: 'empty' })
    const html = await render('pt-BR', 'zzz')
    expect(html).toContain('states.noResults::query=zzz')
    expect(html).toContain('href="/pt-BR/noticias"')
    expect(html).toContain('href="/pt-BR/biblioteca"')
    expect(html).not.toContain('states.retry')
  })

  it('sin término y sin noticias muestra «vacío»; sin término y con el CMS caído muestra «no disponible»', async () => {
    getNews.mockResolvedValue({ docs: [], totalDocs: 0 })
    expect(await render()).toContain('states.empty')
    getNews.mockRejectedValue(new Error('x'))
    const html = await render('es')
    expect(html).toContain('states.unavailable')
    expect(html).toContain('href="/buscar"')
  })

  it('el código de la página no trae textos escritos ni imágenes de relleno', () => {
    const code = strip(read('app/[locale]/buscar/page.tsx'))
    expect(code).not.toMatch(/Buscar noticias|Resultados para|Explorar noticias|Intentá|Portal UNC|Ver todas las noticias/)
  })
})

describe('INST-10 error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref013' })
    const html = renderToStaticMarkup(createElement(BuscarError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga existe y no es oscuro', () => {
    expect(read('app/[locale]/buscar/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.buscar.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Intentá|Buscá|Verificá|Consultá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['heading', 'states.unavailable', 'states.noResultsHint', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>(['pageTitleDefault', 'pageDescription'])
    for (const m of strip(read('app/[locale]/buscar/page.tsx')).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
