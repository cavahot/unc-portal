// LT-01: consulta del portal para la línea de tiempo (spec docs/specs/portal/LINEA-TIEMPO.md §2.7, escenarios 1, 6, 7).
// Amenazas: (1) pedir filas no publicadas o campos de más; (2) consulta sin cota; (3) que una caída del CMS rompa
// /historia (500) o muestre hitos escritos en el código. Límite: se simula `fetch`; no se ejecuta Payload.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTimeline } from '@/lib/cms/queries/lineaTiempo'

function stubFetch(body: unknown, status = 200) {
  const calls: { url: URL; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push({ url: new URL(href), init })
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const row = (over: Record<string, unknown> = {}) => ({ id: 1, anio: 2007, titulo: 'Creación', descripcion: 'Texto.', orden: 1, ...over })

describe('LT-01: getTimeline', () => {
  it('pide solo publicados, con cota, selección mínima, populate de media y etiqueta linea-tiempo', async () => {
    const calls = stubFetch({ docs: [row()] })
    await getTimeline('es')
    expect(calls).toHaveLength(1)
    const { url, init } = calls[0]
    expect(url.pathname).toBe('/api/linea-tiempo')
    expect(url.searchParams.get('where[active][equals]')).toBe('true')
    expect(Number(url.searchParams.get('limit'))).toBeLessThanOrEqual(100)
    expect(url.searchParams.get('depth')).toBe('1')
    for (const f of ['anio', 'etiquetaFecha', 'titulo', 'descripcion', 'imagen', 'enlace', 'orden', 'traducciones']) {
      expect(url.searchParams.get(`select[${f}]`)).toBe('true')
    }
    for (const f of ['url', 'filename', 'alt', 'blurDataURL', 'width', 'height']) {
      expect(url.searchParams.get(`populate[media][${f}]`)).toBe('true')
    }
    expect(url.searchParams.get('select[active]')).toBeNull()
    const next = (init as RequestInit & { next?: { tags?: string[] } })?.next
    expect(next?.tags).toEqual(['linea-tiempo'])
  })

  it('ok: hitos ordenados y traducidos', async () => {
    stubFetch({ docs: [row({ id: 2, anio: 2024 }), row({ id: 1, traducciones: { en: { titulo: 'Creation' } } })] })
    const r = await getTimeline('en')
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.milestones.map((m) => m.anio)).toEqual([2007, 2024])
    expect(r.milestones[0].titulo).toBe('Creation')
  })

  it('empty: CMS sin hitos publicables (nunca hitos escritos en el código)', async () => {
    stubFetch({ docs: [] })
    expect(await getTimeline('es')).toEqual({ status: 'empty' })
    stubFetch({ docs: [row({ titulo: '' })] })
    expect(await getTimeline('es')).toEqual({ status: 'empty' })
  })

  it('unavailable: error HTTP, forma inesperada o red caída; nunca lanza', async () => {
    stubFetch({ error: 'x' }, 500)
    expect(await getTimeline('es')).toEqual({ status: 'unavailable' })
    stubFetch({ nope: true })
    expect(await getTimeline('es')).toEqual({ status: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await getTimeline('es')).toEqual({ status: 'unavailable' })
  })
})
