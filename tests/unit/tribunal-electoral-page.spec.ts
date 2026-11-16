// INST-02: /tribunal-electoral en el sistema visual del portal (PageHero, StatePanel, acordeón claro, error en línea).
// Amenazas: (1) mostrar una página vacía sin aviso cuando el CMS no tiene miembros; (2) un enlace de documento con
// `javascript:` llevado a un `href`; (3) el estilo oscuro anterior (slate-950/#5CFF5C) o etiquetas en mayúsculas;
// (4) claves faltantes en alguna lengua o voseo en español; (5) filtrar el mensaje de un error al visitante.
// La política de datos (sin demo en producción, DEP-19b) no cambia: la cubre dep19b-demo-prod.spec.ts.
// Límite: render estático en entorno node; el aspecto visual, el foco y el acordeón abierto se verifican en el navegador.
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
const getTribunalMiembros = vi.hoisted(() => vi.fn())
const getTribunalDocumentos = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/tribunal', async (orig) => ({
  ...(await orig<typeof import('@/lib/cms/queries/tribunal')>()),
  getTribunalMiembros,
  getTribunalDocumentos,
}))

import TribunalPage from '../../app/[locale]/tribunal-electoral/page'
import TribunalError from '../../app/[locale]/tribunal-electoral/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const render = async (locale = 'es') => renderToStaticMarkup(await TribunalPage({ params: Promise.resolve({ locale }) }))

const miembros = [
  { id: 1, nombre: 'Persona Uno Presidente', cargo: 'Presidente', orden: 1 },
  { id: 2, nombre: 'Persona Dos Vice', cargo: 'Vicepresidente', orden: 2 },
  { id: 3, nombre: 'Persona Tres Titular', cargo: 'Miembro Titular', orden: 3 },
]
const documentos = [
  { id: 1, titulo: 'Cronograma de prueba', tipo: 'principal-cronograma', driveUrl: 'https://drive.example.org/c', orden: 1 },
  { id: 2, titulo: 'Reglamento de prueba', tipo: 'principal-reglamento', driveUrl: '', orden: 2 },
  { id: 3, titulo: 'Lista de prueba', tipo: 'lista-inscriptos', driveUrl: 'javascript:alert(1)', orden: 3 },
]

describe('INST-02 /tribunal-electoral', () => {
  beforeEach(() => {
    getTribunalMiembros.mockResolvedValue(miembros)
    getTribunalDocumentos.mockResolvedValue(documentos)
  })

  it('un solo h1, cabecera compartida y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|slate-900|uppercase|tracking-widest|#5CFF5C/)
  })

  it('los miembros salen del CMS como lista, con nombre y cargo', async () => {
    const html = await render()
    for (const m of miembros) expect(html).toContain(m.nombre)
    expect(html).toContain('Vicepresidente')
    expect(html).toMatch(/<ul[^>]*aria-labelledby="members-heading"/)
  })

  it('sin miembros en el CMS muestra el aviso en línea y no inventa nombres', async () => {
    getTribunalMiembros.mockResolvedValue([])
    const html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('members.empty')
  })

  it('documento principal con enlace descarga en pestaña nueva; sin enlace queda «próximamente»', async () => {
    const html = await render()
    expect(html).toMatch(/<a [^>]*href="https:\/\/drive\.example\.org\/c"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
    expect(html).toContain('downloads.pending')
  })

  it('un enlace con javascript: nunca llega al href (principal ni acordeón)', async () => {
    expect(await render()).not.toContain('javascript:')
  })

  it('sin documentos principales se omite la sección', async () => {
    getTribunalDocumentos.mockResolvedValue([])
    expect(await render()).not.toContain('downloads.title')
  })

  it('el acordeón muestra las seis etapas con su estado vacío accesible', async () => {
    const html = await render()
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(6)
    expect(html.match(/role="region"/g)).toHaveLength(6)
  })

  it('el enlace de inicio lleva el prefijo del idioma', async () => {
    expect(await render('pt-BR')).toContain('href="/pt-BR"')
  })

  it('usa getT con el idioma de la ruta, no el idioma implícito', () => {
    const page = read('app/[locale]/tribunal-electoral/page.tsx')
    expect(page).toMatch(/getT\(locale, 'pages\.tribunal-electoral'\)/)
    expect(page).not.toMatch(/getTranslations|getLocale/)
  })
})

describe('INST-02 /tribunal-electoral: error y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref003' })
    const html = renderToStaticMarkup(createElement(TribunalError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.tribunal-electoral.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves nuevas', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Conocé|Accedé|Elegí|Mirá|podés)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['error.title', 'members.empty', 'breadcrumb.inicio']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>()
    for (const m of read('app/[locale]/tribunal-electoral/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
