// MLG-01: consulta del portal para /marco-legal (spec docs/specs/portal/MARCO-LEGAL.md §2.1 y escenarios 6, 7, 9).
// Amenazas: (1) pedir filas inactivas o campos de más; (2) consulta sin cota; (3) que una caída del CMS rompa
// la página (500) o la llene de documentos inventados. Límite: se simula `fetch`; no se ejecuta Payload.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLegalDocumentSections } from '@/lib/cms/queries/marcoLegal'

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

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Estatuto UNC',
  category: 'estatuto',
  externalUrl: 'https://drive.google.com/file/d/abc/view',
  order: 1,
  estado: 'vigente',
  ...over,
})

describe('MLG-01: getLegalDocumentSections', () => {
  it('pide solo activos, con cota, selección mínima, populate de media y etiqueta marco-legal', async () => {
    const calls = stubFetch({ docs: [row()] })
    await getLegalDocumentSections()
    expect(calls).toHaveLength(1)
    const { url, init } = calls[0]
    expect(url.pathname).toBe('/api/marco-legal')
    expect(url.searchParams.get('where[active][equals]')).toBe('true')
    expect(Number(url.searchParams.get('limit'))).toBeLessThanOrEqual(200)
    expect(url.searchParams.get('depth')).toBe('1')
    for (const f of ['title', 'category', 'description', 'nota', 'file', 'externalUrl', 'order', 'estado', 'fechaDocumento']) {
      expect(url.searchParams.get(`select[${f}]`)).toBe('true')
    }
    for (const f of ['url', 'filename', 'mimeType']) {
      expect(url.searchParams.get(`populate[media][${f}]`)).toBe('true')
    }
    expect(url.searchParams.get('select[active]')).toBeNull()
    const next = (init as RequestInit & { next?: { tags?: string[] } })?.next
    expect(next?.tags).toContain('marco-legal')
  })

  it('ok: agrupa y cuenta los documentos válidos', async () => {
    stubFetch({
      docs: [
        row({ id: 1 }),
        row({ id: 2, title: 'Código de Ética UNC', category: 'codigos' }),
        row({ id: 3, title: 'Malo', externalUrl: 'https://evil.example/x.pdf' }),
      ],
    })
    const r = await getLegalDocumentSections()
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.total).toBe(2)
    expect(r.groups.map((g) => g.category)).toEqual(['estatuto', 'codigos'])
  })

  it('empty: CMS sin filas válidas (no inventa documentos)', async () => {
    stubFetch({ docs: [] })
    expect(await getLegalDocumentSections()).toEqual({ status: 'empty' })
    stubFetch({ docs: [row({ externalUrl: 'javascript:alert(1)' })] })
    expect(await getLegalDocumentSections()).toEqual({ status: 'empty' })
  })

  it('unavailable: error HTTP, forma inesperada o red caída; nunca lanza', async () => {
    stubFetch({ error: 'x' }, 500)
    expect(await getLegalDocumentSections()).toEqual({ status: 'unavailable' })
    stubFetch({ nope: true })
    expect(await getLegalDocumentSections()).toEqual({ status: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await getLegalDocumentSections()).toEqual({ status: 'unavailable' })
  })
})
