// TRANS-01/02: módulo y consultas del portal para /ley-5189 y /ley-5282 (specs docs/specs/portal/TRANSPARENCIA-LEYES.md
// §2.2 y TRANSPARENCIA-ITEMS.md §2.4). Amenazas: (1) pedir filas inactivas o sin cota; (2) que una caída del CMS
// parezca «sin documentos» o dé 500; (3) publicar datos inventados o una lista de categorías fija en código;
// (4) mostrar enlaces fuera de la allowlist; (5) claves de i18n faltantes en algún idioma; (6) href de CMS sin
// safeHref; (7) mostrar documentos de un ítem retirado.
// Límite: se simula `fetch`; no se ejecuta Payload ni se renderiza React.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLey5189Page } from '@/lib/cms/queries/ley5189'
import { getLey5282Page } from '@/lib/cms/queries/ley5282'
import { isAllowedTransparenciaUrl, mapLeyDocs } from '@/lib/cms/transparenciaLeyes'

const item = (id: number, codigo: string, titulo: string, orden: number, over: Record<string, unknown> = {}) => ({
  id,
  codigo,
  titulo,
  descripcion: null,
  orden,
  active: true,
  ...over,
})
const ITEMS = [item(1, 'organigrama', 'Organigrama', 10), item(2, 'nomina-personal', 'Nómina del Personal', 20), item(3, 'item-8', 'Informes de auditoría', 30)]

/** Simula el CMS: `/api/transparencia-items` responde `items`; `/api/ley…` responde `body` (o el `status` de error). */
function stubFetch(body: unknown, status = 200, items: unknown = ITEMS) {
  const calls: { url: URL; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(href)
      calls.push({ url, init })
      const isItems = url.pathname === '/api/transparencia-items'
      return new Response(JSON.stringify(isItems ? { docs: items } : body), {
        status: isItems ? 200 : status,
        headers: { 'content-type': 'application/json' },
      })
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
  item: 1,
  category: 'organigrama',
  period: '2024',
  description: null,
  driveUrl: 'https://drive.google.com/file/d/AbCdEfGhIjKlMnOp/view',
  order: 0,
  ...over,
})

describe('TRANS-01: allowlist de enlaces y sin lista fija en código', () => {
  it('https + host exacto', () => {
    expect(isAllowedTransparenciaUrl('https://drive.google.com/file/d/x/view')).toBe(true)
    for (const bad of ['http://drive.google.com/x', 'javascript:alert(1)', 'https://drive.google.com.evil.example/x', '', null, 5, 'https://u:p@drive.google.com/x'])
      expect(isAllowedTransparenciaUrl(bad), String(bad)).toBe(false)
  })
  it('TRANS-02: el módulo del portal ya no trae la lista de categorías', () => {
    const src = readFileSync(resolve(process.cwd(), 'lib/cms/transparenciaLeyes.ts'), 'utf8')
    expect(src).not.toMatch(/Su estructura orgánica|item-17|const LEYES\b/)
  })
})

describe('TRANS-02: mapLeyDocs (ítems del CMS + documentos)', () => {
  it('un grupo por ítem activo en el orden `orden` (no el de llegada), con ítems vacíos incluidos', () => {
    const items = [item(3, 'c', 'C', 30), item(1, 'a', 'A', 10), item(2, 'b', 'B', 20)]
    const { groups, total } = mapLeyDocs(items, [row({ id: 9, item: 2, period: 'Y', order: 2 }), row({ id: 8, item: 2, period: 'X', order: 1 })])
    expect(groups.map((g) => g.category)).toEqual(['a', 'b', 'c'])
    expect(groups.map((g) => g.label)).toEqual(['A', 'B', 'C'])
    expect(groups[0].docs).toEqual([])
    expect(groups[1].docs.map((d) => d.period)).toEqual(['X', 'Y'])
    expect(total).toBe(2)
  })
  it('un ítem sin documentos conserva título y descripción', () => {
    const { groups, total } = mapLeyDocs([item(1, 'item-2', 'Facultades, deberes', 10, { descripcion: 'Art. 8 inc. b' })], [])
    expect(groups).toEqual([{ category: 'item-2', label: 'Facultades, deberes', description: 'Art. 8 inc. b', docs: [] }])
    expect(total).toBe(0)
  })
  it('descarta ítems inactivos, sin código/título o duplicados, y los documentos de un ítem oculto', () => {
    const items = [item(1, 'a', 'A', 1), item(2, 'b', 'B', 2, { active: false }), item(3, '', 'X', 3), item(4, 'd', '  ', 4), item(5, 'a', 'Repetido', 5)]
    const { groups, total } = mapLeyDocs(items, [row({ id: 1, item: 1 }), row({ id: 2, item: 2 }), row({ id: 3, item: 99 }), row({ id: 4, item: null })])
    expect(groups.map((g) => g.category)).toEqual(['a'])
    expect(groups[0].label).toBe('A')
    expect(total).toBe(1)
  })
  it('acepta la relación poblada y descarta período vacío y enlaces fuera de la allowlist', () => {
    const { total, groups } = mapLeyDocs([item(1, 'a', 'A', 1)], [
      row({ id: 1, item: { id: 1 } }),
      row({ id: 2, period: '  ' }),
      row({ id: 3, driveUrl: 'https://evil.example/x' }),
      row({ id: 4, driveUrl: 'javascript:alert(1)' }),
      row({ id: 5, driveUrl: 'https://drive.google.com/drive/folders/REAL1234567890' }),
    ])
    expect(total).toBe(2)
    expect(groups[0].docs).toHaveLength(2)
  })
  it('entrada que no son arreglos -> lanza (la consulta lo traduce a unavailable)', () => {
    expect(() => mapLeyDocs('x', [])).toThrow()
    expect(() => mapLeyDocs([], 'x')).toThrow()
  })
})

