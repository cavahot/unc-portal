import { cmsFetch } from '../client'
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

export async function getNews(options: {
  page?: number
  limit?: number
  featured?: boolean
  depth?: number
} = {}): Promise<PayloadResponse<NewsItem>> {
  try {
    const params = new URLSearchParams()
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', (options.limit || 10).toString())
    if (options.depth !== undefined) params.append('depth', options.depth.toString())
    if (options.featured !== undefined) {
      params.append('where[featured][equals]', options.featured.toString())
    }
    params.append('where[_status][equals]', 'published')
    params.append('sort', '-publishedAt')
    params.append('depth', '2')

    return await cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
      tags: ['noticias'],
    })
  } catch {
    let docs = DEMO_NEWS
    if (options.featured !== undefined) {
      docs = docs.filter((n) => n.featured === options.featured)
    }
    return { docs, totalDocs: docs.length, limit: docs.length, totalPages: 1, page: 1, pagingCounter: 1, hasNextPage: false, hasPrevPage: false, prevPage: null, nextPage: null }
  }
}

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
  } catch {
    return DEMO_NEWS.find((n) => n.slug === slug) ?? null
  }
}

export async function getNewsBySlugDraft(slug: string): Promise<NewsItem | null> {
  const params = new URLSearchParams()
  params.append('where[slug][equals]', slug)
  params.append('draft', 'true')
  params.append('limit', '1')
  params.append('depth', '2')

  const res = await cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
    tags: [`noticias:${slug}:draft`],
    cache: 'no-store',
  })

  return res.docs[0] || null
}

export async function getNewsByQuery(
  q: string,
  options: { limit?: number } = {}
): Promise<PayloadResponse<NewsItem>> {
  const limit = options.limit ?? 12
  try {
    const params = new URLSearchParams()
    params.append('where[or][0][title][like]', q)
    params.append('where[or][1][summary][like]', q)
    params.append('where[_status][equals]', 'published')
    params.append('sort', '-publishedAt')
    params.append('limit', String(limit))
    params.append('depth', '2')

    return await cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
      tags: ['noticias-search'],
    })
  } catch {
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
