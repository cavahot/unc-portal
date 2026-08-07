import Image from 'next/image'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getT, getF } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import { getNewsBySlug, getNewsBySlugDraft } from '@/lib/cms/queries/news'
import RichText from '@/components/RichText'
import { UNC_BLUR } from '@/lib/imagePlaceholder'
import NewsGallery from '@/components/news/NewsGallery'

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
    title: `${noticia.title} — UNC`,
    description: noticia.summary,
    openGraph: {
      title: noticia.title,
      description: noticia.summary,
      ...(noticia.featuredImage?.url || noticia.featuredImageUrl ? { images: [noticia.featuredImage?.url || noticia.featuredImageUrl] } : {}),
    },
  }
}

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

  const noticia = isDraft
    ? await getNewsBySlugDraft(slug).catch(() => null)
    : await getNewsBySlug(slug).catch(() => null)

  if (!noticia) notFound()

  // Use catalog categories when available, otherwise fall back to CMS value
  const categoryLabel = noticia.category
    ? (noticia.category in { institucional: 1, academica: 1, investigacion: 1, extension: 1, eventos: 1, comunicados: 1 }
        ? t(`categories.${noticia.category}` as any)
        : noticia.category)
    : null

  return (
    <div className="min-h-screen bg-slate-950">
      {isDraft && (
        <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between bg-amber-500 px-4 py-2 text-white">
          <span className="text-sm font-semibold">{t('draftBanner')}</span>
          <a
            href="/api/disable-preview"
            className="rounded bg-white px-3 py-1 text-xs font-bold text-amber-600 hover:bg-amber-50 transition"
          >
            {t('draftExit')}
          </a>
        </div>
      )}

      {/* Hero image */}
      {(noticia.featuredImage?.url || noticia.featuredImageUrl) && (
        <div className="relative h-72 w-full overflow-hidden sm:h-96 lg:h-[480px]">
          <Image
            src={noticia.featuredImage?.url || noticia.featuredImageUrl!}
            alt={noticia.featuredImage?.alt || noticia.title}
            fill
            sizes="100vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL={(noticia.featuredImage as any)?.blurDataURL ?? UNC_BLUR}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>
      )}

      <div className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 ${(noticia.featuredImage?.url || noticia.featuredImageUrl) ? '-mt-24 relative' : 'pt-28'} pb-20`}>

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-white/40">
          <Link href="/" className="hover:text-white transition-colors">{t('home')}</Link>
          <span>/</span>
          <Link href="/noticias" className="hover:text-white transition-colors">{t('heading')}</Link>
          <span>/</span>
          <span className="text-white/60 line-clamp-1">{noticia.title}</span>
        </nav>

        {/* Category */}
        {categoryLabel && (
          <span className="mb-4 inline-block rounded-full border border-[#5CFF5C]/30 bg-[#5CFF5C]/10 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-widest text-[#5CFF5C]">
            {categoryLabel}
          </span>
        )}

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {noticia.title}
        </h1>

        {/* Meta */}
        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-white/40">
          {noticia.publishedAt && (
            <time dateTime={noticia.publishedAt}>
              {format.dateTime(new Date(noticia.publishedAt), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
          {noticia.author && (
            <>
              <span>·</span>
              <span>{noticia.author}</span>
            </>
          )}
        </div>

        {/* Summary */}
        {noticia.summary && (
          <p className="mb-8 text-lg font-medium leading-relaxed text-white/70 border-l-4 border-[#5CFF5C] pl-4">
            {noticia.summary}
          </p>
        )}

        {/* Rich text content */}
        {noticia.content?.root && (
          <RichText content={noticia.content} className="prose-lg" />
        )}

        {/* Tags */}
        {noticia.tags && noticia.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {noticia.tags.map((item, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50"
              >
                {item.tag}
              </span>
            ))}
          </div>
        )}

        {/* Gallery */}
        {noticia.gallery && noticia.gallery.length > 0 && (
          <NewsGallery
            images={noticia.gallery
              .filter((item) => item.image?.url)
              .map((item) => ({
                url: item.image.url!,
                alt: item.image.alt ?? null,
                caption: item.caption ?? null,
                blurDataURL: (item.image as any).blurDataURL ?? null,
              }))}
            title={noticia.title}
          />
        )}

        {/* Back link */}
        <div className="mt-16 border-t border-white/10 pt-8">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-[#5CFF5C]/40 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToNews')}
          </Link>
        </div>
      </div>
    </div>
  )
}
