// CNV-01: consulta del portal para /convenios (spec docs/specs/portal/CONVENIOS.md §2 y escenarios 6, 9).
// Amenazas: (1) pedir filas inactivas, de otro tipo o campos de más; (2) consulta sin cota; (3) que una caída del
// CMS dé 500 o publique convenios inventados (demo). Límite: se simula `fetch`; no se ejecuta Payload.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getConveniosPage } from '@/lib/cms/queries/convenios'

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
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  year: 2023,
  title: 'Convenio de Cooperación',
  parties: 'UNC y MEC',
  objective: 'Cooperar',
  categoria: 'institucional',
  orden: 1,
  ...over,
})

const SELECT = ['title', 'year', 'parties', 'objective', 'signedMonth', 'duration', 'driveUrl', 'categoria', 'nota', 'orden']

describe('CNV-01: getConveniosPage', () => {
  it('pide solo activos del tipo pedido, con cota, selección mínima y etiqueta convenios', async () => {
    const calls = stubFetch({ docs: [row()] })
    await getConveniosPage('nacional')
    expect(calls).toHaveLength(1)
    const { url, init } = calls[0]
    expect(url.pathname).toBe('/api/convenios')
    expect(url.searchParams.get('where[active][equals]')).toBe('true')
    expect(url.searchParams.get('where[type][equals]')).toBe('nacional')
    expect(Number(url.searchParams.get('limit'))).toBe(500)
    expect(url.searchParams.get('depth')).toBe('0')
    for (const f of SELECT) expect(url.searchParams.get(`select[${f}]`)).toBe('true')
    expect(url.searchParams.get('select[active]')).toBeNull()
    const next = (init as RequestInit & { next?: { tags?: string[]; revalidate?: number } })?.next
    expect(next?.tags).toContain('convenios')
    expect(next?.revalidate).toBe(3600)
  })

  it('internacional pide el otro tipo', async () => {
    const calls = stubFetch({ docs: [] })
    await getConveniosPage('internacional')
    expect(calls[0].url.searchParams.get('where[type][equals]')).toBe('internacional')
  })

  it('ok: agrupa por año y devuelve conteos y período', async () => {
    stubFetch({ docs: [row(), row({ id: 2, year: 2014, categoria: 'beneficios' })] })
    const r = await getConveniosPage('nacional')
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.total).toBe(2)
    expect(r.groups.map((g) => g.year)).toEqual([2023, 2014])
    expect(r.counts).toEqual({ institucional: 1, beneficios: 1 })
    expect(r.span).toEqual({ from: 2014, to: 2023 })
  })

  it('empty: CMS sin filas (y en desarrollo tampoco hay demo)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    stubFetch({ docs: [] })
    expect(await getConveniosPage('nacional')).toEqual({ status: 'empty' })
  })

  it.each(['production', 'development'])('unavailable en %s: 5xx, forma inesperada o red caída; nunca lanza ni inventa', async (envName) => {
    vi.stubEnv('NODE_ENV', envName)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubFetch({ error: 'x' }, 503)
    expect(await getConveniosPage('nacional')).toEqual({ status: 'unavailable' })
    stubFetch({ nope: true })
    expect(await getConveniosPage('nacional')).toEqual({ status: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await getConveniosPage('nacional')).toEqual({ status: 'unavailable' })
  })

  it('el módulo ya no contiene datos de demostración', () => {
    const src = readFileSync(resolve(process.cwd(), 'lib/cms/queries/convenios.ts'), 'utf8')
    expect(src).not.toMatch(/DEMO_|demoFallbackAllowed|REEMPLAZAR_CON_ID_REAL/)
  })
})