describe('TRANS-02: consultas', () => {
  it('pide ítems activos de la ley por orden y documentos activos con cota, sin depth', async () => {
    const calls = stubFetch({ docs: [row()] })
    const r = await getLey5189Page()
    expect(r.status).toBe('ok')
    const it = calls.find((c) => c.url.pathname === '/api/transparencia-items')!
    expect(it.url.searchParams.get('where[ley][equals]')).toBe('5189')
    expect(it.url.searchParams.get('where[active][equals]')).toBe('true')
    expect(it.url.searchParams.get('sort')).toBe('orden')
    expect(Number(it.url.searchParams.get('limit'))).toBeLessThanOrEqual(500)
    expect(it.url.searchParams.get('depth')).toBe('0')
    const d = calls.find((c) => c.url.pathname === '/api/ley5189')!
    expect(d.url.searchParams.get('where[active][equals]')).toBe('true')
    expect(Number(d.url.searchParams.get('limit'))).toBeLessThanOrEqual(1000)
    expect(d.url.searchParams.get('depth')).toBe('0')
    expect((d.init as { next?: { tags?: string[] } }).next?.tags).toEqual(['ley5189'])
    expect((it.init as { next?: { tags?: string[] } }).next?.tags).toEqual(expect.arrayContaining(['transparencia-items', 'ley5189']))
  })
  it('5282 usa su colección y etiqueta; agrupa por ítem del CMS', async () => {
    const calls = stubFetch({ docs: [row({ item: 3, category: 'item-8' })] })
    const r = await getLey5282Page()
    expect(calls.some((c) => c.url.pathname === '/api/ley5282')).toBe(true)
    expect(calls.find((c) => c.url.pathname === '/api/transparencia-items')!.url.searchParams.get('where[ley][equals]')).toBe('5282')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.groups).toHaveLength(3)
      expect(r.groups.find((g) => g.category === 'item-8')!.docs).toHaveLength(1)
    }
  })
  it('ítems sin documentos -> empty con los ítems del CMS (sin demo)', async () => {
    stubFetch({ docs: [] })
    const r = await getLey5282Page()
    expect(r.status).toBe('empty')
    if (r.status === 'empty') {
      expect(r.groups.map((g) => g.label)).toEqual(['Organigrama', 'Nómina del Personal', 'Informes de auditoría'])
      expect(r.groups.every((g) => g.docs.length === 0)).toBe(true)
    }
  })
  it('CMS sin ítems ni documentos -> empty sin lista inventada', async () => {
    stubFetch({ docs: [] }, 200, [])
    expect(await getLey5189Page()).toEqual({ status: 'empty', groups: [], total: 0 })
  })
  it('error HTTP, red caída o forma inesperada (documentos o ítems) -> unavailable, nunca lanza', async () => {
    stubFetch({ errors: [] }, 500)
    expect((await getLey5189Page()).status).toBe('unavailable')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    expect((await getLey5189Page()).status).toBe('unavailable')
    stubFetch({ nope: true })
    expect((await getLey5189Page()).status).toBe('unavailable')
    stubFetch({ docs: [] }, 200, 'roto')
    expect((await getLey5189Page()).status).toBe('unavailable')
  })
})

describe('TRANS-01: páginas e i18n', () => {
  const root = process.cwd()
  const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
  it.each(['ley-5189', 'ley-5282'])('%s: componente compartido, safeHref, sin datos de demostración', (slug) => {
    const page = read(`app/[locale]/${slug}/page.tsx`)
    expect(page).toContain('LeyDocumentos')
    expect(page).not.toMatch(/DEMO|REEMPLAZAR|drive\.google\.com\/drive\/folders/)
    const comp = read('components/transparencia/LeyDocumentos.tsx')
    expect(comp).toContain('safeHref')
    expect(comp).not.toMatch(/#B0BDB7/i)
  })
  it('/transparencia lee las colecciones, no el global duplicado', () => {
    const page = read('app/[locale]/transparencia/page.tsx')
    expect(page).toMatch(/getLey5189Page/)
    expect(page).toMatch(/getLey5282Page/)
    expect(page).not.toMatch(/getTransparencia/)
  })
  const flat = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [`${p}${k}`] : flat(v as Record<string, unknown>, `${p}${k}.`)))
  it.each(['pages.ley-5189.json', 'pages.ley-5282.json', 'pages.transparencia.json'])('%s: mismas claves en es, en, pt-BR y gn', (f) => {
    const es = flat(JSON.parse(read(`messages/es/${f}`))).sort()
    for (const l of ['en', 'pt-BR', 'gn']) expect(flat(JSON.parse(read(`messages/${l}/${f}`))).sort(), `${l}/${f}`).toEqual(es)
  })
  it('las claves usadas por el componente existen', () => {
    const es = JSON.parse(read('messages/es/pages.ley-5189.json'))
    const keys = flat(es)
    for (const k of ['docs.noDocs', 'docs.unavailableTitle', 'docs.unavailableText', 'docs.emptyTitle', 'docs.emptyText', 'docs.count', 'docs.openLabel', 'docs.summary', 'docs.indexLabel'])
      expect(keys, k).toContain(k)
  })
})
