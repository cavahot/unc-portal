// INST-10: conversión de una noticia del CMS a una fila de `NewsList`. Pura, sin red ni React.
// Qué hace: arma la fila con la imagen (la del CMS o la URL de respaldo), el texto alternativo, el marcador de carga, la
// categoría ya traducida y la fecha ya formateada. La comparten /noticias y /buscar para que ambas listas se vean y se
// comporten igual.
// Límite: no traduce ni formatea (recibe `categoryText` y `dateText` resueltos) ni valida las URL de imagen: eso lo hace
// `normalizeNewsMedia` al leer del CMS.
import type { NewsListItem } from '@/components/news/NewsList'
import type { NewsListItem as CmsNewsItem } from '@/lib/cms/queries/news'

export function toNewsListItem(n: CmsNewsItem, texts: { categoryText: string | null; dateText: string | null }): NewsListItem {
  const image = n.featuredImage?.url || n.featuredImageUrl || null
  return {
    id: n.id,
    slug: n.slug,
    title: n.title,
    summary: n.summary,
    imageUrl: image,
    imageAlt: n.featuredImage?.alt || null,
    blurDataURL: (n.featuredImage as { blurDataURL?: string } | null | undefined)?.blurDataURL ?? null,
    categoryText: texts.categoryText,
    dateTime: n.publishedAt ?? null,
    dateText: texts.dateText,
  }
}
