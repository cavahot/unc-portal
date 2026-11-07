// INST-08 (T4): /privacidad y /accesibilidad en el sistema visual del portal, con el texto del CMS (spec
// docs/specs/portal/LEGALES.md §2.8).
// Amenazas: (1) una caída del CMS mostrada como «sin contenido» o texto legal escrito en el código; (2) el estilo oscuro
// anterior, los emojis como icono o el voseo; (3) un texto en español mostrado en otro idioma sin avisarlo; (4) un enlace de
// correo sin forma válida o con esquema peligroso; (5) claves de mensajes faltantes; (6) filtrar el mensaje de un error.
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
const getPoliticaPrivacidad = vi.hoisted(() => vi.fn())
const getDeclaracionAccesibilidad = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/legales', () => ({ getPoliticaPrivacidad, getDeclaracionAccesibilidad }))

import PrivacidadPage from '../../app/[locale]/privacidad/page'
import PrivacidadError from '../../app/[locale]/privacidad/error'
import AccesibilidadPage from '../../app/[locale]/accesibilidad/page'
import AccesibilidadError from '../../app/[locale]/accesibilidad/error'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
/** Solo la lista de características: la cabecera también trae <ol> y <li> (migas). */
const caracteristicasHtml = (html: string) => html.match(/<ol aria-label="features\.listLabel"[\s\S]*?<\/ol>/)?.[0] ?? ''
const renderP = async (locale = 'es') => renderToStaticMarkup(await PrivacidadPage({ params: Promise.resolve({ locale }) }))
const renderA = async (locale = 'es') => renderToStaticMarkup(await AccesibilidadPage({ params: Promise.resolve({ locale }) }))

const politica = {
  actualizacion: '2026-08-01',
  secciones: [
    { titulo: 'Responsable del tratamiento', contenido: 'La UNC es responsable.' },
    { titulo: 'Datos que recopilamos', contenido: 'Primer párrafo.\n\nSegundo párrafo.' },
  ],
}
const accesibilidad = {
  descripcion: 'Compromiso con la accesibilidad.',
  caracteristicas: [
    { titulo: 'Texto ajustable', descripcion: 'Puede cambiar el tamaño.' },
    { titulo: 'Contraste', descripcion: 'Modos de contraste.' },
  ],
  correo: 'secgral@unc.edu.py',
}

describe('INST-08 /privacidad', () => {
  beforeEach(() => {
    getPoliticaPrivacidad.mockResolvedValue({ status: 'ok', data: politica, fallback: false })
  })

  it('un solo h1, cabecera compartida, fondo claro y sin el estilo oscuro anterior', async () => {
    const html = await renderP()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10/)
  })

  it('muestra cada sección con su título, separa los párrafos y formatea la fecha en el idioma', async () => {
    const html = await renderP('es')
    expect(html).toContain('Responsable del tratamiento')
    expect(html.match(/<h2 /g)).toHaveLength(2)
    expect(html).toContain('>Primer párrafo.<')
    expect(html).toContain('>Segundo párrafo.<')
    expect(html).toContain('updated::date=agosto de 2026')
    expect((await renderP('en')).includes('updated::date=August 2026')).toBe(true)
  })

  it('el índice de la cabecera enlaza a cada sección y cada sección tiene su ancla', async () => {
    const html = await renderP()
    expect(html).toContain('href="#seccion-1"')
    expect(html).toContain('href="#seccion-2"')
    expect(html).toContain('id="seccion-1"')
    expect(html).toContain('id="seccion-2"')
  })

  it('sin aviso de respaldo cuando el texto está en el idioma; con aviso si es el español de respaldo', async () => {
    expect(await renderP('en')).not.toContain('fallbackNotice')
    getPoliticaPrivacidad.mockResolvedValue({ status: 'ok', data: politica, fallback: true })
    const html = await renderP('en')
    expect(html).toContain('fallbackNotice')
    expect(html).toContain('role="note"')
  })

  it('con el CMS caído muestra «no disponible» con reintentar y no muestra texto legal', async () => {
    getPoliticaPrivacidad.mockResolvedValue({ status: 'unavailable' })
    const html = await renderP()
    expect(html).toMatch(/role="status"/)
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).not.toContain('Responsable del tratamiento')
  })

  it('sin contenido muestra «vacío» sin reintentar, y los enlaces llevan el prefijo del idioma', async () => {
    getPoliticaPrivacidad.mockResolvedValue({ status: 'empty' })
    let html = await renderP('pt-BR')
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
    expect(html).toContain('href="/pt-BR/contacto"')
    getPoliticaPrivacidad.mockResolvedValue({ status: 'unavailable' })
    html = await renderP('pt-BR')
    expect(html).toContain('href="/pt-BR/privacidad"')
  })

  it('el código de la página no trae texto legal escrito', () => {
    const code = strip(read('app/[locale]/privacidad/page.tsx'))
    expect(code).not.toMatch(/Responsable del tratamiento|Ley N°|MITIC|Datos que recopilamos|agosto de 2026/)
  })
})

