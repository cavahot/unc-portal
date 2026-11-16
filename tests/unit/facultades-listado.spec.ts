// FAC-05: listado /facultades en el sistema visual del portal, rutas públicas únicas y ruta dinámica unificada.
// Amenazas: (1) el listado enlazando a una dirección distinta de la del menú (slug largo del CMS → página vieja);
// (2) nombres de facultades escritos en el código cuando el CMS falla (parecen oficiales); (3) «no disponible»
// confundido con «vacío», o un «0 carreras» inventado cuando el conteo falla; (4) contenido duplicado en dos URL;
// (5) el estilo oscuro anterior; (6) claves faltantes en alguna lengua o voseo; (7) filtrar el mensaje de un error.
// Límite: render estático en entorno node; el aspecto visual y el foco se verifican en el navegador.
import { readFileSync, readdirSync } from 'node:fs'
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
const getFacultadesLista = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/facultadesLista', () => ({ getFacultadesLista }))
const permanentRedirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }))
vi.mock('next/navigation', () => ({ permanentRedirect, notFound: vi.fn() }))
vi.mock('@/components/facultades/FacultadView', () => ({
  default: ({ slug }: { slug: string }) => createElement('div', { 'data-vista': slug }),
  facultadMetadata: async () => ({}),
}))

import { FACULTAD_RUTA, rutaFacultad, segmentoPropio } from '../../lib/cms/facultadRutas'
import FacultadesPage from '../../app/[locale]/facultades/page'
import FacultadesError from '../../app/[locale]/facultades/error'
import SlugPage from '../../app/[locale]/facultades/[slug]/page'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('FAC-05 rutas públicas', () => {
  it('cada slug del CMS con página propia va a su ruta corta y las demás usan la ruta dinámica codificada', () => {
    expect(rutaFacultad('facultad-de-odontologia')).toBe('/facultades/odontologia')
    expect(rutaFacultad('facultad-de-ciencias-agrarias')).toBe('/facultades/agrarias')
    expect(rutaFacultad('facultad-nueva')).toBe('/facultades/facultad-nueva')
    expect(rutaFacultad('../x?y=1')).toBe('/facultades/..%2Fx%3Fy%3D1')
    expect(segmentoPropio('constructor')).toBeNull() // no hereda de Object.prototype
    expect(rutaFacultad('__proto__')).toBe('/facultades/__proto__')
  })

  it('la lista cerrada coincide con las páginas propias que existen en app/', () => {
    const carpetas = readdirSync(resolve(root, 'app/[locale]/facultades'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '[slug]')
      .map((d) => d.name)
      .sort()
    expect(Object.values(FACULTAD_RUTA).sort()).toEqual(carpetas)
    for (const [slug, segmento] of Object.entries(FACULTAD_RUTA)) {
      expect(read(`app/[locale]/facultades/${segmento}/page.tsx`), segmento).toContain(`'${slug}'`)
    }
  })
})

describe('FAC-05 página /facultades', () => {
  const render = async (locale = 'es') => renderToStaticMarkup(await FacultadesPage({ params: Promise.resolve({ locale }) }))
  const ok = {
    status: 'ok',
    facultades: [
      { slug: 'facultad-de-odontologia', nombre: 'Facultad de Odontología', descripcion: 'Salud oral.', carreras: 3 },
      { slug: 'facultad-nueva', nombre: 'Facultad Nueva', carreras: null },
    ],
  }
  beforeEach(() => { getFacultadesLista.mockResolvedValue(ok) })

  it('un solo h1, cabecera compartida, una fila por facultad y enlaces a la ruta pública única', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html.match(/<li><a [^>]*class="group /g)).toHaveLength(2)
    expect(html).toContain('href="/facultades/odontologia"')
    expect(html).toContain('href="/facultades/facultad-nueva"')
    expect(html).not.toContain('facultad-de-odontologia')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest/)
  })

  it('muestra el conteo solo cuando se pudo calcular y es mayor que cero', async () => {
    const html = await render()
    expect(html).toContain('carrerasCount::count=3')
    expect(html.match(/carrerasCount/g)).toHaveLength(1)
  })

  it('sin facultades o con el CMS caído muestra el aviso en línea; solo el segundo ofrece reintentar', async () => {
    getFacultadesLista.mockResolvedValue({ status: 'empty' })
    let html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('>empty<')
    expect(html).not.toContain('states.retry')
    getFacultadesLista.mockResolvedValue({ status: 'unavailable' })
    html = await render()
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
  })

  it('los enlaces llevan el prefijo del idioma', async () => {
    const html = await render('pt-BR')
    expect(html).toContain('href="/pt-BR/facultades/odontologia"')
  })
})

describe('FAC-05 ruta dinámica /facultades/[slug]', () => {
  const run = (slug: string, locale = 'es') => SlugPage({ params: Promise.resolve({ locale, slug }) })

  it('un slug del CMS con página propia redirige de forma permanente a la ruta corta (con prefijo de idioma)', async () => {
    await expect(run('facultad-de-medicina')).rejects.toThrow('REDIRECT:/facultades/medicina')
    await expect(run('facultad-de-medicina', 'gn')).rejects.toThrow('REDIRECT:/gn/facultades/medicina')
  })

  it('una facultad nueva se pinta con FacultadView (mismo diseño), sin la página oscura anterior', async () => {
    const html = renderToStaticMarkup(await run('facultad-nueva'))
    expect(html).toContain('data-vista="facultad-nueva"')
    expect(read('app/[locale]/facultades/[slug]/page.tsx')).not.toMatch(/slate-950|getFacultadBySlug|Reveal/)
  })

  it('el mapa del sitio usa la misma ruta pública y no inventa facultades sin CMS', () => {
    const sitemap = read('app/sitemap.ts')
    expect(sitemap).toContain('rutaFacultad(f.slug)')
    expect(sitemap).not.toMatch(/queries\/facultades'/)
  })
})

describe('FAC-05 error y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref004' })
    const html = renderToStaticMarkup(createElement(FacultadesError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.facultades.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Conocé|Elegí|Mirá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['lista.title', 'lista.intro', 'states.unavailable', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>()
    for (const m of read('app/[locale]/facultades/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    for (const k of ['pageTitle', 'pageDescription']) used.add(k)
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
