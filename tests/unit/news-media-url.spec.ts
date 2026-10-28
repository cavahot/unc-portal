// MIG-IMG (bug de imágenes de noticias): las consultas de noticias deben devolver `media.url` ABSOLUTA.
// Amenaza/defecto: con `url` relativa (`/api/media/file/x.jpg`) `next/image` la resuelve contra el origen del
// PORTAL (404) y una URL insegura (`//evil`, `javascript:`, `../`) llegaría al optimizador de imágenes.
// Límite: no ejecuta Payload; simula la respuesta del CMS con `fetch` y valida el mapeo de la capa de consultas.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getNews, getNewsByQuery, getNewsBySlug, getNewsBySlugDraft } from '@/lib/cms/queries/news'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Doc de noticia con imagen destacada y galería tal como las devuelve Payload (url relativa). */
function doc(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'T',
    slug: 't',
    summary: 's',
    featuredImage: { id: 5, alt: 'a', url: '/api/media/file/a.jpg' },
    featuredImageUrl: 'https://www.unc.edu.py/wp-content/uploads/x.jpg',
    gallery: [
      { image: { id: 6, alt: 'g1', url: '/api/media/file/g1.jpg' }, caption: 'c' },
      { image: { id: 7, alt: 'g2', url: '//evil.example/x.jpg' } },
      { image: { id: 8, alt: 'g3', url: 'javascript:alert(1)' } },
      { image: { id: 9, alt: 'g4', url: '../etc/passwd' } },
    ],
    ...over,
  }
}

function stubCms(docs: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ docs, totalDocs: docs.length, totalPages: 1, page: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('MIG-IMG noticias: media.url absoluta en la capa de consultas', () => {
  it('con NEXT_PUBLIC_CMS_URL antepone ese origen a la imagen destacada', async () => {
    vi.stubEnv('NEXT_PUBLIC_CMS_URL', 'https://www.unc.edu.py')
    stubCms([doc()])
    const n = await getNewsBySlug('t')
    expect(n?.featuredImage?.url).toBe('https://www.unc.edu.py/api/media/file/a.jpg')
  })

  it('sin variable usa el origen de desarrollo http://localhost:3002', async () => {
    vi.stubEnv('NEXT_PUBLIC_CMS_URL', '')
    stubCms([doc()])
    const r = await getNews({ limit: 6 })
    expect(r.docs[0].featuredImage?.url).toBe('http://localhost:3002/api/media/file/a.jpg')
  })

  it('resuelve la galería y descarta los elementos con url insegura', async () => {
    vi.stubEnv('NEXT_PUBLIC_CMS_URL', 'https://www.unc.edu.py')
    stubCms([doc()])
    const n = await getNewsBySlug('t')
    expect(n?.gallery).toEqual([
      { image: { id: 6, alt: 'g1', url: 'https://www.unc.edu.py/api/media/file/g1.jpg' }, caption: 'c' },
    ])
  })

  it('imagen destacada insegura se descarta (null) y el hotlink absoluto queda intacto', async () => {
    stubCms([doc({ featuredImage: { id: 5, alt: 'a', url: '//evil.example/x.jpg' } })])
    const n = await getNewsBySlug('t')
    expect(n?.featuredImage).toBeNull()
    expect(n?.featuredImageUrl).toBe('https://www.unc.edu.py/wp-content/uploads/x.jpg')
  })

  it('el buscador y el borrador también devuelven la url absoluta', async () => {
    vi.stubEnv('NEXT_PUBLIC_CMS_URL', 'https://www.unc.edu.py')
    stubCms([doc()])
    const q = await getNewsByQuery('t')
    expect(q.docs[0].featuredImage?.url).toBe('https://www.unc.edu.py/api/media/file/a.jpg')
    const d = await getNewsBySlugDraft('t', 'token')
    expect(d?.featuredImage?.url).toBe('https://www.unc.edu.py/api/media/file/a.jpg')
  })

  it('noticia sin imagen sigue sin imagen (la página aplica su imagen por defecto)', async () => {
    stubCms([doc({ featuredImage: null, gallery: null })])
    const r = await getNews({ limit: 6 })
    expect(r.docs[0].featuredImage).toBeNull()
    expect(r.docs[0].gallery).toBeNull()
  })
})

describe('MIG-IMG noticias: ninguna página lee media.url crudo', () => {
  /** Recorre ficheros .tsx de las carpetas indicadas. */
  function tsx(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? tsx(p) : p.endsWith('.tsx') ? [p] : []
    })
  }
  // Justificación: Hero/Testimonials son bloques del page-builder (otra entidad, otra consulta); NewsGallery
  // recibe imágenes ya resueltas por la capa de consultas (props), no de un payload crudo.
  const allow = ['components/blocks/', 'components/news/NewsGallery.tsx']

  it('páginas de noticias, home y buscador consumen featuredImage/gallery solo vía consultas', () => {
    const files = [...tsx('app'), ...tsx('components/news')].filter(
      (f) => !allow.some((a) => f.split('\\').join('/').includes(a)),
    )
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8')
      // Un fetch directo al CMS en la página (sin pasar por lib/cms/queries) sería la vía para saltarse el mapeo.
      return /cmsFetch\([^)]*noticias/.test(src)
    })
    expect(offenders).toEqual([])
  })
})
