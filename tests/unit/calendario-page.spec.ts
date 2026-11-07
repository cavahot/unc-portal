// INST-07 (T4): /calendario-academico en el sistema visual del portal, con las fechas del CMS (spec docs/specs/portal/CALENDARIO.md §2.6).
// Amenazas: (1) una caída del CMS mostrada como «sin fechas» o fechas escritas en el código; (2) una fecha desplazada o en
// el idioma equivocado; (3) el estilo oscuro anterior; (4) una tabla sin cabeceras accesibles; (5) el aviso de «fechas
// orientativas» perdido al pie; (6) claves de mensajes faltantes o voseo; (7) filtrar el mensaje de un error al visitante.
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
const getCalendario = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/calendario', () => ({ getCalendario }))

import CalendarioPage from '../../app/[locale]/calendario-academico/page'
import CalendarioError from '../../app/[locale]/calendario-academico/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const render = async (locale = 'es') => renderToStaticMarkup(await CalendarioPage({ params: Promise.resolve({ locale }) }))
/** Quita los espacios finos que `Intl` mete alrededor del guion para poder comparar. */
const norm = (s: string) => s.replace(/[   ]/g, ' ')

const calendario = {
  anio: 2026,
  semestres: [
    {
      id: 1,
      titulo: '1er Semestre 2026',
      tipo: 'semestre',
      anio: 2026,
      orden: 1,
      entradas: [
        { evento: 'inicio-clases', inicio: '2026-03-02' },
        { evento: 'inscripcion-tardia', inicio: '2026-03-16', fin: '2026-03-27' },
        { evento: 'otro', descripcion: 'Feriado institucional', inicio: '2026-04-10' },
      ],
    },
    { id: 2, titulo: '2do Semestre 2026', tipo: 'semestre', anio: 2026, orden: 2, entradas: [{ evento: 'cierre-semestre', inicio: '2026-12-11' }] },
  ],
  examenes: [
    {
      id: 3,
      titulo: 'Mesas de exámenes finales',
      tipo: 'examenes',
      anio: 2026,
      orden: 3,
      entradas: [
        { inicio: '2025-12-01', fin: '2025-12-19' },
        { inicio: '2026-07-14', fin: '2026-08-01' },
      ],
    },
  ],
}

describe('INST-07 /calendario-academico', () => {
  beforeEach(() => { getCalendario.mockResolvedValue({ status: 'ok', calendario }) })

  it('un solo h1, cabecera compartida con el año, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).toContain('hero.description::anio=2026')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10/)
  })

  it('el aviso de «fechas orientativas» va en la cabecera, antes del contenido, y no al pie', async () => {
    const html = await render()
    expect(html).toContain('note.body')
    expect(html.indexOf('note.body')).toBeLessThan(html.indexOf('1er Semestre 2026'))
    expect(html.match(/note\.body/g)).toHaveLength(1)
  })

  it('cada semestre es una lista de definición con el evento traducido o la descripción libre y las fechas formateadas', async () => {
    const html = norm(await render('es'))
    expect(html.match(/<dl /g)).toHaveLength(2)
    for (const k of ['eventos.inicio-clases', 'eventos.inscripcion-tardia', 'eventos.cierre-semestre']) expect(html).toContain(k)
    expect(html).toContain('Feriado institucional')
    expect(html).toContain('>2 mar<')
    expect(html).toContain('>16–27 mar<')
    expect(html).toContain('>11 dic<')
  })

  it('las fechas siguen el idioma de la persona y el guaraní se formatea en español', async () => {
    expect(norm(await render('en'))).toContain('>Mar 16 – 27<')
    expect(norm(await render('pt-BR'))).toContain('>16 – 27 de mar.<')
    expect(norm(await render('gn'))).toContain('>16–27 mar<')
  })

  it('las mesas de exámenes son una tabla con título, cabeceras de columna y de fila, y el período sale de las fechas', async () => {
    const html = norm(await render('es'))
    expect(html.match(/<table /g)).toHaveLength(1)
    expect(html).toContain('<caption class="sr-only">Mesas de exámenes finales</caption>')
    expect(html.match(/<th scope="col"/g)).toHaveLength(2)
    expect(html.match(/<th scope="row"/g)).toHaveLength(2)
    expect(html).toContain('Diciembre de 2025')
    expect(html).toContain('Julio de 2026')
    expect(html).toContain('>1–19 dic<') // el año va en la columna de período
    expect(html).toContain('>14 jul – 1 ago<')
  })

  it('sin semestres o sin mesas de exámenes no deja secciones vacías', async () => {
    getCalendario.mockResolvedValue({ status: 'ok', calendario: { ...calendario, examenes: [] } })
    let html = await render()
    expect(html).not.toContain('<table')
    getCalendario.mockResolvedValue({ status: 'ok', calendario: { ...calendario, semestres: [] } })
    html = await render()
    expect(html).not.toContain('<dl')
    expect(html).toContain('<table')
  })

  it('con el CMS caído muestra «no disponible» con reintentar y no muestra fechas ni el aviso de orientativas', async () => {
    getCalendario.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).toContain('hero.descriptionGeneric')
    expect(html).not.toMatch(/<dl|<table|note\.body/)
  })

  it('sin bloques en el CMS muestra «vacío» sin reintentar', async () => {
    getCalendario.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
  })

  it('los enlaces de reintento y contacto llevan el prefijo del idioma', async () => {
    getCalendario.mockResolvedValue({ status: 'unavailable' })
    const html = await render('pt-BR')
    expect(html).toContain('href="/pt-BR/calendario-academico"')
    expect(html).toContain('href="/pt-BR/contacto"')
  })

  it('el código de la página no trae fechas ni nombres de eventos escritos', () => {
    const code = read('app/[locale]/calendario-academico/page.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(code).not.toMatch(/Inicio de clases|Parciales|Cierre del semestre|\b20\d\d-\d\d-\d\d\b|\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/)
  })
})

describe('INST-07 /calendario-academico: error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref009' })
    const html = renderToStaticMarkup(createElement(CalendarioError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga ya no es oscuro', () => {
    expect(read('app/[locale]/calendario-academico/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.calendario-academico.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Verificá|Consultá|Elegí|Intentá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['hero.description', 'eventos.inicio-clases', 'examenes.title', 'states.unavailable', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('hay una etiqueta traducida por cada evento estándar y las claves que pide la página existen en es', () => {
    for (const k of ['inicio-clases', 'inscripcion-tardia', 'parciales-1', 'parciales-2', 'cierre-semestre']) expect(es[`eventos.${k}`], k).toBeTruthy()
    const used = new Set<string>(['meta.title', 'meta.description'])
    for (const m of read('app/[locale]/calendario-academico/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })

  it('ya no quedan las fechas escritas ni la etiqueta sobre el título en los mensajes', () => {
    expect(Object.keys(es).filter((k) => /^semesters\.|^finals\.|^hero\.label$|^note\.label$/.test(k))).toEqual([])
  })
})
