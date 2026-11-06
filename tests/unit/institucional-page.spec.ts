// INST-01 (T3): hub /institucional — mapeo con lista cerrada de destinos, consulta con estados, render por estado,
// errores y mensajes (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.2, §2.5 y §3; tarea
// odd/tasks/transparencia-institucional-cms.md, S2, S5-S8).
// Amenazas: (1) contenido institucional escrito en el código; (2) una tarjeta que lleve a una ruta inexistente o a un
// sitio ajeno (el destino viene de una lista cerrada y se traduce a ruta real); (3) un estado de error mudo o resuelto
// con un modal; (4) claves de mensajes faltantes en alguna lengua.
// Límite: render estático en entorno node; el aspecto visual, el foco y el móvil se verifican en el navegador.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
// El global del CMS se importa solo para comparar su lista de destinos; se simulan sus dependencias de servidor.
vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => '10.0.0.1' }))
const getInstitucional = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/institucional', () => ({ getInstitucional }))
const cmsFetch = vi.hoisted(() => vi.fn())

import InstitucionalPage, { generateMetadata } from '../../app/[locale]/institucional/page'
import InstitucionalError from '../../app/[locale]/institucional/error'
import { mapInstitucional, DESTINO_RUTA } from '../../lib/cms/institucional'
import { DESTINOS } from '../../apps/cms/src/globals/Institucional'
import { INSTITUCIONAL_SEED } from '../../scripts/seed-institucional.mjs'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

function raw(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    titulo: ' Institución desde el CMS ',
    descripcion: 'Descripción desde el CMS.',
    sobre: { titulo: 'Quiénes somos (CMS)', texto: 'Texto sobre la universidad.', datos: [{ valor: '2007', etiqueta: 'Fundación' }, { valor: '', etiqueta: 'Vacío' }] },
    secciones: [
      { id: 'a', destino: 'historia', etiqueta: 'Trayectoria', titulo: 'Historia', descripcion: 'Desde 2007.', accion: 'Ver historia' },
      { id: 'b', destino: 'organigrama', etiqueta: 'Estructura', titulo: 'Organigrama', descripcion: 'La estructura.', accion: 'Ver organigrama' },
    ],
    valores: [{ titulo: 'Inclusión', descripcion: 'Igualdad de oportunidades.' }, { titulo: '', descripcion: 'Sin título' }],
    ...over,
  }
}

