// TITULOS-01 (T4): manejo de errores de /titulos — capturados, registrados y mostrados en el diseño, sin ventanas modales
// (tarea odd/tasks/titulos-cms.md, S9: «capturar los errores en el diseño ... una alternativa a SweetAlert2»).
// Patrón (equivalente al middleware centralizado de errores de Express): (1) capturar donde ocurre (la consulta no
// lanza); (2) registrar sin secretos; (3) mostrar al usuario un mensaje claro con una salida y sin detalles internos
// (ni mensaje ni stack: solo una referencia para soporte); (4) un límite de error de ruta con el mismo estilo del portal.
// Amenazas: fallos mudos que nadie ve en los registros; filtrar mensajes internos (URL, tokens, stack) al visitante;
// depender de un modal que interrumpa y atrape el foco para algo que no lo necesita.
// Límite: render estático (los efectos, como el aviso a Sentry, no corren en node: se comprueba el código);
// el comportamiento del botón «Intentar de nuevo» se verifica en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('../../lib/cms/client', () => ({ cmsFetch }))

import TitulosError from '../../app/[locale]/titulos/error'
import { getTitulosInscripcion } from '../../lib/cms/queries/titulos'
import { CmsError } from '../../lib/cms/errors'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('TITULOS-01 límite de error de la ruta', () => {
  const secretError = Object.assign(new Error('SECRETO: postgres://admin:clave@db/unc falló'), { stack: 'at consulta (/app/lib/db.ts:10)', digest: 'abc123' })
  const html = renderToStaticMarkup(createElement(TitulosError, { error: secretError, reset: () => {} }))

  it('muestra un mensaje claro con título, explicación y dos salidas (reintentar y contacto)', () => {
    expect(html).toMatch(/role="alert"/)
    expect(html).toContain('error.title')
    expect(html).toContain('error.body')
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>[\s\S]*error\.retry/)
    expect(html).toMatch(/<a[^>]*href="\/contacto"/)
  })

  it('NO muestra el mensaje ni el stack del error: solo la referencia para soporte', () => {
    expect(html).not.toContain('SECRETO')
    expect(html).not.toContain('postgres://')
    expect(html).not.toContain('/app/lib/db.ts')
    expect(html).toContain('error.reference::digest=abc123')
  })

  it('sin digest no inventa una referencia', () => {
    const out = renderToStaticMarkup(createElement(TitulosError, { error: new Error('x'), reset: () => {} }))
    expect(out).not.toContain('error.reference')
  })

  it('no es una ventana modal ni atrapa el foco', () => {
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|<dialog|aria-modal/)
  })

  it('reporta la excepción a Sentry al montarse (igual que el límite global)', () => {
    const src = read('app/[locale]/titulos/error.tsx')
    expect(src).toMatch(/'use client'/)
    expect(src).toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*Sentry\.captureException\(error\)/)
  })

  it('usa el sistema visual del portal (verdes) y no el rojo oscuro con estilos en línea del límite global', () => {
    const src = read('app/[locale]/titulos/error.tsx')
    expect(src).toMatch(/#004700|#F4F7F5|#8AFF8A/)
    expect(src).not.toMatch(/style=\{\{/)
    expect(src).not.toMatch(/#020817|rgba\(255, ?80, ?80/)
  })

  it('los textos salen de los mensajes traducidos, no del código', () => {
    const src = read('app/[locale]/titulos/error.tsx')
    expect(src).not.toMatch(/Algo salió mal|Intentar de nuevo|Podés/)
  })
})

describe('TITULOS-01 la consulta registra los fallos sin secretos', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    cmsFetch.mockReset()
    spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => spy.mockRestore())
  const logged = () => spy.mock.calls.flat().join(' ')

  it('un CMS caído se registra con el nombre del error y NO con su mensaje (podría llevar URL o tokens)', async () => {
    cmsFetch.mockRejectedValue(new Error('connect ECONNREFUSED http://usuario:clave-secreta@cms:3002'))
    expect(await getTitulosInscripcion()).toEqual({ status: 'unavailable' })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(logged()).toMatch(/\[TITULOS\]/)
    expect(logged()).toContain('Error')
    expect(logged()).not.toContain('clave-secreta')
  })

  it('un error HTTP del CMS registra su código', async () => {
    cmsFetch.mockRejectedValue(new CmsError('detalle interno', 503))
    await getTitulosInscripcion()
    expect(logged()).toContain('503')
    expect(logged()).not.toContain('detalle interno')
  })

  it('una respuesta con forma inesperada también se registra', async () => {
    cmsFetch.mockResolvedValue('no soy un objeto')
    expect(await getTitulosInscripcion()).toEqual({ status: 'unavailable' })
    expect(logged()).toMatch(/\[TITULOS\]/)
  })

  it('el estado vacío es normal (no es un error) y no se registra', async () => {
    cmsFetch.mockResolvedValue({})
    expect(await getTitulosInscripcion()).toEqual({ status: 'empty' })
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('TITULOS-01 mensajes en los cuatro idiomas', () => {
  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.titulos.json`)) as Json))
  const es = load('es')
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es, ninguna vacía y los mismos marcadores {…}', (loc) => {
    const other = load(loc)
    expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
    for (const [k, v] of Object.entries(other)) {
      expect(v.trim(), `${loc}:${k}`).not.toBe('')
      expect(placeholders(v), `${loc}:${k}`).toEqual(placeholders(es[k]))
    }
  })

  // Cognados reales: en portugués «requisito(s)» se escribe igual que en español. No es una copia sin traducir.
  const COGNATES: Record<string, string[]> = { 'pt-BR': ['index.countOne', 'index.countOther', 'documents.listLabel'], en: [] }

  it.each(['en', 'pt-BR'])('%s: está traducido (no es una copia del español)', (loc) => {
    const other = load(loc)
    const same = Object.keys(es).filter((k) => other[k] === es[k] && !COGNATES[loc].includes(k))
    expect(same, `iguales a es: ${same.join(', ')}`).toEqual([])
  })

  it('es: redacción neutra, sin voseo', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Identificá|Consultá|Mirá|Necesitás|Presentate|Podés)\b/)
  })

  it('todas las claves que piden la página, sus componentes y el límite de error existen en es', () => {
    const files = ['app/[locale]/titulos/page.tsx', 'app/[locale]/titulos/error.tsx', 'components/titulos/TitulosHero.tsx', 'components/titulos/TiposDocumentos.tsx', 'components/titulos/PasosProcedimiento.tsx']
    const used = new Set<string>()
    for (const f of files) for (const m of read(f).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    expect(used.size).toBeGreaterThan(15)
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
