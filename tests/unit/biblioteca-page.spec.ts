// INST-06: /biblioteca en el sistema visual del portal (búsqueda en la cabecera, lista de tesis, avisos en línea).
// Amenazas: (1) una caída del CMS mostrada como «sin resultados»; (2) el formulario que pierde el idioma al buscar;
// (3) un enlace de PDF con `javascript:` en un href; (4) texto de búsqueda sin escapar; (5) el estilo oscuro anterior;
// (6) claves de mensajes faltantes o voseo; (7) filtrar el mensaje de un error al visitante.
// Límite: render estático en entorno node; el aspecto visual y el foco se verifican en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const getTesisCatalogo = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/tesisCatalogo', () => ({ getTesisCatalogo }))

import BibliotecaPage from '../../app/[locale]/biblioteca/page'
import BibliotecaError from '../../app/[locale]/biblioteca/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const render = async (locale = 'es', q?: string | string[]) =>
  renderToStaticMarkup(await BibliotecaPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ q }) }))

const tesis = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  titulo: `Tesis ${id}`,
  autor: 'Ana Pérez',
  anio: 2024,
  facultad: 'Facultad de Medicina',
  resumen: `Resumen ${id}`,
  urlPdf: `https://repositorio.example.org/${id}.pdf`,
  ...over,
})

describe('INST-06 /biblioteca', () => {
  beforeEach(() => { getTesisCatalogo.mockResolvedValue({ status: 'ok', docs: [tesis(1), tesis(2, { urlPdf: undefined, resumen: undefined })], total: 2 }) })

  it('un solo h1, cabecera compartida, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/1/)
  })

  it('el formulario de búsqueda está en la cabecera, con etiqueta, y conserva el idioma en su action', async () => {
    const es = await render('es')
    const form = es.match(/<form [^>]*>/)![0]
    for (const a of ['method="GET"', 'action="/biblioteca"', 'role="search"']) expect(form).toContain(a)
    expect(es).toMatch(/<label for="biblioteca-q"/)
    expect(await render('pt-BR')).toContain('action="/pt-BR/biblioteca"')
    expect(await render('gn')).toContain('action="/gn/biblioteca"')
  })

  it('sin término lista las más recientes; con término muestra el resumen con la cantidad y un enlace para limpiar', async () => {
    let html = await render()
    expect(html).toContain('results.recent')
    expect(html).not.toContain('results.clear')
    expect(getTesisCatalogo).toHaveBeenLastCalledWith({ q: '', limit: 12 })
    html = await render('es', 'ana')
    expect(html).toContain('results.query::count=2;q=ana')
    expect(html).toContain('results.clear')
    expect(getTesisCatalogo).toHaveBeenLastCalledWith({ q: 'ana', limit: 12 })
  })

  it('cada tesis es una fila con título, autoría y resumen; el PDF solo si existe y abre en pestaña nueva', async () => {
    const html = await render()
    expect(html).toContain('Tesis 1')
    expect(html).toContain('Ana Pérez · 2024 · Facultad de Medicina')
    expect(html).toContain('Resumen 1')
    expect(html).toMatch(/<a [^>]*href="https:\/\/repositorio\.example\.org\/1\.pdf"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
    expect(html.match(/target="_blank"/g)).toHaveLength(1) // la tesis 2 no tiene enlace
    expect(html).toContain('verTesis')
  })

  it('avisa cuando se muestran menos tesis de las que hay', async () => {
    getTesisCatalogo.mockResolvedValue({ status: 'ok', docs: [tesis(1)], total: 30 })
    expect(await render('es', 'x')).toContain('results.partial::shown=1;total=30')
    getTesisCatalogo.mockResolvedValue({ status: 'ok', docs: [tesis(1)], total: 1 })
    expect(await render('es', 'x')).not.toContain('results.partial')
  })

  it('el término se escapa en el HTML y se limita a 100 caracteres', async () => {
    const html = await render('es', '<script>alert(1)</script>')
    expect(html).not.toContain('<script>alert(1)</script>')
    await render('es', 'z'.repeat(400))
    expect((getTesisCatalogo.mock.calls.at(-1)![0] as { q: string }).q).toHaveLength(100)
    await render('es', ['uno', 'dos'])
    expect((getTesisCatalogo.mock.calls.at(-1)![0] as { q: string }).q).toBe('uno')
  })

  it('con el CMS caído muestra «no disponible» con reintentar (conserva la búsqueda); no lo confunde con «sin resultados»', async () => {
    getTesisCatalogo.mockResolvedValue({ status: 'unavailable' })
    const html = await render('es', 'ana pérez')
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).toContain('href="/biblioteca?q=ana%20p%C3%A9rez"')
    expect(html).not.toContain('states.noResults')
  })

  it('sin resultados para la búsqueda o con el repositorio vacío muestra el aviso sin reintentar', async () => {
    getTesisCatalogo.mockResolvedValue({ status: 'empty' })
    let html = await render('es', 'nada')
    expect(html).toContain('states.noResults::query=nada')
    expect(html).not.toContain('states.retry')
    html = await render('es')
    expect(html).toContain('states.emptyLibrary')
    expect(html).not.toContain('states.noResults')
  })

  it('los enlaces de reintento y contacto llevan el prefijo del idioma', async () => {
    getTesisCatalogo.mockResolvedValue({ status: 'unavailable' })
    const html = await render('gn')
    expect(html).toContain('href="/gn/biblioteca"')
    expect(html).toContain('href="/gn/contacto"')
  })
})

describe('INST-06 /biblioteca: error y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref008' })
    const html = renderToStaticMarkup(createElement(BibliotecaError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.biblioteca.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Ingresá|Intentá|consultá|Explorá|Buscá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['searchLabel', 'results.recent', 'results.partial', 'states.unavailable', 'states.emptyLibrary', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es y no quedan las claves viejas', () => {
    const used = new Set<string>(['pageTitleDefault', 'pageTitleQuery', 'pageDescription'])
    for (const m of read('app/[locale]/biblioteca/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
    expect(Object.keys(es).filter((k) => /^(portalLabel|headingResults|resultsSingular|resultsPlural|emptyPrompt|noResultsHint)$/.test(k))).toEqual([])
  })
})
