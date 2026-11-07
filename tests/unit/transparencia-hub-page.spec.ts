// INST-01 (T4): hub /transparencia — render por estado, enlace a Información Pública desde el CMS, errores y mensajes
// (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.3, §3 criterio 7 y §2.5; tarea
// odd/tasks/transparencia-institucional-cms.md, S3, S5-S7).
// Amenazas: (1) una ley sin documentos presentada como completa, o «no disponible» confundido con «vacío»;
// (2) el título de Información Pública escrito en el código en vez de tomarse del CMS; (3) tarjetas idénticas por
// plantilla y etiqueta en mayúsculas sobre el título (reglas de diseño); (4) filtrar el mensaje de un error al visitante.
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
const getLey5189Page = vi.hoisted(() => vi.fn())
const getLey5282Page = vi.hoisted(() => vi.fn())
const getInformacionPublica = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/ley5189', () => ({ getLey5189Page }))
vi.mock('@/lib/cms/queries/ley5282', () => ({ getLey5282Page }))
vi.mock('@/lib/cms/queries/informacionPublica', () => ({ getInformacionPublica }))

import TransparenciaPage from '../../app/[locale]/transparencia/page'
import TransparenciaError from '../../app/[locale]/transparencia/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const render = async (locale = 'es') => renderToStaticMarkup(await TransparenciaPage({ params: Promise.resolve({ locale }) }))

const ley = (withDocs: number, total: number) => ({
  status: 'ok',
  groups: Array.from({ length: total }, (_, i) => ({ docs: i < withDocs ? [{ id: i }] : [] })),
})

describe('INST-01 hub /transparencia', () => {
  beforeEach(() => {
    getLey5189Page.mockResolvedValue(ley(2, 9))
    getLey5282Page.mockResolvedValue({ status: 'empty' })
    getInformacionPublica.mockResolvedValue({ status: 'ok', data: { titulo: 'Título de Información Pública (CMS)', descripcion: 'Descripción del CMS.', vias: [{}, {}, {}] } })
  })

  it('un solo h1, tres filas de lista con enlace a rutas reales y sin tarjetas iguales', async () => {
    const html = await render('es')
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html.match(/<li><a [^>]*class="group /g)).toHaveLength(3)
    for (const ruta of ['/ley-5189', '/ley-5282', '/informacion-publica']) expect(html).toContain(`href="${ruta}"`)
    expect(html).not.toMatch(/uppercase|tracking-\[0\.2/) // sin etiqueta en mayúsculas sobre el título
  })

  it('cada ley muestra su propio estado: avance, sin documentos o no disponible', async () => {
    let html = await render()
    expect(html).toContain('progress::withDocs=2;total=9')
    expect(html).toContain('pending')
    getLey5189Page.mockResolvedValue({ status: 'unavailable' })
    html = await render()
    expect(html).toContain('unavailable')
    expect(html).not.toContain('progress::withDocs=2')
  })

  it('Información Pública toma título, descripción y cantidad de vías del CMS', async () => {
    const html = await render()
    expect(html).toContain('Título de Información Pública (CMS)')
    expect(html).toContain('Descripción del CMS.')
    expect(html).toContain('infoPublica.status::count=3')
  })

  it('sin contenido en el CMS usa los textos de la interfaz y no inventa una cantidad de vías', async () => {
    getInformacionPublica.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toContain('infoPublica.heading')
    expect(html).not.toContain('infoPublica.status')
    expect(html).toContain('href="/informacion-publica"')
  })

  it('los enlaces llevan el prefijo del idioma', async () => {
    const html = await render('pt-BR')
    expect(html).toContain('href="/pt-BR/ley-5189"')
    expect(html).toContain('href="/pt-BR/informacion-publica"')
  })

  it('lee las colecciones de las leyes, no el global duplicado', () => {
    const page = read('app/[locale]/transparencia/page.tsx')
    expect(page).toMatch(/getLey5189Page/)
    expect(page).toMatch(/getLey5282Page/)
    expect(page).not.toMatch(/getTransparencia/)
  })
})

describe('INST-01 /transparencia: límite de error y mensajes', () => {
  it('el límite de error no muestra el mensaje del error, solo la referencia', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref001' })
    const html = renderToStaticMarkup(createElement(TransparenciaError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.transparencia.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('en y pt-BR traducen las claves nuevas; es no usa voseo', () => {
    for (const loc of ['en', 'pt-BR']) {
      const other = load(loc)
      for (const k of ['docs.title', 'docs.intro', 'infoPublica.heading', 'infoPublica.action', 'error.title']) expect(other[k], `${loc}:${k}`).not.toBe(es[k])
    }
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Elegí|Conocé|Mirá|podés)\b/)
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>()
    for (const m of read('app/[locale]/transparencia/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
