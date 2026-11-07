// INST-05 (T4): /tramites en el sistema visual del portal, con el contenido del CMS (spec docs/specs/portal/TRAMITES.md §2.6).
// Amenazas: (1) una caída del CMS mostrada como «sin trámites» o requisitos escritos en el código; (2) contenido oculto
// tras pestañas (invisible para buscadores e impresión); (3) el estilo oscuro anterior; (4) claves de mensajes faltantes o
// voseo; (5) un correo escrito en la página; (6) filtrar el mensaje de un error al visitante.
// Límite: render estático en entorno node; el aspecto visual y el foco se verifican en el navegador.
import { existsSync, readFileSync } from 'node:fs'
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
const getTramites = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/tramites', () => ({ getTramites }))

import TramitesPage from '../../app/[locale]/tramites/page'
import TramitesError from '../../app/[locale]/tramites/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const render = async (locale = 'es') => renderToStaticMarkup(await TramitesPage({ params: Promise.resolve({ locale }) }))

const fac = (slug: string, nombre: string) => ({ slug, nombre })
const tramite = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  titulo: `Trámite ${id}`,
  requisitos: [`Requisito ${id}.1`, `Requisito ${id}.2`],
  orden: id,
  facultad: fac('facultad-a', 'Facultad A'),
  ...over,
})
const ok = {
  status: 'ok',
  grupos: [
    { facultad: fac('facultad-a', 'Facultad A'), tramites: [tramite(1, { etiqueta: 'Art. 150°', descripcion: 'Descripción 1', nota: 'Nota 1' }), tramite(2, { requisitos: [] })] },
    { facultad: fac('facultad-b', 'Facultad B'), tramites: [tramite(3, { facultad: fac('facultad-b', 'Facultad B') })] },
  ],
}

describe('INST-05 /tramites', () => {
  beforeEach(() => { getTramites.mockResolvedValue(ok) })

  it('un solo h1, cabecera compartida, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10|role="tab"/)
  })

  it('muestra todas las facultades y todos los trámites a la vez (sin pestañas), con índice de anclas', async () => {
    const html = await render()
    for (const s of ['facultad-a', 'facultad-b']) {
      expect(html).toContain(`href="#fac-${s}"`)
      expect(html).toContain(`id="fac-${s}"`)
    }
    for (const t of ['Trámite 1', 'Trámite 2', 'Trámite 3']) expect(html).toContain(t)
    expect(html).not.toContain('role="tablist"')
    expect(html).not.toContain('hidden=""')
  })

  it('cada trámite muestra sus requisitos como lista, la etiqueta, la descripción y la nota solo si existen', async () => {
    const html = await render()
    expect(html).toContain('Requisito 1.1')
    expect(html).toContain('Art. 150°')
    expect(html).toContain('Descripción 1')
    expect(html).toContain('Nota 1')
    expect(html.match(/Requisito 2\.1/g)).toBeNull() // el trámite 2 no tiene requisitos: no se inventan
    expect(html.match(/>nota: <|nota: /g)).toHaveLength(1) // solo el trámite 1 tiene nota
  })

  it('la ayuda enlaza a /contacto con el prefijo del idioma y no trae un correo escrito en la página', async () => {
    expect(await render('pt-BR')).toContain('href="/pt-BR/contacto"')
    expect(read('app/[locale]/tramites/page.tsx')).not.toMatch(/@unc\.edu\.py|mailto:/)
  })

  it('con el CMS caído muestra «no disponible» con reintentar; sin trámites, «vacío» sin reintentar', async () => {
    getTramites.mockResolvedValue({ status: 'unavailable' })
    let html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).not.toContain('Requisito')
    getTramites.mockResolvedValue({ status: 'empty' })
    html = await render()
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
  })

  it('los enlaces de reintento y contacto llevan el prefijo del idioma', async () => {
    getTramites.mockResolvedValue({ status: 'unavailable' })
    const html = await render('gn')
    expect(html).toContain('href="/gn/tramites"')
    expect(html).toContain('href="/gn/contacto"')
  })

  it('con una sola facultad no muestra el índice', async () => {
    getTramites.mockResolvedValue({ status: 'ok', grupos: [ok.grupos[0]] })
    expect(await render()).not.toContain('tramites-index')
  })

  it('ya no existe el componente con los requisitos escritos en el código', () => {
    expect(existsSync(resolve(root, 'components/tramites/FacultadTabs.tsx'))).toBe(false)
    for (const f of ['components/tramites/TramitesPorFacultad.tsx', 'app/[locale]/tramites/page.tsx']) {
      expect(read(f), f).not.toMatch(/Bachiller|Cédula|NAUTILUS|Examen de Ingreso|Decano/)
    }
  })
})

describe('INST-05 /tramites: error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref007' })
    const html = renderToStaticMarkup(createElement(TramitesError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga ya no es oscuro', () => {
    expect(read('app/[locale]/tramites/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.tramites.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Iniciá|Necesitás|dirigíte|escribí|Elegí|Conocé|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['index.label', 'listaDe', 'help.title', 'states.unavailable', 'states.empty', 'error.title']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es, y no quedan claves de trámites genéricos sin uso', () => {
    const used = new Set<string>(['meta.title', 'meta.description'])
    for (const f of ['app/[locale]/tramites/page.tsx']) for (const m of read(f).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
    expect(Object.keys(es).filter((k) => /^tramites\.t\d|^seeMore|^hero\.label/.test(k))).toEqual([])
  })
})
