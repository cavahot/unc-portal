// PERF-DB (puntos 3 y 4): prerender acotado y revalidación completa de Noticias.
// Amenazas: (3) `getNewsSlugs(200)` × 5 idiomas prerenderizaba ~1000 páginas en cada build y golpeaba
// CMS/Postgres; (4) al publicar una noticia solo se invalidaba `noticias`, de modo que la lista de slugs
// (`noticias-slugs`) y el detalle (`noticias:<slug>`) seguían viejos hasta vencer el ISR.
// Límite: el hook del CMS se verifica por su código fuente (sus dependencias requieren Payload);
// el endpoint del portal se ejecuta con next/cache simulado.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { NEWS_PRERENDER_LIMIT } from '@/lib/cms/staticParams'

const ROOT = path.resolve(__dirname, '..', '..')
const revalidateTag = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath }))

const STRONG_REVAL = 'rv-Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3x'

describe('PERF-DB: prerender de noticias', () => {
  it('el límite de prerender es 20', () => {
    expect(NEWS_PRERENDER_LIMIT).toBe(20)
  })

  it('la página de detalle usa la constante y no 200', () => {
    const src = readFileSync(path.join(ROOT, 'app/[locale]/noticias/[slug]/page.tsx'), 'utf8')
    expect(src).toContain('getNewsSlugs(NEWS_PRERENDER_LIMIT)')
    expect(src).not.toContain('getNewsSlugs(200)')
  })

  it('getNewsSlugs pide las más recientes primero', () => {
    const src = readFileSync(path.join(ROOT, 'lib/cms/queries/news.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function getNewsSlugs'))
    expect(fn).toContain("params.append('sort', '-publishedAt')")
  })
})

describe('PERF-DB: revalidación de noticias', () => {
  beforeEach(() => {
    revalidateTag.mockClear()
    process.env.REVALIDATION_SECRET = STRONG_REVAL
  })
  afterEach(() => {
    delete process.env.REVALIDATION_SECRET
  })

  const post = async (tag: string) => {
    vi.resetModules()
    const { POST } = (await import('@/app/api/revalidate/route')) as {
      POST: (r: NextRequest) => Promise<Response>
    }
    return POST(
      new NextRequest('http://localhost/api/revalidate', {
        method: 'POST',
        headers: { 'x-real-ip': '203.0.113.9', authorization: `Bearer ${STRONG_REVAL}` },
        body: JSON.stringify({ tag }),
      }),
    )
  }

  it('el portal acepta noticias-slugs y noticias:<slug>', async () => {
    expect((await post('noticias-slugs')).status).toBe(200)
    expect((await post('noticias:mi-noticia')).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('noticias-slugs', {})
  })

  it('el hook de Noticias revalida noticias, noticias-slugs y noticias:<slug>', () => {
    const src = readFileSync(path.join(ROOT, 'apps/cms/src/collections/Noticias.ts'), 'utf8')
    expect(src).toContain("revalidatePortalTag('noticias')")
    expect(src).toContain("revalidatePortalTag('noticias-slugs')")
    expect(src).toMatch(/revalidatePortalTag\(`noticias:\$\{doc\.slug\}`\)/)
  })
})
