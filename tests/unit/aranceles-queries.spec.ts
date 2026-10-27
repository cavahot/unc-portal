// ARR-01: consulta del portal para /aranceles-rectorado (spec docs/specs/portal/ARANCELES-RECTORADO.md §2.1,
// escenarios 6 y 7). Amenazas: (1) pedir filas no publicadas o campos de más; (2) consulta sin cota; (3) que un CMS
// vacío o caído muestre montos escritos en el código (lista de precios falsa) o rompa la página con un 500.
// Límite: se simula `fetch`; no se ejecuta Payload.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getArancelesRectorado } from '@/lib/cms/queries/aranceles'

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
  concepto: 'Constancias Varias',
  monto: 50000,
  grupo: 'venta',
  orden: 1,
  updatedAt: '2026-10-24T10:00:00.000Z',
  ...over,
})

describe('ARR-01: getArancelesRectorado', () => {
  it('pide solo publicados, con cota, selección mínima, orden y etiqueta aranceles-rectorado', async () => {
    const calls = stubFetch({ docs: [row()] })
    await getArancelesRectorado()
    expect(calls).toHaveLength(1)
    const { url, init } = calls[0]
    expect(url.pathname).toBe('/api/aranceles-rectorado')
    expect(url.searchParams.get('where[active][equals]')).toBe('true')
    expect(url.searchParams.get('where[activo][equals]')).toBeNull()
    expect(Number(url.searchParams.get('limit'))).toBe(200)
    expect(url.searchParams.get('depth')).toBe('0')
    for (const f of ['concepto', 'monto', 'grupo', 'orden', 'updatedAt']) {
      expect(url.searchParams.get(`select[${f}]`)).toBe('true')
    }
    expect(url.searchParams.get('select[active]')).toBeNull()
    const next = (init as RequestInit & { next?: { tags?: string[] } })?.next
    expect(next?.tags).toContain('aranceles-rectorado')
  })

  it('ok: agrupa, cuenta y devuelve la última actualización', async () => {
    stubFetch({
      docs: [
        row({ id: 1 }),
        row({ id: 2, grupo: 'multas', concepto: 'Multas por Incumplimiento de Contrato', monto: 60000, updatedAt: '2026-10-25T09:00:00.000Z' }),
        row({ id: 3, monto: -5 }),
      ],
    })
    const r = await getArancelesRectorado()
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.total).toBe(2)
    expect(r.groups.map((g) => g.grupo)).toEqual(['multas', 'venta'])
    expect(r.updatedAt).toBe('2026-10-25T09:00:00.000Z')
  })

  it('empty: CMS sin filas -> sin montos inventados', async () => {
    stubFetch({ docs: [] })
    expect(await getArancelesRectorado()).toEqual({ status: 'empty' })
  })

  it('empty: solo filas inválidas', async () => {
    stubFetch({ docs: [row({ grupo: 'otros' })] })
    expect(await getArancelesRectorado()).toEqual({ status: 'empty' })
  })

  it('unavailable: error HTTP, red caída o forma inesperada; nunca lanza', async () => {
    stubFetch({ errors: [{ message: 'x' }] }, 500)
    expect(await getArancelesRectorado()).toEqual({ status: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    expect(await getArancelesRectorado()).toEqual({ status: 'unavailable' })
    stubFetch({ docs: 'no-es-lista' })
    expect(await getArancelesRectorado()).toEqual({ status: 'unavailable' })
  })

  it('el código del portal no contiene la lista de precios de respaldo', () => {
    const src = readFileSync(resolve(process.cwd(), 'lib/cms/queries/aranceles.ts'), 'utf8')
    expect(src).not.toMatch(/FALLBACK_ARANCELES/)
    expect(src).not.toMatch(/\b(10000|50000|100000|2500000)\b/)
    const page = readFileSync(resolve(process.cwd(), 'app/[locale]/aranceles-rectorado/page.tsx'), 'utf8')
    expect(page).not.toMatch(/\b(10000|50000|2500000)\b/)
  })
})
