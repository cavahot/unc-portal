// INST-09: /mapa-sitio construido desde la navegación del CMS (modelo `armarMapa` y página).
// Amenazas: (1) enlaces escritos en el código que apuntan a rutas que no existen (el mapa anterior tenía 5 que devolvían
// «Página no encontrada» y omitía unas 15 páginas del menú); (2) un href hostil del CMS (`javascript:`) llegando al mapa;
// (3) etiquetas sin destino (`#`) mostradas como enlaces; (4) el estilo oscuro anterior; (5) claves de mensajes faltantes o voseo.
// Límite: render estático en entorno node; el aspecto visual y el foco se verifican en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string) => key,
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const getNavigation = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/navigation', () => ({ getNavigation }))

import { armarMapa } from '../../lib/cms/mapaSitio'
import MapaSitioPage from '../../app/[locale]/mapa-sitio/page'
import MapaSitioError from '../../app/[locale]/mapa-sitio/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const render = async (locale = 'es') => renderToStaticMarkup(await MapaSitioPage({ params: Promise.resolve({ locale }) }))

const nav = {
  id: 1,
  links: [
    { label: 'Inicio', type: 'manual', url: '/', children: [] },
    {
      label: 'Institucional',
      type: 'manual',
      url: '/institucional',
      children: [
        { label: 'Historia', type: 'manual', url: '/historia' },
        { label: 'Sin destino', type: 'manual', url: '#' },
        { label: 'Hostil', type: 'manual', url: 'javascript:alert(1)' },
        { label: 'Historia repetida', type: 'manual', url: '/historia' },
        { label: 'Autoridades', type: 'relationship', page: { slug: 'autoridades' } },
      ],
    },
    { label: 'Facultades', type: 'manual', url: '#', children: [{ label: 'Medicina', type: 'manual', url: '/facultades/medicina' }] },
    { label: 'Noticias', type: 'manual', url: '/noticias', children: [] },
    { label: 'Menú vacío', type: 'manual', url: '#', children: [{ label: 'x', type: 'manual', url: '#' }] },
    { label: '', type: 'manual', url: '/sin-etiqueta', children: [] },
  ],
}

describe('INST-09 armarMapa', () => {
  const m = armarMapa(
    // @ts-expect-error datos mínimos de prueba
    nav,
  )

  it('los elementos sin hijos van juntos en «principal», primero y en orden', () => {
    expect(m[0].key).toBe('principal')
    expect(m[0].links.map((l) => l.href)).toEqual(['/', '/noticias'])
  })

  it('un elemento con hijos es una sección con su título y, si lo tiene, su propio destino', () => {
    const inst = m.find((s) => s.title === 'Institucional')!
    expect(inst.href).toBe('/institucional')
    const fac = m.find((s) => s.title === 'Facultades')!
    expect(fac.href).toBeUndefined() // «#» no es un destino
    expect(fac.links.map((l) => l.label)).toEqual(['Medicina'])
  })

  it('resuelve «relación» a /slug, descarta «#», hostiles y repetidos', () => {
    const inst = m.find((s) => s.title === 'Institucional')!
    expect(inst.links.map((l) => l.href)).toEqual(['/historia', '/autoridades'])
    expect(JSON.stringify(m)).not.toContain('javascript')
  })

  it('un menú cuyos hijos no sirven y sin destino propio no aparece; una etiqueta vacía se descarta', () => {
    expect(m.find((s) => s.title === 'Menú vacío')).toBeUndefined()
    expect(JSON.stringify(m)).not.toContain('sin-etiqueta')
  })

  it('una navegación vacía o inválida da un mapa vacío', () => {
    // @ts-expect-error entradas inválidas a propósito
    for (const bad of [null, undefined, {}, { links: null }, { links: [] }]) expect(armarMapa(bad)).toEqual([])
  })
})

describe('INST-09 /mapa-sitio', () => {
  beforeEach(() => getNavigation.mockResolvedValue(nav))

  it('un solo h1, cabecera compartida, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10|hero\.label/)
  })

  it('muestra las secciones del menú del CMS y la sección fija de utilidades con sus enlaces', async () => {
    const html = await render('pt-BR')
    // El `Link` del portal antepone el idioma; en la prueba se simula sin prefijo.
    for (const href of ['/historia', '/autoridades', '/facultades/medicina', '/noticias']) expect(html).toContain(`href="${href}"`)
    expect(html).toContain('Institucional')
    for (const k of ['utilidades.buscar', 'utilidades.privacidad', 'utilidades.accesibilidad']) expect(html).toContain(k)
    expect(html).toContain('href="/buscar"')
    expect(html).toContain('href="/privacidad"')
    expect(html).toContain('href="/accesibilidad"')
  })

  it('los enlaces del mapa solo llevan destinos de la navegación o de las utilidades, no rutas escritas', () => {
    const code = strip(read('app/[locale]/mapa-sitio/page.tsx'))
    expect(code).not.toMatch(/\/institucional\/|\/historia|\/carreras|\/facultades|\/tramites|\/noticias|\/contacto/)
  })

  it('con la navegación vacía muestra solo las utilidades', async () => {
    getNavigation.mockResolvedValue({ id: 1, links: [] })
    const html = await render()
    expect(html).toContain('utilidades.buscar')
    expect(html).not.toContain('Institucional')
  })
})

describe('INST-09 error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref012' })
    const html = renderToStaticMarkup(createElement(MapaSitioError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga existe y no es oscuro', () => {
    expect(read('app/[locale]/mapa-sitio/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.mapa-sitio.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es', (loc) => {
    expect(Object.keys(load(loc)).sort()).toEqual(Object.keys(es).sort())
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas; ya no quedan los enlaces escritos', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Verificá|Consultá|Elegí|Intentá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['sections.principal', 'utilidades.title', 'utilidades.buscar', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
    expect(Object.keys(es).filter((k) => /^sections\.(institucion|academia|servicios|actualidad|legal)\./.test(k) || k === 'hero.label')).toEqual([])
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>(['meta.title', 'meta.description'])
    for (const m of strip(read('app/[locale]/mapa-sitio/page.tsx')).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
