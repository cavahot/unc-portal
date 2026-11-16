// INST-04: /carreras (catálogo) y /carreras/[slug] (detalle) en el sistema visual del portal.
// Amenazas: (1) una caída del CMS mostrada como pantalla de error global o como «no hay carreras»; (2) enlaces a
// facultades con el slug largo del CMS (otra página, otro diseño); (3) un enlace de resolución del CMS con
// `javascript:` en un href; (4) el estilo oscuro anterior; (5) datos inventados cuando el CMS no los trae;
// (6) claves faltantes en alguna lengua o voseo; (7) filtrar el mensaje de un error al visitante.
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
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error('NOT_FOUND') }))
vi.mock('next/navigation', () => ({ notFound }))
const getCarreras = vi.hoisted(() => vi.fn())
const getCarreraBySlug = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/carreras', () => ({ getCarreras, getCarreraBySlug }))

import CarrerasPage from '../../app/[locale]/carreras/page'
import CarreraPage from '../../app/[locale]/carreras/[slug]/page'
import CarrerasError from '../../app/[locale]/carreras/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const lista = async (locale = 'es') => renderToStaticMarkup(await CarrerasPage({ params: Promise.resolve({ locale }) }))
const detalle = async (locale = 'es') => renderToStaticMarkup(await CarreraPage({ params: Promise.resolve({ locale, slug: 'una-carrera' }) }))

const FAC_A = { slug: 'facultad-de-odontologia', nombre: 'Facultad de Odontología' }
const FAC_B = { slug: 'facultad-nueva', nombre: 'Facultad Nueva' }
const row = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  slug: `carrera-${id}`,
  nombre: `Carrera ${id}`,
  tipo: 'grado',
  sede: 'Concepción',
  facultad: FAC_A,
  activa: true,
  resoluciones: [],
  ...over,
})

describe('INST-04 /carreras (catálogo)', () => {
  beforeEach(() => {
    getCarreras.mockResolvedValue([
      row(1, { modalidad: 'Presencial', duracion: 5 }),
      row(2, { tipo: 'posgrado' }),
      row(3, { facultad: FAC_B }),
      row(4, { facultad: null }),
    ])
  })

  it('un solo h1, cabecera compartida, fondo claro y un enlace por carrera a su detalle', async () => {
    const html = await lista()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    for (const id of [1, 2, 3, 4]) expect(html).toContain(`href="/carreras/carrera-${id}"`)
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10/)
  })

  it('agrupa por facultad con índice en la cabecera y enlaza a la ruta pública de la facultad, no al slug largo', async () => {
    const html = await lista()
    expect(html).toContain('href="#fac-facultad-de-odontologia"')
    expect(html).toContain('id="fac-facultad-nueva"')
    expect(html).toContain('href="/facultades/odontologia"')
    expect(html).toContain('href="/facultades/facultad-nueva"')
    expect(html).not.toContain('href="/facultades/facultad-de-odontologia"')
    expect(html).toContain('sinFacultad') // las carreras sin facultad no se esconden ni se asignan a otra
  })

  it('la fila muestra solo los datos que existen y los subtítulos de tipo solo si hay más de un tipo', async () => {
    const html = await lista()
    expect(html).toContain('Concepción · Presencial · duracion::count=5')
    expect(html).toContain('tipos.posgrado')
    expect(html.match(/<h3[ >]/g)).toHaveLength(2) // Odontología tiene grado y posgrado; las demás un solo tipo
  })

  it('con el CMS caído muestra «no disponible» con reintentar; sin carreras, «vacío» sin reintentar', async () => {
    getCarreras.mockRejectedValue(new Error('boom'))
    let html = await lista()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    getCarreras.mockResolvedValue([])
    html = await lista()
    expect(html).toContain('>empty<')
    expect(html).not.toContain('states.retry')
  })

  it('los enlaces llevan el prefijo del idioma', async () => {
    const html = await lista('pt-BR')
    expect(html).toContain('href="/pt-BR/carreras/carrera-1"')
    expect(html).toContain('href="/pt-BR/facultades/odontologia"')
  })
})

