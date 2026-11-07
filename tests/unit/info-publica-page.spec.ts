// INST-01 (T2): /informacion-publica — mapeo, consulta con estados, render por estado, errores y mensajes
// (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1, §2.5, §2.6 y §3; tarea odd/tasks/transparencia-institucional-cms.md, S1, S5-S8).
// Amenazas: (1) contenido institucional escrito en el código; (2) un enlace del CMS con `javascript:`, `http:` o un
// host ajeno llevado a un `href`; (3) un estado de error mudo o resuelto con un modal (patrón SweetAlert2); (4) filtrar
// el mensaje o el stack de un error al visitante; (5) claves de mensajes faltantes en alguna lengua.
// Límite: render estático en entorno node; el aspecto visual, el foco y el móvil se verifican en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n/server', () => ({
  getT: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}::${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(';')}` : key,
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const getInformacionPublica = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/informacionPublica', () => ({ getInformacionPublica }))
const cmsFetch = vi.hoisted(() => vi.fn())

import InformacionPublicaPage, { generateMetadata } from '../../app/[locale]/informacion-publica/page'
import InformacionPublicaError from '../../app/[locale]/informacion-publica/error'
import { mapInformacionPublica, safeInfoHref, INFO_PUBLICA_HOSTS } from '../../lib/cms/informacionPublica'
import { INFO_PUBLICA_HOSTS as CMS_HOSTS } from '../../apps/cms/src/utilities/validators'
import { INFORMACION_PUBLICA_SEED } from '../../scripts/seed-institucional.mjs'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

/** Documento tal como lo devuelve el CMS. */
function raw(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    titulo: ' Acceso desde el CMS ',
    descripcion: 'Descripción desde el CMS.',
    leyReferencia: 'Ley N° 5282/2014',
    cita: { texto: 'Texto de la ley.', fuente: 'Art. 12' },
    vias: [
      { id: 'a', slug: 'online', etiqueta: 'Digital', titulo: 'Solicitud online', descripcion: 'Por internet.', destacada: true, accion: { texto: 'Solicitar', url: 'https://informacionpublica.paraguay.gov.py/#!/' } },
      { id: 'b', slug: 'presencial', etiqueta: 'Presencial', titulo: 'En persona', descripcion: 'En la oficina.', destacada: false, accion: { texto: 'Contacto', url: '/contacto' } },
    ],
    datosRequeridos: [{ texto: 'Nombre completo' }, { texto: 'Correo electrónico' }],
    portalOficial: { titulo: 'Portal del Gobierno', descripcion: 'Plataforma oficial.', url: 'https://informacionpublica.paraguay.gov.py/#!/' },
    correo: 'oficina@unc.edu.py',
    ...over,
  }
}

describe('INST-01 mapeo de información pública', () => {
  it('un documento completo produce datos recortados y ordenados', () => {
    const d = mapInformacionPublica(raw())!
    expect(d.titulo).toBe('Acceso desde el CMS')
    expect(d.vias.map((v) => v.slug)).toEqual(['online', 'presencial'])
    expect(d.vias[0]).toMatchObject({ destacada: true, accion: { href: 'https://informacionpublica.paraguay.gov.py/#!/', externo: true } })
    expect(d.vias[1].accion).toEqual({ texto: 'Contacto', href: '/contacto', externo: false })
    expect(d.datosRequeridos).toEqual(['Nombre completo', 'Correo electrónico'])
    expect(d.cita).toEqual({ texto: 'Texto de la ley.', fuente: 'Art. 12' })
    expect(d.portalOficial).toMatchObject({ titulo: 'Portal del Gobierno' })
  })

  it('devuelve null (sin contenido publicable) si falta lo esencial', () => {
    expect(mapInformacionPublica({})).toBeNull()
    expect(mapInformacionPublica(raw({ vias: [] }))).toBeNull()
    expect(mapInformacionPublica(raw({ titulo: '  ' }))).toBeNull()
    expect(mapInformacionPublica(raw({ correo: 'no-es-un-correo' }))).toBeNull()
    expect(mapInformacionPublica(raw({ leyReferencia: '' }))).toBeNull()
  })

  it.each(['javascript:alert(1)', 'http://informacionpublica.paraguay.gov.py/', '//evil.example/x', 'https://evil.example/', 'https://informacionpublica.paraguay.gov.py.evil.example/', 'data:text/html,x'])(
    'un enlace no permitido (%s) deja la vía sin botón, nunca con ese enlace',
    (bad) => {
      expect(safeInfoHref(bad)).toBeNull()
      const d = mapInformacionPublica(raw({ vias: [{ slug: 'x', etiqueta: 'e', titulo: 't', descripcion: 'd', accion: { texto: 'Ir', url: bad } }] }))!
      expect(d.vias[0].accion).toBeNull()
    },
  )

  it('el portal oficial exige enlace externo permitido; si no, se omite', () => {
    expect(mapInformacionPublica(raw({ portalOficial: { titulo: 'P', url: '/interno' } }))!.portalOficial).toBeNull()
    expect(mapInformacionPublica(raw({ portalOficial: { titulo: 'P', url: 'https://evil.example/' } }))!.portalOficial).toBeNull()
  })

  it('la lista de hosts del portal coincide con la del CMS', () => {
    expect([...INFO_PUBLICA_HOSTS]).toEqual([...CMS_HOSTS])
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
    const mod = await vi.importActual<typeof import('../../lib/cms/queries/informacionPublica')>('../../lib/cms/queries/informacionPublica')
    return mod.getInformacionPublica
  }

  it('ok / empty / unavailable, sin lanzar y sin datos de demostración', async () => {
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
    // El registro lleva el nombre del error, nunca su mensaje (podría llevar credenciales).
    expect(spy.mock.calls.flat().join(' ')).toMatch(/\[INFO-PUBLICA\]/)
    expect(spy.mock.calls.flat().join(' ')).not.toContain('clave-secreta')
  })

  it('pide el global con su etiqueta de revalidación', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const get = await query()
    cmsFetch.mockResolvedValue(raw())
    await get()
    const [endpoint, options] = cmsFetch.mock.calls[0] as [string, { tags?: string[]; next?: { revalidate?: number } }]
    expect(endpoint).toMatch(/^\/globals\/informacion-publica/)
    expect(options.tags).toContain('informacion-publica')
    expect(options.next?.revalidate).toBeGreaterThan(0)
  })
})

describe('INST-01 página /informacion-publica', () => {
  const render = async (locale = 'es') => renderToStaticMarkup(await InformacionPublicaPage({ params: Promise.resolve({ locale }) }))

  it('ok: título y vías del CMS, un solo h1, índice de salto y enlaces seguros', async () => {
    getInformacionPublica.mockResolvedValue({ status: 'ok', data: mapInformacionPublica(raw()) })
    const html = await render()
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>Acceso desde el CMS<\/h1>/)
    for (const slug of ['online', 'presencial']) {
      expect(html).toContain(`id="via-${slug}"`)
      expect(html).toContain(`href="#via-${slug}"`)
    }
    expect(html).toContain('vias.recommended') // rótulo fijo de la vía recomendada
    expect(html).toContain('href="mailto:oficina@unc.edu.py"')
    expect(html).toContain('Nombre completo')
    expect(html).toMatch(/rel="noopener noreferrer"/)
    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).not.toMatch(/slate-950|role="(alertdialog|dialog)"|aria-modal/)
  })

  it('las rutas internas llevan el prefijo del idioma', async () => {
    getInformacionPublica.mockResolvedValue({ status: 'ok', data: mapInformacionPublica(raw()) })
    expect(await render('en')).toContain('href="/en/contacto"')
    expect(await render('es')).toContain('href="/contacto"')
  })

  it('empty: aviso neutro con salida a contacto y sin contenido de demostración', async () => {
    getInformacionPublica.mockResolvedValue({ status: 'empty' })
    const html = await render()
    expect(html).toContain('role="status"')
    expect(html).toContain('states.empty')
    expect(html).not.toContain('states.retry')
    expect(html).toContain('href="/contacto"')
    expect(html).not.toContain('secgral@unc.edu.py')
  })

  it('unavailable: aviso en línea con «Intentar de nuevo» y «Contacto», sin modal', async () => {
    getInformacionPublica.mockResolvedValue({ status: 'unavailable' })
    const html = await render()
    expect(html).toContain('states.unavailable')
    expect(html).toContain('states.retry')
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|<dialog|aria-modal/)
  })

  it('metadatos: con contenido, los del CMS; sin él, los de los mensajes', async () => {
    getInformacionPublica.mockResolvedValue({ status: 'ok', data: mapInformacionPublica(raw()) })
    expect((await generateMetadata({ params: Promise.resolve({ locale: 'es' }) })).title).toBe('Acceso desde el CMS | UNC')
    getInformacionPublica.mockResolvedValue({ status: 'empty' })
    expect((await generateMetadata({ params: Promise.resolve({ locale: 'es' }) })).title).toBe('meta.title')
  })
})

describe('INST-01 límite de error de ruta', () => {
  const secret = Object.assign(new Error('SECRETO: postgres://admin:clave@db/unc falló'), { stack: 'at consulta (/app/lib/db.ts:10)', digest: 'abc123' })
  const html = renderToStaticMarkup(createElement(InformacionPublicaError, { error: secret, reset: () => {} }))

  it('muestra título, explicación y dos salidas, sin mensaje ni stack: solo la referencia', () => {
    expect(html).toMatch(/role="alert"/)
    expect(html).toContain('error.title')
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>[\s\S]*error\.retry/)
    expect(html).toMatch(/<a[^>]*href="\/contacto"/)
    expect(html).not.toContain('SECRETO')
    expect(html).not.toContain('/app/lib/db.ts')
    expect(html).toContain('error.reference::digest=abc123')
    expect(html).not.toMatch(/role="(alertdialog|dialog)"|<dialog|aria-modal/)
  })

  it('reporta la excepción a Sentry y no usa estilos en línea', () => {
    expect(read('components/pages/RouteError.tsx')).toMatch(/Sentry\.captureException\(error\)/)
    expect(read('components/pages/RouteError.tsx')).not.toMatch(/style=\{\{/)
  })
})

describe('INST-01 sin datos fijos en el código', () => {
  it('la página y sus componentes no contienen lo que ahora vive en el CMS', () => {
    const files = ['app/[locale]/informacion-publica/page.tsx', 'components/informacion-publica/ViasSolicitud.tsx', 'components/informacion-publica/DatosRequeridos.tsx', 'lib/cms/informacionPublica.ts', 'lib/cms/queries/informacionPublica.ts']
    for (const f of files) {
      const src = read(f)
      expect(src, f).not.toMatch(/secgral@unc\.edu\.py/)
      expect(src, f).not.toMatch(/CHANNELS|REQUIRED_DATA/)
      expect(src, f).not.toMatch(/Nombres y apellidos completos|Portal Unificado/)
      expect(src, f).not.toMatch(/\b(Elegí|Accedé|podés|Completá|Enviá|Acudí)\b/) // sin voseo
    }
  })

  it('la semilla coincide con lo que el mapeo acepta (3 vías, 7 datos, correo válido)', () => {
    const d = mapInformacionPublica(INFORMACION_PUBLICA_SEED)!
    expect(d.vias).toHaveLength(3)
    expect(d.vias.every((v) => v.accion !== null)).toBe(true)
    expect(d.datosRequeridos).toHaveLength(7)
    expect(d.correo).toBe('secgral@unc.edu.py')
    expect(d.portalOficial).not.toBeNull()
  })
})

describe('INST-01 mensajes en los cuatro idiomas', () => {
  type Json = { [k: string]: string | Json }
  const flat = (o: Json, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
  const load = (loc: string) => Object.fromEntries(flat(JSON.parse(read(`messages/${loc}/pages.informacion-publica.json`)) as Json))
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

  it('es: redacción neutra, sin voseo; en y pt-BR están traducidos', () => {
    expect(Object.values(es).join(' ')).not.toMatch(/\b(Elegí|Accedé|podés|Completá|Enviá|Acudí|Tené)\b/)
    for (const loc of ['en', 'pt-BR']) {
      const other = load(loc)
      const same = Object.keys(es).filter((k) => other[k] === es[k])
      expect(same, `iguales a es: ${same.join(', ')}`).toEqual([])
    }
  })

  it('todas las claves que piden la página, sus componentes y el límite de error existen en es', () => {
    const files = ['app/[locale]/informacion-publica/page.tsx', 'components/pages/RouteError.tsx']
    const used = new Set<string>()
    for (const f of files) for (const m of read(f).matchAll(/\bt\(\s*(?:result\.status === 'unavailable' \? )?'([^']+)'/g)) used.add(m[1])
    for (const k of ['states.unavailable', 'states.empty']) used.add(k)
    expect(used.size).toBeGreaterThan(15)
    const missing = [...used].filter((k) => !(k in es))
    expect(missing, `claves sin definir: ${missing.join(', ')}`).toEqual([])
  })
})
