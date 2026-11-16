// INST-03: /noticias (listado) y /noticias/[slug] (detalle) en el sistema visual del portal.
// Amenazas: (1) una caída del CMS mostrada como «no hay noticias» (parece una redacción sin novedades); (2) una
// página fuera de rango mostrada como lista vacía; (3) enlaces `href="#"` en la paginación y textos fijos sin
// traducir; (4) el estilo oscuro anterior en el listado, el detalle o el texto enriquecido; (5) un titular o una URL
// de imagen del CMS que rompa la estructura (titular largo, imagen ausente); (6) claves faltantes en alguna lengua o
// voseo; (7) filtrar el mensaje de un error al visitante.
// Límite: render estático en entorno node; el aspecto visual, el foco y el carrusel se verifican en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
  getF: async () => ({ dateTime: (d: Date) => `FECHA-${d.getUTCFullYear()}` }),
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error('NOT_FOUND') }))
vi.mock('next/navigation', () => ({ notFound }))
const draftMode = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({ draftMode, cookies: async () => ({ get: () => undefined }) }))
const getNews = vi.hoisted(() => vi.fn())
const getNewsBySlug = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/news', () => ({ getNews, getNewsBySlug, getNewsBySlugDraft: vi.fn(), getNewsSlugs: vi.fn() }))
vi.mock('@/components/news/NewsGallery', () => ({ default: () => createElement('div', { 'data-galeria': '1' }) }))

import NoticiasPage from '../../app/[locale]/noticias/page'
import NoticiaPage from '../../app/[locale]/noticias/[slug]/page'
import NoticiasError from '../../app/[locale]/noticias/error'
import NewsPagination, { pageHref, pageRange } from '../../components/news/NewsPagination'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const lista = async (locale = 'es', page?: string) =>
  renderToStaticMarkup(await NoticiasPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ page }) }))
const detalle = async (locale = 'es') => renderToStaticMarkup(await NoticiaPage({ params: Promise.resolve({ locale, slug: 'una-noticia' }) }))

const doc = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  slug: `noticia-${id}`,
  title: `Titular ${id}`,
  summary: `Resumen ${id}`,
  publishedAt: '2026-07-24T00:00:00.000Z',
  category: 'investigacion',
  featuredImage: { url: `https://cms.example.org/img${id}.jpg`, alt: `Foto ${id}` },
  ...over,
})

describe('INST-03 /noticias (listado)', () => {
  beforeEach(() => {
    getNews.mockResolvedValue({ docs: [doc(1), doc(2, { featuredImage: null, category: 'otra-categoria' }), doc(3)], totalDocs: 20, totalPages: 4 })
  })

  it('un solo h1, cabecera compartida, fondo claro y una fila por noticia con enlace a su detalle', async () => {
    const html = await lista()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html.match(/<li><a [^>]*class="group /g)).toHaveLength(3)
    expect(html).toContain('href="/noticias/noticia-1"')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white/)
  })

  it('traduce la categoría conocida, deja la del CMS si no está en el catálogo y muestra la fecha en <time>', async () => {
    const html = await lista()
    expect(html).toContain('categories.investigacion')
    expect(html).toContain('otra-categoria')
    expect(html).toMatch(/<time dateTime="2026-07-24T00:00:00.000Z">FECHA-2026<\/time>/)
  })

  it('una noticia sin imagen no deja un hueco ni una imagen rota', async () => {
    const html = await lista()
    expect(html.match(/<img /g)).toHaveLength(2)
  })

  it('en la primera página la primera noticia es la destacada; en las siguientes todas son filas iguales', async () => {
    expect(await lista('es', undefined)).toContain('lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]')
    expect(await lista('es', '2')).not.toContain('lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]')
  })

  it('con el CMS caído muestra «no disponible» con reintentar; sin noticias, «vacío» sin reintentar', async () => {
    getNews.mockRejectedValue(new Error('boom'))
    let html = await lista()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).not.toContain('>empty<')
    getNews.mockResolvedValue({ docs: [], totalDocs: 0, totalPages: 1 })
    html = await lista()
    expect(html).toContain('>empty<')
    expect(html).not.toContain('states.retry')
  })

  it('una página fuera de rango da 404 y no una lista vacía; un valor inválido de page equivale a la primera', async () => {
    getNews.mockResolvedValue({ docs: [], totalDocs: 20, totalPages: 4 })
    await expect(lista('es', '99')).rejects.toThrow('NOT_FOUND')
    getNews.mockResolvedValue({ docs: [doc(1)], totalDocs: 1, totalPages: 1 })
    await lista('es', 'abc')
    expect(getNews).toHaveBeenLastCalledWith({ page: 1, limit: 6 })
    await lista('es', '-3')
    expect(getNews).toHaveBeenLastCalledWith({ page: 1, limit: 6 })
  })

  it('los enlaces llevan el prefijo del idioma en el aviso y la cabecera', async () => {
    getNews.mockRejectedValue(new Error('boom'))
    const html = await lista('pt-BR')
    expect(html).toContain('href="/pt-BR/noticias"')
    expect(html).toContain('href="/pt-BR/contacto"')
  })
})

