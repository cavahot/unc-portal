import type { MetadataRoute } from 'next'
import { getNews } from '@/lib/cms/queries/news'
import { getCarreras } from '@/lib/cms/queries/carreras'
import { getFacultades } from '@/lib/cms/queries/facultades'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.unc.edu.py'

const LOCALES = ['es', 'en', 'pt-BR', 'gn'] as const

/**
 * Build hreflang alternates for a given path.
 * The default locale (es) uses no prefix: /path
 * Other locales use /{locale}/path
 */
function localeAlternates(path: string): Record<string, string> {
  const base = path === '' ? '' : path
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      locale === 'es' ? `${BASE_URL}${base || '/'}` : `${BASE_URL}/${locale}${base || ''}`,
    ]),
  )
}

const STATIC_ROUTES = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/noticias', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/carreras', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/facultades', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/buscar', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/transparencia', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/revistas', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/biblioteca', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/solicitar-titulo', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/informacion-publica', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/tramites', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/contacto', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/institucional', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/privacidad', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/accesibilidad', priority: 0.3, changeFrequency: 'yearly' as const },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path || '/'}`,
    lastModified: now,
    changeFrequency,
    priority,
    alternates: { languages: localeAlternates(path) },
  }))

  const [newsResult, carreras, facultades] = await Promise.all([
    getNews({ limit: 1000 }).catch(() => ({ docs: [] as Awaited<ReturnType<typeof getNews>>['docs'] })),
    getCarreras().catch(() => [] as Awaited<ReturnType<typeof getCarreras>>),
    getFacultades().catch(() => [] as Awaited<ReturnType<typeof getFacultades>>),
  ])

  const newsEntries: MetadataRoute.Sitemap = newsResult.docs.map((item) => ({
    url: `${BASE_URL}/noticias/${item.slug}`,
    lastModified: item.publishedAt ? new Date(item.publishedAt) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    alternates: { languages: localeAlternates(`/noticias/${item.slug}`) },
  }))

  const carreraEntries: MetadataRoute.Sitemap = carreras.map((c) => ({
    url: `${BASE_URL}/carreras/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    alternates: { languages: localeAlternates(`/carreras/${c.slug}`) },
  }))

  const facultadEntries: MetadataRoute.Sitemap = facultades.map((f) => ({
    url: `${BASE_URL}/facultades/${f.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    alternates: { languages: localeAlternates(`/facultades/${f.slug}`) },
  }))

  return [...staticEntries, ...newsEntries, ...carreraEntries, ...facultadEntries]
}