describe('INST-01 mapeo del hub institucional', () => {
  it('un documento completo produce datos recortados, rutas reales y descarta filas vacías', () => {
    const d = mapInstitucional(raw())!
    expect(d.titulo).toBe('Institución desde el CMS')
    expect(d.secciones.map((s) => s.ruta)).toEqual(['/historia', '/organigrama'])
    expect(d.sobre.datos).toEqual([{ valor: '2007', etiqueta: 'Fundación' }]) // la fila con valor vacío se descarta
    expect(d.valores).toEqual([{ titulo: 'Inclusión', descripcion: 'Igualdad de oportunidades.' }])
  })

  it('devuelve null (sin contenido publicable) si falta lo esencial', () => {
    expect(mapInstitucional({})).toBeNull()
    expect(mapInstitucional(raw({ secciones: [] }))).toBeNull()
    expect(mapInstitucional(raw({ titulo: ' ' }))).toBeNull()
    expect(mapInstitucional(raw({ sobre: { titulo: '', texto: '' } }))).toBeNull()
  })

  it.each(['https://evil.example/', 'javascript:alert(1)', '/institucional/historia', '__proto__', 'constructor', ''])(
    'un destino fuera de la lista cerrada (%s) descarta la sección y nunca se usa como URL',
    (bad) => {
      const d = mapInstitucional(raw({ secciones: [{ destino: bad, etiqueta: 'e', titulo: 't', descripcion: 'd', accion: 'a' }, { destino: 'historia', etiqueta: 'e', titulo: 't', descripcion: 'd', accion: 'a' }] }))!
      expect(d.secciones.map((s) => s.destino)).toEqual(['historia'])
    },
  )

  it('la lista de destinos del portal coincide con la del CMS y cada ruta existe en app/[locale]', () => {
    expect(Object.keys(DESTINO_RUTA).sort()).toEqual([...DESTINOS].sort())
    for (const ruta of Object.values(DESTINO_RUTA)) {
      const dir = resolve(root, 'app/[locale]', ruta.replace(/^\//, ''))
      expect(existsSync(dir), `la ruta ${ruta} no existe`).toBe(true)
    }
  })
})

describe('INST-01 consulta con estados', () => {
  beforeEach(() => {
    vi.resetModules()
    cmsFetch.mockReset()
    vi.doMock('../../lib/cms/client', () => ({ cmsFetch }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('../../lib/cms/client')
  })

  async function query() {
    const mod = await vi.importActual<typeof import('../../lib/cms/queries/institucional')>('../../lib/cms/queries/institucional')
    return mod.getInstitucional
  }

  it('ok / empty / unavailable, sin lanzar y sin secretos en el registro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const get = await query()
    cmsFetch.mockResolvedValue(raw())
    expect((await get()).status).toBe('ok')
    cmsFetch.mockResolvedValue({})
    expect(await get()).toEqual({ status: 'empty' })
    cmsFetch.mockRejectedValue(new Error('ECONNREFUSED http://usuario:clave-secreta@cms:3002'))
    expect(await get()).toEqual({ status: 'unavailable' })
    for (const weird of [null, undefined, 'texto', 42, []]) {
      cmsFetch.mockResolvedValue(weird)
      expect(await get(), String(weird)).toEqual({ status: 'unavailable' })
    }
    expect(spy.mock.calls.flat().join(' ')).toMatch(/\[INSTITUCIONAL\]/)
    expect(spy.mock.calls.flat().join(' ')).not.toContain('clave-secreta')
  })

  it('pide el global con su etiqueta de revalidación', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const get = await query()
    cmsFetch.mockResolvedValue(raw())
    await get()
    const [endpoint, options] = cmsFetch.mock.calls[0] as [string, { tags?: string[] }]
    expect(endpoint).toMatch(/^\/globals\/institucional/)
    expect(options.tags).toContain('institucional')
  })
})

describe('INST-01 página /institucional', () => {
  const render = async (locale = 'es') => renderToStaticMarkup(await InstitucionalPage({ params: Promise.resolve({ locale }) }))

  it('ok: título, secciones, datos y valores del CMS; un solo h1; enlaces a rutas reales con idioma', async () => {
    getInstitucional.mockResolvedValue({ status: 'ok', data: mapInstitucional(raw()) })
    const html = await render('en')
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>Institución desde el CMS<\/h1>/)
    expect(html).toContain('href="/en/historia"')
    expect(html).toContain('href="/en/organigrama"')
    expect(html).toContain('Quiénes somos (CMS)')
    expect(html).toContain('<dt')
    expect(html).toContain('Igualdad de oportunidades.')
    expect(html).not.toContain('/institucional/historia') // la ruta inexistente de la versión anterior
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|aria-modal/)
  })

  it('en español no lleva prefijo de idioma', async () => {
    getInstitucional.mockResolvedValue({ status: 'ok', data: mapInstitucional(raw()) })
    expect(await render('es')).toContain('href="/historia"')
  })

  it('empty: aviso neutro con salida a contacto y sin contenido de demostración', async () => {
    getInstitucional.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toContain('role="status"')
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
    expect(html).not.toContain('2007')
  })

  it('unavailable: aviso en línea con «Intentar de nuevo» y «Contacto», sin modal', async () => {
    getInstitucional.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|<dialog|aria-modal/)
  })

  it('metadatos: con contenido, los del CMS; sin él, los de los mensajes', async () => {
    getInstitucional.mockResolvedValue({ status: 'ok', data: mapInstitucional(raw()) })
    expect((await generateMetadata({ params: Promise.resolve({ locale: 'es' }) })).title).toBe('Institución desde el CMS | UNC')
    getInstitucional.mockResolvedValue({ status: 'empty' })
    expect((await generateMetadata({ params: Promise.resolve({ locale: 'es' }) })).title).toBe('meta.title')
  })
})

describe('INST-01 límite de error y datos fijos', () => {
  it('el límite de error muestra una referencia y no el mensaje del error', () => {
    const secret = Object.assign(new Error('SECRETO interno'), { digest: 'xyz789' })
    const html = renderToStaticMarkup(createElement(InstitucionalError, { error: secret, reset: () => {} }))
    expect(html).toMatch(/role="alert"/)
    expect(html).not.toContain('SECRETO')
    expect(html).toContain('error.title')
  })

  it('la página y sus módulos no contienen lo que ahora vive en el CMS', () => {
    for (const f of ['app/[locale]/institucional/page.tsx', 'components/institutional/HubSecciones.tsx', 'lib/cms/institucional.ts', 'lib/cms/queries/institucional.ts']) {
      const src = read(f)
      expect(src, f).not.toMatch(/Ley N° 3\.201|Excelencia académica|norte del Paraguay|Compromiso social/)
      expect(src, f).not.toMatch(/\/institucional\/(historia|mision|autoridades|organigrama)/)
      expect(src, f).not.toMatch(/\b(Conocé|Explorá|Mirá)\b/) // sin voseo
    }
  })

  it('la semilla coincide con lo que el mapeo acepta (4 secciones con rutas reales, 3 datos y 4 valores)', () => {
    const d = mapInstitucional(INSTITUCIONAL_SEED)!
    expect(d.secciones.map((s) => s.ruta)).toEqual(['/historia', '/mision-vision-y-valores', '/autoridades', '/organigrama'])
    expect(d.sobre.datos).toHaveLength(3)
    expect(d.valores).toHaveLength(4)
  })
})

describe('INST-01 mensajes en los cuatro idiomas', () => {
  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.institucional.json`)) as Json))
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

  it('es: sin voseo; en y pt-BR están traducidos', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Conocé|Explorá|Mirá|podés|Tené)\b/)
    for (const loc of ['en', 'pt-BR']) {
      const other = load(loc)
      const same = Object.keys(es).filter((k) => other[k] === es[k])
      expect(same, `iguales a es: ${same.join(', ')}`).toEqual([])
    }
  })

  it('las claves que pide la página existen en es', () => {
    const used = new Set<string>(['states.unavailable', 'states.empty'])
    for (const m of read('app/[locale]/institucional/page.tsx').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
