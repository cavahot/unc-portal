/**
 * DEP-02b: el preview reenvía el token del editor solo en la ruta de borradores.
 * Amenaza: fuga del token a hosts ajenos, uso en consultas públicas o caché de
 * borradores entre usuarios. Límite: fetch simulado, no se prueba contra Payload real.
 * Evidencia: RDD-DEP-10. Spec: docs/specs/deploy/DEP-02b-preview-con-token-del-editor.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const CMS = 'https://cms.test.local'
const TOKEN = 'tok-sintetico-123'

type Call = { url: string; init: any }
let calls: Call[]

function mockFetch(status = 200, docs: any[] = [{ id: 1, slug: 's', title: 'T' }]) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: any) => {
      calls.push({ url: String(url), init })
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => (status < 300 ? { docs } : { message: 'denied' }),
      }
    }),
  )
}

const authOf = (c: Call) => new Headers(c.init?.headers).get('Authorization')

async function load() {
  vi.resetModules()
  process.env.CMS_URL = CMS
  const news = await import('@/lib/cms/queries/news')
  const pages = await import('@/lib/cms/queries/pages')
  const client = await import('@/lib/cms/client')
  return { news, pages, client }
}

beforeEach(() => mockFetch())
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CMS_URL
})

describe('DEP-02b (a) sin token', () => {
  it('noticias: no envía Authorization y consulta solo publicados', async () => {
    const { news } = await load()
    await (news.getNewsBySlugDraft as any)('s')
    expect(calls.length).toBeGreaterThan(0)
    for (const c of calls) {
      expect(authOf(c)).toBeNull()
      expect(c.url).not.toContain('draft=true')
      expect(c.url).toContain('where%5B_status%5D%5Bequals%5D=published')
    }
  })
  it('páginas: draft sin token consulta solo publicados sin Authorization', async () => {
    const { pages } = await load()
    await pages.getPageBySlug('s', true)
    for (const c of calls) {
      expect(authOf(c)).toBeNull()
      expect(c.url).not.toContain('draft=true')
      expect(c.url).toContain('where%5B_status%5D%5Bequals%5D=published')
    }
  })
})

describe('DEP-02b (b) con token y draft', () => {
  it('noticias: envía Authorization JWT, draft=true y no-store', async () => {
    const { news } = await load()
    await (news.getNewsBySlugDraft as any)('s', TOKEN)
    const c = calls[0]
    expect(authOf(c)).toBe(`JWT ${TOKEN}`)
    expect(c.url).toContain('draft=true')
    expect(c.init.cache).toBe('no-store')
  })
  it('páginas: envía Authorization JWT, draft=true y no-store', async () => {
    const { pages } = await load()
    await (pages.getPageBySlug as any)('s', true, TOKEN)
    const c = calls[0]
    expect(authOf(c)).toBe(`JWT ${TOKEN}`)
    expect(c.url).toContain('draft=true')
    expect(c.init.cache).toBe('no-store')
  })
})

describe('DEP-02b (c) consulta pública nunca lleva Authorization', () => {
  it('getNewsBySlug y getPageBySlug publicados', async () => {
    const { news, pages } = await load()
    await news.getNewsBySlug('s')
    await (pages.getPageBySlug as any)('s', false, TOKEN)
    await news.getNews()
    expect(calls.length).toBe(3)
    for (const c of calls) expect(authOf(c)).toBeNull()
  })
})

describe('DEP-02b (d) el token no viaja a otra URL base', () => {
  it.each(['//evil.example/x', '@evil.example/x', 'https://evil.example/x', '.evil.example'])(
    'rechaza endpoint %s con token sin llamar a fetch',
    async (endpoint) => {
      const { client } = await load()
      await expect(
        (client.cmsFetch as any)(endpoint, { authToken: TOKEN }),
      ).rejects.toBeTruthy()
      expect(calls.length).toBe(0)
    },
  )
  it('con endpoint válido, la URL pertenece a la base configurada', async () => {
    const { client } = await load()
    await (client.cmsFetch as any)('/noticias', { authToken: TOKEN })
    expect(calls[0].url.startsWith(`${CMS}/api/`)).toBe(true)
  })
})

describe('DEP-02b (e) CMS responde 403', () => {
  it('la función de borrador falla de forma controlada (el llamador degrada)', async () => {
    mockFetch(403)
    const { news, pages } = await load()
    await expect((news.getNewsBySlugDraft as any)('s', TOKEN)).rejects.toMatchObject({ status: 403 })
    await expect((pages.getPageBySlug as any)('s', true, TOKEN)).rejects.toMatchObject({ status: 403 })
  })
  it('el mensaje del error no contiene el token', async () => {
    mockFetch(403)
    const { news } = await load()
    const err: any = await (news.getNewsBySlugDraft as any)('s', TOKEN).catch((e: any) => e)
    expect(JSON.stringify({ m: err.message, s: err.stack })).not.toContain(TOKEN)
  })
})

describe('DEP-02b (g) caché', () => {
  it('con token siempre no-store, aunque el llamador pida force-cache/revalidate', async () => {
    const { client } = await load()
    await (client.cmsFetch as any)('/noticias', {
      authToken: TOKEN,
      cache: 'force-cache',
      next: { revalidate: 3600 },
      tags: ['x'],
    })
    const init = calls[0].init
    expect(init.cache).toBe('no-store')
    expect(init.next?.revalidate).toBeUndefined()
  })
})

describe('DEP-02b (f) ISR: cookies() solo en la rama de preview (estático)', () => {
  const root = path.resolve(__dirname, '../..')
  const read = (p: string) => readFileSync(path.join(root, p), 'utf8')

  it.each(['app/[locale]/noticias/[slug]/page.tsx', 'app/[locale]/[...slug]/page.tsx'])(
    '%s lee cookies() solo después de comprobar isDraft',
    (p) => {
      const src = read(p)
      const calls = [...src.matchAll(/cookies\(\)/g)].map((m) => m.index!)
      expect(calls.length).toBeGreaterThan(0)
      // Cada llamada debe quedar dentro de un bloque `if (isDraft` y fuera de generateMetadata.
      const gate = src.indexOf('if (isDraft')
      expect(gate).toBeGreaterThan(-1)
      const meta = src.indexOf('generateMetadata')
      const metaEnd = meta === -1 ? -1 : src.indexOf('export default', meta)
      for (const i of calls) {
        expect(i).toBeGreaterThan(gate)
        if (meta !== -1) expect(i < meta || i > metaEnd).toBe(true)
      }
    },
  )

  it('ninguna otra página bajo app/[locale] usa cookies() de next/headers fuera del preview', async () => {
    const { globSync } = await import('node:fs')
    const files = (globSync as any)('app/[[]locale]/**/*.tsx', { cwd: root }) as string[]
    const offenders = files.filter((f) => {
      const s = read(f)
      return /cookies\(\)/.test(s) && !/if \(isDraft/.test(s)
    })
    expect(offenders).toEqual([])
  })
})
