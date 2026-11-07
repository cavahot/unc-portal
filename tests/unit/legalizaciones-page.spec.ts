// INST-11 (T4): /legalizaciones en el sistema visual del portal, con el contenido del CMS (spec docs/specs/portal/LEGALIZACIONES.md §2.5).
// Amenazas: (1) una caída del CMS mostrada como «sin contenido», o contenido/arancel escritos en el código; (2) un monto
// inventado cuando el arancel no está enlazado; (3) el estilo oscuro anterior y el voseo; (4) una página que no cambia con el
// idioma (la anterior no usaba los mensajes); (5) claves de mensajes faltantes; (6) filtrar el mensaje de un error.
// Límite: render estático en entorno node con el CMS simulado; el aspecto visual y el foco se verifican en el navegador.
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
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never) }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
vi.mock('@/components/motion/Reveal', () => ({ default: ({ children }: { children?: unknown }) => createElement('div', null, children as never) }))
const getLegalizaciones = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/legalizaciones', () => ({ getLegalizaciones }))

import LegalizacionesPage from '../../app/[locale]/legalizaciones/page'
import LegalizacionesError from '../../app/[locale]/legalizaciones/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const render = async (locale = 'es') => renderToStaticMarkup(await LegalizacionesPage({ params: Promise.resolve({ locale }) }))

const data = {
  titulo: 'Legalización de documentos',
  descripcion: 'Servicio de legalización.',
  unidad: 'Secretaría General — UNC',
  plazo: { min: 12, max: 24 },
  arancel: { concepto: 'Legalizaciones', monto: 50000 },
  notaCones: null,
  tipos: [
    { slug: 'titulos', etiqueta: 'Categoría 1', titulo: 'Títulos de grado', subtitulo: null, acento: 'verde', requisitos: ['Original del título.', 'Según la modalidad.'] },
    { slug: 'certificados', etiqueta: 'Categoría 2', titulo: 'Certificados', subtitulo: null, acento: 'azul', requisitos: ['Original del certificado.'] },
  ],
  pasos: [
    { numero: 1, responsable: 'Recurrente', descripcion: 'Presenta los documentos.' },
    { numero: 2, responsable: 'Mesa de Entrada', descripcion: 'Entrega la contraseña.' },
  ],
  updatedAt: '2026-11-07T12:00:00.000Z',
}

describe('INST-11 /legalizaciones', () => {
  beforeEach(() => getLegalizaciones.mockResolvedValue({ status: 'ok', data }))

  it('un solo h1 con el título del CMS, cabecera verde, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('Legalización de documentos')
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|#5CFF5C|border-white\/\[0\.0|uppercase tracking-widest text-\[#5CFF5C\]/)
  })

  it('muestra plazo, el arancel de la fila enlazada formateado y la unidad responsable', async () => {
    const html = await render()
    expect(html).toContain('facts.plazoValue::min=12;max=24')
    expect(html).toMatch(/50\.000/)
    expect(html).toContain('Secretaría General — UNC')
  })

  it('sin arancel enlazado no muestra un monto: avisa y enlaza a los aranceles con el prefijo del idioma', async () => {
    getLegalizaciones.mockResolvedValue({ status: 'ok', data: { ...data, arancel: null } })
    const html = await render('pt-BR')
    expect(html).toContain('facts.arancelPending')
    expect(html).toContain('href="/pt-BR/aranceles-rectorado"')
    expect(html).not.toMatch(/50\.000/)
  })

  it('las categorías llevan su ancla y sus requisitos, y los pasos están numerados con su responsable', async () => {
    const html = await render()
    expect(html).toContain('Títulos de grado')
    expect(html).toContain('Original del certificado.')
    expect(html).toContain('id="tipo-titulos"')
    expect(html).toContain('href="#tipo-certificados"')
    expect(html).toContain('Presenta los documentos.')
    expect(html).toContain('procedure.step::number=2')
    expect(html).toContain('procedure.intro::unidad=Secretaría General — UNC')
  })

  it('sin nota del CONES (no aplica) y con salidas a /titulos, los aranceles y Contacto', async () => {
    const html = await render('en')
    expect(html).not.toMatch(/cones/i)
    expect(html).toContain('href="/en/titulos"')
    expect(html).toContain('href="/en/aranceles-rectorado"')
    expect(html).toContain('href="/en/contacto"')
  })

  it('con el CMS caído muestra «no disponible» con reintentar y ningún dato escrito en el código', async () => {
    getLegalizaciones.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).toContain('href="/legalizaciones"')
    expect(html).not.toMatch(/Títulos de grado|50\.000|facts\.plazoValue/)
  })

  it('sin contenido muestra «vacío» sin reintentar', async () => {
    getLegalizaciones.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
  })

  it('el código de la página no trae contenido ni textos escritos', () => {
    const code = strip(read('app/[locale]/legalizaciones/page.tsx'))
    expect(code).not.toMatch(/G\. 50\.000|12–24|Recurrente|Perceptoría|NAUTILUS|Categoría 1|querés|Identificá|Ver contactos/)
  })
})

describe('INST-11 error, esqueleto y mensajes', () => {
  it('el límite de error no muestra el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref014' })
    const html = renderToStaticMarkup(createElement(LegalizacionesError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it('el esqueleto de carga existe y no es oscuro', () => {
    expect(read('app/[locale]/legalizaciones/loading.tsx')).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.legalizaciones.json`)) as Json))
  const es = load('es')

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
  })

  it('es no usa voseo; en y pt-BR traducen las claves propias de la página', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(querés|Identificá|Consultá|Mirá|podés|Intentá|Elegí)\b/)
    for (const loc of ['en', 'pt-BR']) for (const k of ['meta.title', 'hero.titulo', 'index.label', 'documents.title', 'cta.title', 'states.unavailable']) expect(load(loc)[k], `${loc}:${k}`).not.toBe(es[k])
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>(['meta.title', 'meta.description'])
    for (const m of strip(read('app/[locale]/legalizaciones/page.tsx')).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
