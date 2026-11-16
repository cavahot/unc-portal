// INST-08 (T-página): /revistas en el sistema visual del portal, con las revistas del CMS.
// Amenazas: (1) una caída del CMS mostrada como «sin revistas»; (2) el estilo oscuro anterior o texto escrito en el
// componente («Desde», «Ver revista»); (3) un enlace externo sin `rel`/aviso de pestaña nueva; (4) claves de mensajes
// faltantes o voseo; (5) filtrar el mensaje de un error al visitante.
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
vi.mock('next/image', () => ({ default: (p: { src: string; alt: string }) => createElement('img', { src: p.src, alt: p.alt }) }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const getRevistasCatalogo = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/revistasCatalogo', () => ({ getRevistasCatalogo }))

import RevistasPage from '../../app/[locale]/revistas/page'
import RevistasError from '../../app/[locale]/revistas/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
/** Solo la lista de revistas: la cabecera también trae <li> y <a> (migas). */
const lista = (html: string) => html.match(/<ul aria-label="list\.label"[\s\S]*?<\/ul>/)?.[0] ?? ''
const render = async (locale = 'es') => renderToStaticMarkup(await RevistasPage({ params: Promise.resolve({ locale }) }))

const docs = [
  { id: 1, nombre: 'Revista Científica UNC', descripcion: 'Investigación.', anioInicio: 2015, urlOjs: 'https://ojs.example.org/rc', portada: { url: '/api/media/file/rc.png', alt: 'Portada RC' } },
  { id: 2, nombre: 'Revista sin enlace', descripcion: 'Sin OJS.' },
]

describe('INST-08 /revistas', () => {
  beforeEach(() => { getRevistasCatalogo.mockResolvedValue({ status: 'ok', docs }) })

  it('un solo h1, cabecera compartida, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10|portalLabel/)
  })

  it('una fila por revista con nombre, año traducido y descripción', async () => {
    const html = await render()
    expect(lista(html).match(/<li /g)).toHaveLength(2)
    expect(html).toContain('Revista Científica UNC')
    expect(html).toContain('desde::year=2015')
    expect(html).toContain('Investigación.')
  })

  it('el enlace a OJS es externo, con rel seguro, nombre accesible y aviso de pestaña nueva; sin enlace válido no hay botón', async () => {
    const html = await render()
    expect(lista(html).match(/<a /g)).toHaveLength(1)
    expect(html).toContain('href="https://ojs.example.org/rc"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('Revista Científica UNC. list.newTab')
  })

  it('la portada lleva su texto alternativo', async () => {
    expect(await render()).toContain('alt="Portada RC"')
  })

  it('con el CMS caído muestra «no disponible» con reintentar y no muestra revistas', async () => {
    getRevistasCatalogo.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(lista(html)).toBe('')
  })

  it('sin revistas muestra «vacío» sin reintentar', async () => {
    getRevistasCatalogo.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
  })

  it('los enlaces de reintento y contacto llevan el prefijo del idioma', async () => {
    getRevistasCatalogo.mockResolvedValue({ status: 'unavailable' })
    const html = await render('pt-BR')
    expect(html).toContain('href="/pt-BR/revistas"')
    expect(html).toContain('href="/pt-BR/contacto"')
  })

  it('ni la página ni la lista traen textos escritos', () => {
    for (const f of ['app/[locale]/revistas/page.tsx', 'components/revistas/RevistasLista.tsx']) {
      const code = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      expect(code, f).not.toMatch(/Desde|Ver revista|No hay revistas|Portal UNC/)
    }
  })
})

describe('INST-08 /revistas: error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref010' })
    const html = renderToStaticMarkup(createElement(RevistasError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga existe y no es oscuro', () => {
    expect(read('app/[locale]/revistas/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.revistas.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Verificá|Consultá|Elegí|Intentá|podés)\b/)
    // «Desde {year}» es igual en portugués: se comprueba solo en inglés.
    for (const loc of ['en', 'pt-BR']) for (const k of ['list.visit', 'states.unavailable', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
    expect(load('en').desde).not.toBe(es.desde)
  })

  it('las claves que pide la página y la lista existen en es', () => {
    const used = new Set<string>(['pageTitle', 'pageDescription'])
    for (const f of ['app/[locale]/revistas/page.tsx']) for (const m of read(f).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