describe('INST-03 paginación', () => {
  const labels = { nav: 'nav', prev: 'prev', next: 'next', page: (n: number) => `p${n}` }
  const render = (current: number, total: number) => renderToStaticMarkup(createElement(NewsPagination, { current, total, labels }))

  it('la primera página es /noticias sin parámetro y no hay href="#"', () => {
    expect(pageHref(1)).toBe('/noticias')
    expect(pageHref(3)).toBe('/noticias?page=3')
    expect(render(1, 5)).not.toContain('href="#"')
  })

  it('en los extremos «anterior»/«siguiente» no son enlaces', () => {
    const first = render(1, 5)
    expect(first).toMatch(/<span aria-disabled="true"[^>]*>[^]*prev/)
    expect(first).toContain('rel="next"')
    expect(first).not.toContain('rel="prev"')
    const last = render(5, 5)
    expect(last).toContain('rel="prev"')
    expect(last).not.toContain('rel="next"')
  })

  it('marca la página actual con aria-current y no se muestra con una sola página', () => {
    expect(render(2, 5)).toMatch(/aria-current="page"[^>]*>2</)
    expect(render(1, 1)).toBe('')
  })

  it('con muchas páginas resume con puntos suspensivos', () => {
    expect(pageRange(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageRange(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20])
    expect(pageRange(2, 20)).toEqual([1, 2, 3, '…', 20])
  })
})

describe('INST-03 /noticias/[slug] (detalle)', () => {
  const full = (over: Record<string, unknown> = {}) => ({
    ...doc(7, { title: 'Un titular bastante largo '.repeat(4).trim(), author: 'Comunicación' }),
    content: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Cuerpo de la noticia', format: 0 }] }] } },
    tags: [{ tag: 'calidad' }],
    gallery: [{ image: { id: 1, alt: 'G', url: 'https://cms.example.org/g.jpg' }, caption: 'Pie' }],
    ...over,
  })
  beforeEach(() => {
    draftMode.mockResolvedValue({ isEnabled: false })
    getNewsBySlug.mockResolvedValue(full())
  })

  it('un solo h1 de tamaño reducido, migas de tres niveles y entradilla en la cabecera, sin estilo oscuro', async () => {
    const html = await detalle()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('lg:text-5xl') // titleSize md
    expect(html.match(/<ol /g)).toHaveLength(1)
    expect(html).toContain('href="/noticias"') // nivel intermedio
    expect(html).toContain('Resumen 7')
    // El resumen aparece una sola vez en el texto visible (sin contar los datos estructurados de <script>).
    expect(html.replace(/<script[^>]*>[^]*?<\/script>/g, '').match(/Resumen 7/g)).toHaveLength(1)
    // Sin estilo oscuro: la cabecera verde usa texto blanco a propósito; el cuerpo (desde <article>) no.
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C/)
    expect(html.slice(html.indexOf('<article'))).not.toMatch(/text-white/)
  })

  it('la línea de datos junta categoría, fecha y autoría y el texto sale del CMS en columna de lectura', async () => {
    const html = await detalle()
    expect(html).toContain('categories.investigacion · FECHA-2026 · Comunicación')
    expect(html).toContain('Cuerpo de la noticia')
    expect(html).toContain('max-w-[68ch]')
  })

  it('las etiquetas son una lista, la galería usa el carrusel y hay enlace de regreso', async () => {
    const html = await detalle()
    expect(html).toMatch(/<ul aria-label="tagsLabel"/)
    expect(html).toContain('data-galeria="1"')
    expect(html).toContain('backToNews')
  })

  it('sin imagen ni etiquetas ni galería no deja huecos', async () => {
    getNewsBySlug.mockResolvedValue(full({ featuredImage: null, featuredImageUrl: null, tags: [], gallery: [] }))
    const html = await detalle()
    expect(html).not.toContain('<figure')
    expect(html).not.toContain('tagsLabel')
    expect(html).not.toContain('data-galeria')
  })

  it('una noticia inexistente da 404 y los datos estructurados usan las migas traducidas', async () => {
    getNewsBySlug.mockResolvedValue(null)
    await expect(detalle()).rejects.toThrow('NOT_FOUND')
    getNewsBySlug.mockResolvedValue(full())
    const html = await detalle()
    expect(html).toContain('breadcrumb.inicio')
    expect(read('app/[locale]/noticias/[slug]/page.tsx')).not.toMatch(/name: 'Inicio'|name: 'Noticias'/)
  })

  it('el aviso de vista previa se conserva cuando el modo borrador está activo', async () => {
    draftMode.mockResolvedValue({ isEnabled: true })
    expect(await detalle()).toContain('draftBanner')
  })

  it('el texto enriquecido usa la paleta clara y sigue neutralizando enlaces', () => {
    const rt = read('components/RichText.tsx')
    expect(rt).not.toMatch(/text-white|#5CFF5C/)
    expect(rt).toContain('safeHref')
  })
})

describe('INST-03 error, esqueletos y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref005' })
    const html = renderToStaticMarkup(createElement(NoticiasError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it.each(['app/[locale]/noticias/loading.tsx', 'app/[locale]/noticias/[slug]/loading.tsx'])('%s ya no es oscuro', (rel) => {
    expect(read(rel)).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.noticias.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Conocé|Elegí|Mirá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['count', 'pagination.label', 'states.unavailable', 'error.title', 'listLabel']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que piden las páginas y los componentes existen en es', () => {
    const used = new Set<string>(['pageTitle', 'pageDescription', 'pageTitlePaged'])
    for (const f of ['app/[locale]/noticias/page.tsx', 'app/[locale]/noticias/[slug]/page.tsx']) {
      for (const m of read(f).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    }
    for (const m of read('app/[locale]/noticias/page.tsx').matchAll(/pagination\.\w+/g)) used.add(m[0])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
