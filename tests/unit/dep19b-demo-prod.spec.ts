// DEP-19b (Frente 6): las listas del CMS no se sustituyen por datos demo en producción.
// Amenaza: con el CMS caído (o vacío) el portal publica noticias, miembros del tribunal, convenios,
// FAQs o carreras inventadas y, por el caché ISR, las conserva. Límite: fetch simulado; no ejercita
// ISR real ni el render de las páginas (ver comprobaciones estáticas al final).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const CMS = 'https://cms.test.local'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let urls: string[]

function stubFetch(kind: 'ok-empty' | '503' | 'network' | 'timeout') {
  urls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(String(url))
      if (kind === 'network') throw new TypeError('fetch failed')
      if (kind === 'timeout') throw Object.assign(new Error('aborted'), { name: 'AbortError' })
      if (kind === '503') return json(503, { message: 'down' })
      return json(200, { docs: [], totalDocs: 0, totalPages: 1, page: 1 })
    }),
  )
}

async function load() {
  vi.resetModules()
  process.env.CMS_URL = CMS
  return {
    errors: await import('@/lib/cms/errors'),
    news: await import('@/lib/cms/queries/news'),
    tribunal: await import('@/lib/cms/queries/tribunal'),
    convenios: await import('@/lib/cms/queries/convenios'),
    faqs: await import('@/lib/cms/queries/faqs'),
    carreras: await import('@/lib/cms/queries/carreras'),
  }
}

type Q = [string, (m: Awaited<ReturnType<typeof load>>) => Promise<unknown>, (r: any) => boolean]
const isEmpty = (r: any) => (Array.isArray(r) ? r.length === 0 : Array.isArray(r?.docs) && r.docs.length === 0)

const queries: Q[] = [
  ['getNews', (m) => m.news.getNews(), isEmpty],
  ['getNewsByQuery', (m) => m.news.getNewsByQuery('unc'), isEmpty],
  ['getNews(featured)', (m) => m.news.getNews({ featured: true }), isEmpty],
  ['getTribunalMiembros', (m) => m.tribunal.getTribunalMiembros(), isEmpty],
  ['getTribunalDocumentos', (m) => m.tribunal.getTribunalDocumentos(), isEmpty],
  ['getConvenios', (m) => m.convenios.getConvenios(), isEmpty],
  ['getConvenios(nacional)', (m) => m.convenios.getConvenios('nacional'), isEmpty],
  ['getFAQs', (m) => m.faqs.getFAQs(), isEmpty],
  ['getCarreras', (m) => m.carreras.getCarreras(), isEmpty],
  ['getCarrerasByFacultad', (m) => m.carreras.getCarrerasByFacultad('medicina'), isEmpty],
  ['getCarrerasByFacultadAndTipo', (m) => m.carreras.getCarrerasByFacultadAndTipo('medicina', 'grado'), isEmpty],
]

describe('producción: CMS caído -> CmsError; CMS vacío -> lista vacía real', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe.each(queries)('%s', (_name, call, empty) => {
    it('5xx -> lanza CmsError distinguible (outage)', async () => {
      stubFetch('503')
      const m = await load()
      const err = await call(m).then(() => null, (e) => e)
      expect(err).toBeInstanceOf(m.errors.CmsError)
      expect(err.status).toBe(503)
      expect(m.errors.isCmsOutage(err)).toBe(true)
    })
    it('red caída -> lanza CmsError', async () => {
      stubFetch('network')
      const m = await load()
      const err = await call(m).then(() => null, (e) => e)
      expect(err).toBeInstanceOf(m.errors.CmsError)
    })
    it('timeout -> lanza CmsError', async () => {
      stubFetch('timeout')
      const m = await load()
      const err = await call(m).then(() => null, (e) => e)
      expect(err).toBeInstanceOf(m.errors.CmsError)
    })
    it('200 vacío -> lista vacía (sin datos inventados)', async () => {
      stubFetch('ok-empty')
      const m = await load()
      const r = await call(m)
      expect(empty(r)).toBe(true)
    })
  })

  it('getConvenios llama a <CMS>/api/convenios (una sola vez /api)', async () => {
    stubFetch('ok-empty')
    const m = await load()
    await m.convenios.getConvenios()
    expect(urls[0]).toMatch(/^https:\/\/cms\.test\.local\/api\/convenios\?/)
    expect(urls[0]).not.toContain('/api/api/')
  })
})

describe('development: se permite demo', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ['getNews', (m: any) => m.news.getNews(), (r: any) => r.docs.length > 0],
    ['getTribunalMiembros', (m: any) => m.tribunal.getTribunalMiembros(), (r: any) => r.length > 0],
    ['getTribunalDocumentos', (m: any) => m.tribunal.getTribunalDocumentos(), (r: any) => r.length > 0],
    ['getConvenios', (m: any) => m.convenios.getConvenios(), (r: any) => r.length > 0],
    ['getFAQs', (m: any) => m.faqs.getFAQs(), (r: any) => r.length > 0],
    ['getCarreras', (m: any) => m.carreras.getCarreras(), (r: any) => r.length > 0],
  ])('%s con 503 devuelve demo y no lanza', async (_n, call, hasData) => {
    stubFetch('503')
    const m = await load()
    expect(hasData(await call(m))).toBe(true)
  })

  it('tribunal vacío en development -> demo (siembra local)', async () => {
    stubFetch('ok-empty')
    const m = await load()
    expect((await m.tribunal.getTribunalMiembros()).length).toBeGreaterThan(0)
  })
})

describe('páginas: no tapan el error con demo (estático)', () => {
  it.each(['app/[locale]/convenios/page.tsx', 'app/[locale]/tribunal-electoral/page.tsx'])('%s', (rel) => {
    const src = readFileSync(path.join(ROOT, rel), 'utf8')
    expect(src).not.toMatch(/\.catch\(\s*\(\)\s*=>\s*DEMO_/)
  })
})
