import { cmsFetch } from '../client'
import { PayloadResponse } from '../types'

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
} = {}): Promise<PayloadResponse<NewsItem>> {
  const params = new URLSearchParams()
  if (options.page) params.append('page', options.page.toString())
  if (options.limit) params.append('limit', (options.limit || 10).toString())
  if (options.featured !== undefined) {
    params.append('where[featured][equals]', options.featured.toString())
  }
  params.append('where[_status][equals]', 'published')
  params.append('sort', '-publishedAt')
  params.append('depth', '2')

  return cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
    tags: ['noticias'],
  })
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  const params = new URLSearchParams()
  params.append('where[slug][equals]', slug)
  params.append('where[_status][equals]', 'published')
  params.append('limit', '1')
  params.append('depth', '2')

  const res = await cmsFetch<PayloadResponse<NewsItem>>(`/noticias?${params.toString()}`, {
    tags: [`noticias:${slug}`],
  })

  return res.docs[0] || null
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
