// PERF-DB (punto 2): consultas de listado del portal acotadas.
// Amenaza: el listado traía el cuerpo Lexical de cada noticia, `depth` duplicado y límites sin tope,
// de modo que el coste crecía sin cota con el número de noticias. Estas pruebas fijan la URL que se
// envía al CMS. Límite: no ejecutan Payload ni Postgres; solo validan la consulta generada.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getNews, getNewsByQuery } from '@/lib/cms/queries/news'

const emptyList = { docs: [], totalDocs: 0, totalPages: 1, page: 1 }

/** Captura la URL pedida al CMS y devuelve una lista vacía válida. */
function captureUrl(): { last: () => URL } {
  let url = ''
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return new Response(JSON.stringify(emptyList), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  return { last: () => new URL(url) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PERF-DB getNews: parámetros de la consulta', () => {
  it('envía un solo depth, con 1 por defecto', async () => {
    const c = captureUrl()
    await getNews({ limit: 6 })
    expect(c.last().searchParams.getAll('depth')).toEqual(['1'])
  })

  it('respeta options.depth sin duplicarlo', async () => {
    const c = captureUrl()
    await getNews({ limit: 6, depth: 0 })
    expect(c.last().searchParams.getAll('depth')).toEqual(['0'])
  })

  it('por defecto no trae el cuerpo (content) y selecciona solo campos de tarjeta', async () => {
    const c = captureUrl()
    await getNews({ limit: 6 })
    const sp = c.last().searchParams
    expect(sp.get('select[content]')).toBeNull()
    for (const f of ['title', 'slug', 'summary', 'publishedAt', 'featuredImage', 'featuredImageUrl', 'category']) {
      expect(sp.get(`select[${f}]`)).toBe('true')
    }
  })

  it('includeContent: true elimina el select para devolver el documento completo', async () => {
    const c = captureUrl()
    await getNews({ limit: 6, includeContent: true })
    const keys = [...c.last().searchParams.keys()].filter((k) => k.startsWith('select['))
    expect(keys).toEqual([])
  })

  it('select explícito (sitemap) reemplaza al select por defecto', async () => {
    const c = captureUrl()
    await getNews({ limit: 500, maxLimit: 500, depth: 0, select: ['slug', 'publishedAt'] })
    const keys = [...c.last().searchParams.keys()].filter((k) => k.startsWith('select['))
    expect(keys.sort()).toEqual(['select[publishedAt]', 'select[slug]'])
  })
})

describe('PERF-DB getNews: tope de limit', () => {
  it('sin limit usa el valor por defecto (50)', async () => {
    const c = captureUrl()
    await getNews()
    expect(c.last().searchParams.get('limit')).toBe('50')
  })

  it('un limit mayor que el máximo se recorta a 100', async () => {
    const c = captureUrl()
    await getNews({ limit: 5000 })
    expect(c.last().searchParams.get('limit')).toBe('100')
  })

  it('maxLimit explícito permite más de 100 (sitemap)', async () => {
    const c = captureUrl()
    await getNews({ limit: 500, maxLimit: 500 })
    expect(c.last().searchParams.get('limit')).toBe('500')
  })
})

describe('PERF-DB getNewsByQuery: sin cuerpo y depth acotado', () => {
  it('no selecciona content y usa un solo depth', async () => {
    const c = captureUrl()
    await getNewsByQuery('beca', { limit: 12 })
    const sp = c.last().searchParams
    expect(sp.get('select[content]')).toBeNull()
    expect(sp.get('select[title]')).toBe('true')
    expect(sp.getAll('depth')).toEqual(['1'])
  })
})
