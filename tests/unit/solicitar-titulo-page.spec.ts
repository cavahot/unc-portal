// INST-02: /solicitar-titulo en el sistema visual del portal (PageHero, StatePanel, error en línea).
// Amenazas: (1) la URL del formulario escrita en el código en vez de salir del CMS; (2) un enlace del CMS con
// `javascript:` llevado a un `href`; (3) una página sin enlace y sin aviso cuando el CMS no entrega la URL;
// (4) el estilo oscuro anterior (slate-950) o una etiqueta en mayúsculas sobre el título; (5) claves faltantes en
// alguna lengua o voseo en español; (6) filtrar el mensaje de un error al visitante.
// Límite: render estático en entorno node; el aspecto visual y el foco se verifican en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({ getT: async () => (key: string) => key }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const getEnlacesExternos = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/institutional', () => ({ getEnlacesExternos }))

import SolicitarTituloPage from '../../app/[locale]/solicitar-titulo/page'
import SolicitarTituloError from '../../app/[locale]/solicitar-titulo/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const render = async (locale = 'es') => renderToStaticMarkup(await SolicitarTituloPage({ params: Promise.resolve({ locale }) }))
const FORM = 'https://forms.example.org/solicitud'

describe('INST-02 /solicitar-titulo', () => {
  beforeEach(() => getEnlacesExternos.mockResolvedValue({ formularioTitulos: FORM }))

  it('un solo h1, cabecera compartida y fondo claro (sin el estilo oscuro anterior)', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]') // PageHero
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest/)
  })

  it('el botón apunta a la URL del CMS, en pestaña nueva y avisándolo', async () => {
    const html = await render()
    expect(html).toMatch(new RegExp(`<a [^>]*href="${FORM}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"`))
    expect(html).toContain('newTab')
  })

  it('los pasos son una lista ordenada de cuatro elementos', async () => {
    const html = await render()
    // Hay dos <ol>: las migas de PageHero y la lista de pasos (la segunda, con los cuatro <li>).
    const pasos = html.match(/<ol class="mt-10[^>]*>(.*?)<\/ol>/s)?.[1] ?? ''
    expect(pasos.match(/<li[ >]/g)).toHaveLength(4)
    for (const k of ['step01', 'step02', 'step03', 'step04']) expect(html).toContain(`steps.${k}.title`)
  })

  it('un enlace del CMS con javascript: no llega al href', async () => {
    getEnlacesExternos.mockResolvedValue({ formularioTitulos: 'javascript:alert(1)' })
    const html = await render()
    expect(html).not.toContain('javascript:')
  })

  it('sin URL en el CMS muestra el aviso en línea con salida y no inventa un formulario', async () => {
    getEnlacesExternos.mockResolvedValue({ formularioTitulos: '' })
    const html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).not.toContain('target="_blank"')
  })

  it('la URL del formulario no está escrita en el código de la página', () => {
    expect(read('app/[locale]/solicitar-titulo/page.tsx')).not.toMatch(/docs\.google\.com|forms\.gle/)
  })

  it('los enlaces llevan el prefijo del idioma', async () => {
    getEnlacesExternos.mockResolvedValue({ formularioTitulos: '' })
    expect(await render('pt-BR')).toContain('href="/pt-BR/contacto"')
  })
})

describe('INST-02 /solicitar-titulo: error y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref002' })
    const html = renderToStaticMarkup(createElement(SolicitarTituloError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.solicitar-titulo.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Iniciá|Completá|Adjuntá|Ingresá|Recibirás|Elegí|Conocé)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['error.title', 'states.unavailable', 'newTab']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>()
    for (const m of read('app/[locale]/solicitar-titulo/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