describe('INST-04 /carreras/[slug] (detalle)', () => {
  const full = (over: Record<string, unknown> = {}) =>
    row(9, {
      nombre: 'Una carrera con un nombre bastante largo para probar el titular',
      modalidad: 'Presencial',
      duracion: 4,
      titulo: 'Licenciado en Pruebas',
      perfil: 'Perfil del egresado de prueba',
      resoluciones: [
        { numero: '165/15', enlace: 'https://drive.google.com/file/d/abc/view', detalle: 'Actualización' },
        { numero: '10/20', enlace: 'javascript:alert(1)' },
      ],
      ...over,
    })
  beforeEach(() => { getCarreraBySlug.mockResolvedValue(full()) })

  it('un solo h1 reducido, migas de tres niveles, ficha del programa y sin estilo oscuro', async () => {
    const html = await detalle()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('lg:text-5xl')
    expect(html).toContain('href="/carreras"')
    expect(html).toContain('ficha-programa')
    for (const dato of ['Concepción', 'Presencial', 'Licenciado en Pruebas', 'tipos.grado', 'duracion::count=4']) expect(html).toContain(dato)
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10/)
  })

  it('las resoluciones del CONES abren en pestaña nueva y un enlace con javascript: no llega al href', async () => {
    const html = await detalle()
    expect(html).toMatch(/<a [^>]*href="https:\/\/drive\.google\.com\/file\/d\/abc\/view"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
    expect(html).toContain('10/20') // el número se conserva, sin enlace
    expect(html).not.toContain('javascript:')
  })

  it('enlaza a la facultad por su ruta pública y vuelve al catálogo', async () => {
    const html = await detalle('gn')
    expect(html).toContain('href="/gn/facultades/odontologia"')
    expect(html).toContain('href="/gn/carreras"')
  })

  it('una carrera casi sin datos no pinta secciones vacías ni inventa valores', async () => {
    getCarreraBySlug.mockResolvedValue(row(9, { sede: undefined, resoluciones: [], facultad: null, tipo: undefined }))
    const html = await detalle()
    expect(html).not.toContain('ficha-programa')
    expect(html).not.toContain('id="resoluciones"')
    expect(html).not.toContain('id="perfil"')
    expect(html).not.toContain('facultad-carrera')
  })

  it('una carrera inexistente da 404 y los datos estructurados usan migas traducidas y duración ISO', async () => {
    getCarreraBySlug.mockResolvedValue(null)
    await expect(detalle()).rejects.toThrow('NOT_FOUND')
    getCarreraBySlug.mockResolvedValue(full())
    const html = await detalle()
    expect(html).toContain('breadcrumb.inicio')
    expect(html).toContain('"timeRequired":"P4Y"')
    expect(read('app/[locale]/carreras/[slug]/page.tsx')).not.toMatch(/name: 'Inicio'|name: 'Carreras'/)
  })

  it('una caída del CMS propaga el error a error.tsx y no se cachea como 404', async () => {
    getCarreraBySlug.mockRejectedValue(new Error('boom'))
    await expect(detalle()).rejects.toThrow('boom')
  })
})

describe('INST-04 error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref006' })
    const html = renderToStaticMarkup(createElement(CarrerasError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga ya no es oscuro', () => {
    expect(read('app/[locale]/carreras/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.carreras.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Conocé|Elegí|Mirá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['summary', 'index.label', 'tipos.grado', 'states.unavailable', 'detalle.resoluciones.title', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que piden las páginas y el componente existen en es', () => {
    const used = new Set<string>(['pageTitle', 'pageDescription'])
    for (const f of ['app/[locale]/carreras/page.tsx', 'app/[locale]/carreras/[slug]/page.tsx']) {
      for (const m of read(f).matchAll(/\bt\(\s*['`]([^'`$]+)['`]/g)) used.add(m[1])
    }
    for (const k of ['tipos.grado', 'tipos.posgrado']) used.add(k)
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
