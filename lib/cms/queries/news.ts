import { cmsFetch } from '../client'
import { demoFallbackAllowed, isCmsNotFound } from '../errors'
import { PayloadResponse } from '../types'

function lexical(text: string) {
  return { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text, format: 0 }] }] } }
}

export const DEMO_NEWS: NewsItem[] = [
  {
    id: 1,
    slug: 'unc-avanza-en-programas-de-investigacion',
    title: 'La UNC avanza en sus programas de investigación e innovación',
    summary: 'La Universidad Nacional de Concepción participó en jornadas nacionales de investigación e innovación, presentando proyectos destacados en biotecnología, energías renovables y tecnologías de la información.',
    content: lexical('La Universidad Nacional de Concepción participó en jornadas nacionales de investigación e innovación. El evento reunió a investigadores de las principales universidades del país para compartir avances científicos y tecnológicos. La UNC presentó proyectos destacados en biotecnología, energías renovables y tecnologías de la información.'),
    publishedAt: '2026-07-24T00:00:00.000Z',
    category: 'investigacion',
    featured: true,
    author: 'Comunicación Institucional',
    tags: [{ tag: 'investigación' }, { tag: 'innovación' }],
  },
  {
    id: 2,
    slug: 'unc-mecanismo-piloto-evaluacion-resultados-medicina',
    title: 'UNC participó en la presentación del Mecanismo Piloto para la Evaluación de Resultados en Medicina',
    summary: 'La Universidad Nacional de Concepción participó en la presentación del Mecanismo Piloto para la Evaluación de Resultados en Medicina, iniciativa que busca establecer estándares nacionales de calidad en la formación médica.',
    content: lexical('La Universidad Nacional de Concepción participó en la presentación del Mecanismo Piloto para la Evaluación de Resultados en Medicina. Este mecanismo busca establecer estándares de calidad en la formación médica a nivel nacional, garantizando que los egresados cuenten con las competencias necesarias para el ejercicio profesional.'),
    publishedAt: '2026-07-24T00:00:00.000Z',
    category: 'academica',
    featured: true,
    author: 'Comunicación Institucional',
    tags: [{ tag: 'medicina' }, { tag: 'calidad académica' }],
  },
  {
    id: 3,
    slug: 'autoridades-unc-reunion-ministerio-interior',
    title: 'Autoridades de la UNC participaron en reunión con el Ministerio del Interior',
    summary: 'Con el objetivo de fortalecer la cooperación entre el Gobierno Nacional y las instituciones de educación superior, autoridades de la UNC se reunieron con representantes del Ministerio del Interior.',
    content: lexical('Con el objetivo de fortalecer la cooperación entre el Gobierno Nacional y las instituciones de educación superior, autoridades de la Universidad Nacional de Concepción participaron en una reunión con representantes del Ministerio del Interior. En el encuentro se abordaron temas de seguridad ciudadana, vinculación comunitaria y programas de extensión universitaria que puedan articularse con las políticas públicas del gobierno.'),
    publishedAt: '2026-07-15T00:00:00.000Z',
    category: 'institucional',
    featured: false,
    author: 'Comunicación Institucional',
    tags: [{ tag: 'gobierno' }, { tag: 'extensión' }],
  },
  {
    id: 4,
    slug: 'premio-nacional-calidad-excelencia-unc',
    title: 'Premio Nacional de la Calidad y la Excelencia',
    summary: 'La Universidad Nacional de Concepción fue reconocida con el Premio Nacional de la Calidad y la Excelencia, destacando su compromiso con la mejora continua en la educación superior.',
    content: lexical('La Universidad Nacional de Concepción fue reconocida con el Premio Nacional de la Calidad y la Excelencia. Este galardón reconoce el esfuerzo institucional por implementar sistemas de gestión de calidad en todos sus procesos académicos y administrativos. La distinción es fruto del trabajo conjunto de docentes, estudiantes, funcionarios y autoridades que comparten el compromiso con la excelencia universitaria.'),
    publishedAt: '2025-11-12T00:00:00.000Z',
    category: 'institucional',
    featured: true,
    author: 'Comunicación Institucional',
    tags: [{ tag: 'calidad' }, { tag: 'excelencia' }, { tag: 'premio' }],
  },
]