describe('INST-08 /accesibilidad', () => {
  beforeEach(() => {
    getDeclaracionAccesibilidad.mockResolvedValue({ status: 'ok', data: accesibilidad, fallback: false })
  })

  it('un solo h1, cabecera compartida con la descripción del CMS, fondo claro y sin estilo oscuro ni emojis', async () => {
    const html = await renderA()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toContain('from-[#004700]')
    expect(html).toContain('Compromiso con la accesibilidad.')
    expect(html).not.toMatch(/slate-950|uppercase|tracking-widest|#5CFF5C|border-white\/10|🔤|🎨|🔗|🅰|⌨|📱/)
  })

  it('las características son una lista ordenada numerada con título y descripción', async () => {
    const html = await renderA()
    const lista = caracteristicasHtml(html)
    expect(lista.match(/<li /g)).toHaveLength(2)
    expect(html).toContain('>01<')
    expect(html).toContain('>02<')
    expect(html).toContain('Texto ajustable')
    expect(html).toContain('Modos de contraste.')
  })

  it('el correo del CMS se enlaza con mailto; sin correo válido no hay llamado de contacto', async () => {
    let html = await renderA()
    expect(html).toContain('href="mailto:secgral@unc.edu.py"')
    expect(html).toContain('cta.title')
    getDeclaracionAccesibilidad.mockResolvedValue({ status: 'ok', data: { ...accesibilidad, correo: undefined }, fallback: false })
    html = await renderA()
    expect(html).not.toContain('mailto:')
    expect(html).not.toContain('cta.title')
  })

  it('avisa del respaldo en español y muestra los estados vacío y no disponible', async () => {
    getDeclaracionAccesibilidad.mockResolvedValue({ status: 'ok', data: accesibilidad, fallback: true })
    expect(await renderA('en')).toContain('fallbackNotice')
    getDeclaracionAccesibilidad.mockResolvedValue({ status: 'unavailable' })
    let html = await renderA('en')
    expect(html).toContain('states.unavailable')
    expect(html).toContain('href="/en/accesibilidad"')
    expect(caracteristicasHtml(html)).toBe('')
    getDeclaracionAccesibilidad.mockResolvedValue({ status: 'empty' })
    html = await renderA()
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
  })

  it('el código de la página no trae el correo ni el texto escrito', () => {
    const code = strip(read('app/[locale]/accesibilidad/page.tsx'))
    expect(code).not.toMatch(/secgral@|unc\.edu\.py|Tamaño de texto|Modos de contraste|WCAG|MITIC/)
  })
})

describe('INST-08 error, esqueletos y mensajes', () => {
  it.each([
    ['privacidad', PrivacidadError],
    ['accesibilidad', AccesibilidadError],
  ])('%s: el límite de error no muestra el mensaje del error', (_n, Comp) => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'ref011' })
    const html = renderToStaticMarkup(createElement(Comp, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
  })

  it.each(['privacidad', 'accesibilidad'])('%s: el esqueleto de carga existe y no es oscuro', (n) => {
    expect(read(`app/[locale]/${n}/loading.tsx`)).not.toMatch(/slate-950|bg-white\/5/)
  })

  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string, n: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.${n}.json`)) as Json))

  describe.each(['privacidad', 'accesibilidad'])('mensajes de %s', (n) => {
    const es = load('es', n)

    it.each(['gn', 'en', 'pt-BR'])('%s: mismas claves que es y los mismos marcadores {…}', (loc) => {
      const other = load(loc, n)
      expect(Object.keys(other).sort()).toEqual(Object.keys(es).sort())
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      for (const [k, v] of Object.entries(other)) expect(ph(v), `${loc}:${k}`).toEqual(ph(es[k]))
    })

    it('es no usa voseo y no queda el contenido que pasó al CMS', () => {
      expect(Object.values(es).join(' ')).not.toMatch(/\b(Podés|podés|Usá|usá|encontrás|escribinos|Verificá|Consultá|Intentá)\b/)
      // La descripción de la cabecera de /privacidad es texto de interfaz; la de /accesibilidad viene del CMS.
      const fromCms = n === 'accesibilidad' ? /^hero\.label$|^hero\.description$|^features\.f\d/ : /^sections\.|^hero\.label$|^hero\.lastUpdated$/
      expect(Object.keys(es).filter((k) => fromCms.test(k))).toEqual([])
    })

    it('en y pt-BR traducen las claves de interfaz nuevas', () => {
      for (const loc of ['en', 'pt-BR']) for (const k of ['breadcrumb.nombre', 'states.unavailable', 'error.title', 'fallbackNotice']) expect(load(loc, n)[k], `${loc}:${k}`).not.toBe(es[k])
    })

    it('las claves que pide la página existen en es', () => {
      const used = new Set<string>(['meta.title', 'meta.description'])
      for (const m of strip(read(`app/[locale]/${n}/page.tsx`)).matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
      const missing = [...used].filter((k) => !(k in es))
      expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
    })
  })

  it('la frase de contacto de accesibilidad en español está en forma de «usted»', () => {
    expect(load('es', 'accesibilidad')['cta.description']).toBe('Si encuentra alguna barrera de accesibilidad en este portal, escríbanos a')
  })
})
