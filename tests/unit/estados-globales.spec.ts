// REDISEÑO de las pantallas globales (404, error, carga y error crítico) al estilo claro del portal, con textos por idioma.
// Amenazas: (1) pantallas oscuras (#060d1a, slate-950, #020817) que rompen la identidad al caer una página; (2) textos en español
// y voseo en /en, /pt-BR y /gn; (3) filtrar el mensaje de un error al visitante; (4) catálogo incompleto o namespace sin registrar.
// Límite: render estático con next-intl simulado; el aspecto visual se verifica en el navegador. `global-error` no puede usar
// el catálogo (reemplaza todo el documento y el proveedor de idioma no existe), por eso queda en español y minimalista.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}:${key}` }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))

import NotFound from '../../app/[locale]/not-found'
import LocaleError from '../../app/[locale]/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const OLD_STYLE = /#060d1a|slate-950|#020817|bg-white\/5|#5CFF5C/

describe('404', () => {
  it('es claro, usa el catálogo y ofrece salidas a inicio y noticias', () => {
    const html = renderToStaticMarkup(createElement(NotFound))
    expect(html).toContain('pages.estados:notFound.title')
    expect(html).toContain('pages.estados:notFound.home')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/noticias"')
    expect(html).toContain('bg-[#F4F7F5]')
    expect(html).not.toMatch(OLD_STYLE)
  })
  it('el código no trae textos en español escritos', () => {
    expect(read('app/[locale]/not-found.tsx')).not.toMatch(/no existe en el portal|Verificá|Ir al inicio|Ver noticias/)
  })
})

describe('error de ruta, carga y error crítico', () => {
  it('el error usa el límite compartido con el catálogo y no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref016' })
    const html = renderToStaticMarkup(createElement(LocaleError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).toContain('pages.estados:error.title')
    expect(html).not.toContain('SECRETO')
    expect(read('app/[locale]/error.tsx')).toContain('pages.estados')
  })
  it('la carga y el error crítico ya no son oscuros', () => {
    expect(read('app/[locale]/loading.tsx')).not.toMatch(OLD_STYLE)
    expect(read('app/global-error.tsx')).not.toMatch(OLD_STYLE)
  })
  it('el error crítico no muestra el mensaje del error, solo la referencia', () => {
    const code = read('app/global-error.tsx')
    expect(code).not.toContain('error.message')
    expect(code).toContain('error.digest')
  })
})

describe('catálogo pages.estados', () => {
  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.estados.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })
  it('es no usa voseo, en/pt-BR traducen y el namespace está registrado', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(ingresaste|Verificá|navegá|Intentá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) expect(load(loc)['notFound.title']).not.toBe(es['notFound.title'])
    expect(read('lib/i18n/server.ts')).toContain("'pages.estados'")
  })
})