export interface NewsItem {
  id: number
  title: string
  slug: string
  summary: string
  content: any
  publishedAt?: string | null
  featuredImage?: {
    id: number
    alt: string
    url?: string | null
  } | null
  featuredImageUrl?: string | null
  gallery?: Array<{
    image: { id: number; alt: string; url?: string | null }
    caption?: string | null
  }> | null
  category?: string | null
  tags?: Array<{ tag: string }> | null
  featured?: boolean
  author?: string | null
}

/** Campos de tarjeta/listado/buscador que el portal realmente usa (PERF-DB); excluye `content`. */
const LIST_SELECT_FIELDS = [
  'title',
  'slug',
  'summary',
  'publishedAt',
  'featuredImage',
  'featuredImageUrl',
  'category',
] as const

/** Listados: `content` (Lexical pesado) es opcional porque no se pide por defecto (PERF-DB). */
export type NewsListItem = Omit<NewsItem, 'content'> & { content?: NewsItem['content'] }

const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 100

/**
 * Acota `limit` (PERF-DB): evita que un llamador pida un volumen sin tope al CMS/Postgres.
 * Sin `limit` -> 50; por encima del máximo (100 o `maxLimit` explícito, p. ej. sitemap) se recorta.
 */
function clampLimit(limit: number | undefined, maxLimit: number = MAX_LIST_LIMIT): number {
  const wanted = limit !== undefined && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIST_LIMIT
  return Math.min(wanted, maxLimit)
}

/**
 * Lista de noticias publicadas (DEP-19b). Producción: CMS caído -> propaga `CmsError` (no se
 * cachean noticias demo); respuesta vacía -> `docs: []` real. Solo en desarrollo una caída devuelve
 * DEMO_NEWS. Límite: el llamador debe decidir cómo mostrar el error (error boundary o estado vacío).
 * PERF-DB: un solo `depth` (1 por defecto), sin `content` salvo `includeContent`, `select`
 * explícito opcional y `limit` acotado (50 por defecto, 100 máximo salvo `maxLimit`).
 */
export async function getNews(options: {
  page?: number
  limit?: number
  maxLimit?: number
  featured?: boolean
  depth?: number
  select?: readonly string[]
  includeContent?: boolean
} = {}): Promise<PayloadResponse<NewsListItem>> {
  try {
    const params = new URLSearchParams()
    if (options.page) params.append('page', options.page.toString())
    params.append('limit', String(clampLimit(options.limit, options.maxLimit)))
    params.append('depth', String(options.depth ?? 1))
    if (options.featured !== undefined) {
      params.append('where[featured][equals]', options.featured.toString())
    }
    params.append('where[_status][equals]', 'published')
    params.append('sort', '-publishedAt')
    if (!options.includeContent) {
      for (const field of options.select ?? LIST_SELECT_FIELDS) {
        params.append(`select[${field}]`, 'true')
      }
    }

    return await cmsFetch<PayloadResponse<NewsListItem>>(`/noticias?${params.toString()}`, {
      tags: ['noticias'],
    })
  } catch (error) {
    if (!demoFallbackAllowed()) throw error
    let docs = DEMO_NEWS
    if (options.featured !== undefined) {
      docs = docs.filter((n) => n.featured === options.featured)
    }
    return { docs, totalDocs: docs.length, limit: docs.length, totalPages: 1, page: 1, pagingCounter: 1, hasNextPage: false, hasPrevPage: false, prevPage: null, nextPage: null }
  }
}

/**
 * Noticia publicada por slug (DEP-15). Lista vacía o 404 del CMS -> `null`
 * (404 legítimo). Red caída, timeout o 5xx -> propaga `CmsError` para que la
 * página NO cachee un 404 con `revalidate`. Los datos demo solo en desarrollo.
 */
