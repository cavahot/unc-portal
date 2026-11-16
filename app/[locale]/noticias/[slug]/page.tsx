import Image from 'next/image'
import { cookies, draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getT, getF } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import PageHero from '@/components/pages/PageHero'
import { getNewsBySlug, getNewsBySlugDraft, getNewsSlugs } from '@/lib/cms/queries/news'
import { safeStaticParams, NEWS_PRERENDER_LIMIT } from '@/lib/cms/staticParams'
import RichText from '@/components/RichText'
import { UNC_BLUR } from '@/lib/imagePlaceholder'
import NewsGallery from '@/components/news/NewsGallery'
import { baseOg } from '@/lib/seo/og'
import { routing } from '@/i18n/routing'
import { buildNewsArticleSchema, buildBreadcrumbSchema, safeJsonLd } from '@/lib/seo/jsonld'

// ISR: revalidate every hour. On-demand slugs (published after build) are
// generated at first request and then cached for `revalidate` seconds.
export const revalidate = 3600

// Allow slugs not returned by generateStaticParams to be rendered on-demand.
export const dynamicParams = true

const KNOWN_CATEGORIES = new Set(['institucional', 'academica', 'investigacion', 'extension', 'eventos', 'comunicados'])

// DEP-15: si el CMS no responde durante el build devuelve [] (rutas bajo demanda)
// en lugar de lanzar y abortar `next build`.
export async function generateStaticParams() {
  return safeStaticParams(async () => {
    // PERF-DB: solo las más recientes (getNewsSlugs ordena por -publishedAt); el resto, bajo demanda.
    const slugs = await getNewsSlugs(NEWS_PRERENDER_LIMIT)
    // Generate one entry per locale × slug so Next.js pre-renders all combinations.
    return routing.locales.flatMap((locale) =>
      slugs.map((slug) => ({ locale, slug })),
    )
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getT(locale, 'pages.noticias')
  const noticia = await getNewsBySlug(slug).catch(() => null)
  if (!noticia) return { title: t('empty') }
  return {
    title: `${noticia.title}`,
    description: noticia.summary,
    openGraph: {
      ...baseOg(locale),
      title: noticia.title,
      description: noticia.summary,
      ...(noticia.featuredImage?.url || noticia.featuredImageUrl ? { images: [noticia.featuredImage?.url || noticia.featuredImageUrl] } : {}),
    },
  }
}

// INST-03: detalle de noticia en el sistema visual del portal. Cabecera compartida (`PageHero`, con migas de tres niveles
// y título más chico para titulares largos), imagen principal, texto en columna de lectura (≈65 caracteres por línea),
// etiquetas, galería y regreso al listado. El resumen es la entradilla de la cabecera (antes se repetía sobre el texto).
// Datos: sin cambios (`getNewsBySlug`; en vista previa, `getNewsBySlugDraft`). Una caída del CMS propaga el error a
// `error.tsx` de /noticias en vez de cachear un 404 (DEP-15). El aviso amarillo de vista previa se mantiene.
export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const [t, format] = await Promise.all([
    getT(locale, 'pages.noticias'),
    getF(locale),
  ])

  const { isEnabled: isDraft } = await draftMode()

  // DEP-02b: con draftMode activo se reenvía el payload-token del editor (leído
  // de su cookie, solo en esta rama para no volver dinámica la página pública)
  // al CMS, que decide el acceso (DEP-02). Sin token o con 401/403 se cae al
  // contenido publicado. El token no se registra ni se pasa a componentes.
  let noticia = null
  if (isDraft) {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value
    if (payloadToken) {
      noticia = await getNewsBySlugDraft(slug, payloadToken).catch(() => null)
    }
  }
  // Fall back to published content when not in draft, or when CMS auth check fails.
  // DEP-15: sin `.catch`: «no existe» devuelve null (404) pero una caída del CMS
  // propaga el error, así Next no cachea un 404 durante `revalidate` (1 h).
  if (!noticia) {
    noticia = await getNewsBySlug(slug)
  }

  if (!noticia) notFound()

  // Categoría: la del catálogo traducido si existe; si no, el valor del CMS.
  const categoryLabel = noticia.category
    ? (KNOWN_CATEGORIES.has(noticia.category) ? t(`categories.${noticia.category}`) : noticia.category)
    : null
  const dateText = noticia.publishedAt
    ? format.dateTime(new Date(noticia.publishedAt), { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  // Línea de datos de la cabecera: categoría · fecha · autoría (solo lo que existe).
  const byline = [categoryLabel, dateText, noticia.author].filter(Boolean).join(' · ') || null
  const imageUrl = noticia.featuredImage?.url || noticia.featuredImageUrl || null
  const homeHref = `/${locale === 'es' ? '' : locale}`

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.unc.edu.py'
  const newsArticleSchema = buildNewsArticleSchema({
    title: noticia.title,
    description: noticia.summary,
    slug,
    publishedAt: noticia.publishedAt,
    author: noticia.author,
    imageUrl,
    locale,
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t('breadcrumb.inicio'), url: SITE_URL },
    { name: t('breadcrumb.nombre'), url: `${SITE_URL}/noticias` },
    { name: noticia.title, url: `${SITE_URL}/noticias/${slug}` },
  ])

  // Galería: imagen principal + imágenes de la galería en un solo carrusel.
  const featuredItem = imageUrl
    ? [{ url: imageUrl, alt: noticia.featuredImage?.alt ?? noticia.title, caption: null, blurDataURL: (noticia.featuredImage as { blurDataURL?: string } | null | undefined)?.blurDataURL ?? null }]
    : []
  const galleryItems = (noticia.gallery ?? [])
    .filter((item) => item.image?.url)
    .map((item) => ({
      url: item.image.url!,
      alt: item.image.alt ?? null,
      caption: item.caption ?? null,
      blurDataURL: (item.image as { blurDataURL?: string }).blurDataURL ?? null,
    }))
  const allImages = [...featuredItem, ...galleryItems]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(newsArticleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      {isDraft && (
        <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between bg-amber-500 px-4 py-2 text-white">
          <span className="text-sm font-semibold">{t('draftBanner')}</span>
          <a href="/api/disable-preview" className="rounded bg-white px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-50">
            {t('draftExit')}
          </a>
        </div>
      )}

      <PageHero
        homeHref={homeHref}
        homeLabel={t('breadcrumb.inicio')}
        parent={{ href: `${homeHref === '/' ? '' : homeHref}/noticias`, label: t('breadcrumb.nombre') }}
        pageName={noticia.title}
        title={noticia.title}
        titleSize="md"
        description={noticia.summary || null}
        note={byline}
      />

      <article className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {imageUrl && (
            <figure className="mx-auto mb-12 max-w-5xl">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#E3EDE7]">
                <Image
                  src={imageUrl}
                  alt={noticia.featuredImage?.alt || ''}
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={(noticia.featuredImage as { blurDataURL?: string } | null | undefined)?.blurDataURL ?? UNC_BLUR}
                  priority
                />
              </div>
            </figure>
          )}

          <div className="mx-auto max-w-[68ch]">
            {noticia.content?.root && <RichText content={noticia.content} />}

            {noticia.tags && noticia.tags.length > 0 && (
              <ul aria-label={t('tagsLabel')} className="mt-10 flex flex-wrap gap-2">
                {noticia.tags.map((item, i) => (
                  <li key={i} className="rounded-full border border-[#D7E0DB] bg-white px-3 py-1 text-sm text-[#3E4A45]">
                    {item.tag}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {allImages.length > 0 && (
            <div className="mx-auto mt-14 max-w-5xl">
              <NewsGallery images={allImages} title={noticia.title} />
            </div>
          )}

          <div className="mx-auto mt-14 max-w-[68ch] border-t border-[#D7E0DB] pt-8 print:hidden">
            <Link
              href="/noticias"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              <span aria-hidden="true">←&nbsp;</span>
              {t('backToNews')}
            </Link>
          </div>
        </div>
      </article>
    </>
  )
}
