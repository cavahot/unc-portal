// DEP-15 (Frente B): «no existe» (404 legítimo) vs «CMS caído» (error que no se cachea como 404).
// Amenaza: con `revalidate = 3600` un 404 generado por una caída transitoria del CMS queda cacheado
// una hora y esconde contenido publicado. Límite: no valida el comportamiento ISR de Next (requiere build).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CmsError, isCmsNotFound, isCmsOutage } from '@/lib/cms/errors'
import { getNewsBySlug, getNewsSlugs } from '@/lib/cms/queries/news'
import { getCarreraBySlug } from '@/lib/cms/queries/carreras'
import { getPageBySlug } from '@/lib/cms/queries/pages'
import { safeStaticParams } from '@/lib/cms/staticParams'

const ROOT = path.resolve(__dirname, '..', '..')

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const emptyList = { docs: [], totalDocs: 0 }

const queries: Array<[string, (s: string) => Promise<unknown>]> = [
  ['getNewsBySlug', (s) => getNewsBySlug(s)],
  ['getCarreraBySlug', (s) => getCarreraBySlug(s)],
  ['getPageBySlug', (s) => getPageBySlug(s)],
]

describe('detalle del CMS: ausente vs caído', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe.each(queries)('%s', (_name, run) => {
    it('500 del CMS -> lanza CmsError (outage)', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json(500, { message: 'boom' })))
      const err = await run('x').catch((e) => e)
      expect(err).toBeInstanceOf(CmsError)
      expect(isCmsOutage(err)).toBe(true)
      expect(isCmsNotFound(err)).toBe(false)
    })

    it('red caída -> lanza CmsError (outage)', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
      const err = await run('x').catch((e) => e)
      expect(err).toBeInstanceOf(CmsError)
      expect(isCmsOutage(err)).toBe(true)
    })

    it('timeout/abort -> lanza CmsError (outage)', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => {
        const e = new Error('aborted'); e.name = 'AbortError'; throw e
      }))
      const err = await run('x').catch((e) => e)
      expect(err).toBeInstanceOf(CmsError)
      expect(isCmsOutage(err)).toBe(true)
    })

    it('200 sin resultados -> null', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json(200, emptyList)))
      await expect(run('x')).resolves.toBeNull()
    })

    it('404 del CMS -> null', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json(404, { message: 'Not Found' })))
      await expect(run('x')).resolves.toBeNull()
    })
  })

  it('isCmsNotFound/isCmsOutage clasifican errores', () => {
    expect(isCmsNotFound(new CmsError('x', 404))).toBe(true)
    expect(isCmsNotFound(new CmsError('x', 500))).toBe(false)
    expect(isCmsOutage(new CmsError('x', 503))).toBe(true)
    expect(isCmsOutage(new Error('x'))).toBe(true)
    expect(isCmsOutage(new CmsError('x', 404))).toBe(false)
  })

  it('la caída del CMS no se enmascara con datos demo fuera de desarrollo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(500, {})))
    // Slugs que existen en los datos demo: antes se devolvía contenido demo en producción.
    await expect(getNewsBySlug('unc-avanza-en-programas-de-investigacion')).rejects.toBeInstanceOf(CmsError)
    await expect(getCarreraBySlug('medicina')).rejects.toBeInstanceOf(CmsError)
  })
})

describe('generateStaticParams no lanza', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('safeStaticParams devuelve [] si la carga lanza', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(safeStaticParams(async () => { throw new CmsError('x', 500) })).resolves.toEqual([])
  })

  it('safeStaticParams conserva el resultado si la carga funciona', async () => {
    await expect(safeStaticParams(async () => [{ slug: 'a' }])).resolves.toEqual([{ slug: 'a' }])
  })

  it('getNewsSlugs con CMS caído devuelve [] (sin slugs demo)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(getNewsSlugs(10)).resolves.toEqual([])
  })
})

describe('páginas de detalle (estático)', () => {
  const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

  /** Devuelve el texto desde `export default` hasta el final (cuerpo de la página). */
  const body = (src: string) => src.slice(src.indexOf('export default'))

  it('noticias/[slug]: la consulta publicada no se captura y generateStaticParams es seguro', () => {
    const src = read('app/[locale]/noticias/[slug]/page.tsx')
    expect(body(src)).not.toMatch(/getNewsBySlug\(slug\)\.catch/)
    expect(src).toMatch(/safeStaticParams\(/)
  })

  it('carreras/[slug]: la consulta no se captura en el cuerpo y generateStaticParams no lanza', () => {
    const src = read('app/[locale]/carreras/[slug]/page.tsx')
    expect(body(src)).not.toMatch(/getCarreraBySlug\(slug\)\.catch/)
    expect(src).toMatch(/generateStaticParams\(\)\s*\{[^}]*return \[\]/)
  })

  it('[...slug]: la consulta publicada no se traga el error', () => {
    const src = read('app/[locale]/[...slug]/page.tsx')
    expect(body(src)).not.toMatch(/pagina = null/)
    expect(body(src)).not.toMatch(/getPageBySlug\(fullSlug\)\.catch/)
  })

  it('DEP-02b intacto: la rama borrador sigue degradando a null', () => {
    expect(read('app/[locale]/noticias/[slug]/page.tsx')).toMatch(/getNewsBySlugDraft\(slug, payloadToken\)\.catch\(\(\) => null\)/)
    expect(read('app/[locale]/[...slug]/page.tsx')).toMatch(/getPageBySlug\(fullSlug, true, payloadToken\)\.catch\(\(\) => null\)/)
  })
})