export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  try {
    const params = new URLSearchParams()
    params.append('where[slug][equals]', slug)
    params.append('where[_status][equals]', 'published')
    params.append('limit', '1')
    params.append('depth', '2')

    const res = await cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
      tags: [`noticias:${slug}`],
    })

    return res.docs[0] ?? null
  } catch (error) {
    if (isCmsNotFound(error)) return null
    if (demoFallbackAllowed()) return DEMO_NEWS.find((n) => n.slug === slug) ?? null
    throw error
  }
}

/**
 * Borrador de una noticia para el preview del editor (DEP-02b).
 * Reenvía el token del editor SOLO aquí; sin token degrada a la consulta de
 * publicados (sin Authorization) para no mostrar contenido ajeno. La petición
 * autenticada es no-store (no se cachea entre usuarios). Límite: la
 * autorización real la decide el CMS (DEP-02); aquí no se valida el token.
 */
export async function getNewsBySlugDraft(
  slug: string,
  authToken?: string,
): Promise<NewsItem | null> {
  if (!authToken) {
    return getNewsBySlug(slug)
  }
  const params = new URLSearchParams()
  params.append('where[slug][equals]', slug)
  params.append('draft', 'true')
  params.append('limit', '1')
  params.append('depth', '2')

  const res = await cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
    authToken,
  })

  return res.docs[0] || null
}

/**
 * Lightweight slug-only fetch used by generateStaticParams.
 * DEP-15: con el CMS caído devuelve slugs demo solo en desarrollo; fuera de él
 * `[]` (no se prerenderizan páginas demo que fallarían al consultar el detalle).
 * Uses `select[slug]=true` and `depth=0` to minimize payload size.
 */
export async function getNewsSlugs(limit = 200): Promise<string[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[_status][equals]', 'published')
    params.append('sort', '-publishedAt')
    params.append('limit', String(limit))
    params.append('depth', '0')
    params.append('select[slug]', 'true')

    const res = await cmsFetch<PayloadResponse<{ slug: string }>>(
      `/noticias?${params.toString()}`,
      { tags: ['noticias-slugs'] },
    )
    return res.docs.map((d) => d.slug).filter(Boolean)
  } catch {
    return demoFallbackAllowed() ? DEMO_NEWS.map((n) => n.slug) : []
  }
}

/** Búsqueda de noticias (DEP-19b): producción propaga la caída del CMS; el demo solo en desarrollo. PERF-DB: sin cuerpo y con `limit` acotado. */
export async function getNewsByQuery(
  q: string,
  options: { limit?: number } = {}
): Promise<PayloadResponse<NewsListItem>> {
  const limit = options.limit ?? 12
  try {
    const params = new URLSearchParams()
    params.append('where[or][0][title][like]', q)
    params.append('where[or][1][summary][like]', q)
    params.append('where[_status][equals]', 'published')
    params.append('sort', '-publishedAt')
    params.append('limit', String(clampLimit(limit)))
    // PERF-DB: el buscador solo pinta tarjetas; sin `content` y con depth 1 (imagen destacada).
    params.append('depth', '1')
    for (const field of LIST_SELECT_FIELDS) params.append(`select[${field}]`, 'true')

    return await cmsFetch<PayloadResponse<NewsListItem>>(`/noticias?${params.toString()}`, {
      tags: ['noticias-search'],
    })
  } catch (error) {
    if (!demoFallbackAllowed()) throw error
    const lower = q.toLowerCase()
    const docs = DEMO_NEWS.filter(
      (n) =>
        n.title.toLowerCase().includes(lower) ||
        (n.summary ?? '').toLowerCase().includes(lower),
    )
    return {
      docs,
      totalDocs: docs.length,
      limit,
      totalPages: 1,
      page: 1,
      pagingCounter: 1,
      hasNextPage: false,
      hasPrevPage: false,
      prevPage: null,
      nextPage: null,
    }
  }
}
