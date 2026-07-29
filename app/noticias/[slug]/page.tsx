import Link from 'next/link'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getNewsBySlug, getNewsBySlugDraft } from '@/lib/cms/queries/news'
import RichText from '@/components/RichText'

const CATEGORY_LABELS: Record<string, string> = {
  institucional: 'Institucional',
  academica: 'Académica',
  investigacion: 'Investigación',
  extension: 'Extensión',
  eventos: 'Eventos',
  comunicados: 'Comunicados',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const noticia = await getNewsBySlug(slug).catch(() => null)
  if (!noticia) return { title: 'Noticia no encontrada' }
  return {
    title: `${noticia.title} — UNC`,
    description: noticia.summary,
    openGraph: {
      title: noticia.title,
      description: noticia.summary,
      ...(noticia.featuredImage?.url ? { images: [noticia.featuredImage.url] } : {}),
    },
  }
}

export default async function NoticiaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { isEnabled: isDraft } = await draftMode()

  const noticia = isDraft
    ? await getNewsBySlugDraft(slug).catch(() => null)
    : await getNewsBySlug(slug).catch(() => null)

  if (!noticia) notFound()

  const categoryLabel = noticia.category
    ? (CATEGORY_LABELS[noticia.category] ?? noticia.category)
    : null

  return (
    <div className="min-h-screen bg-slate-950">
      {isDraft && (
        <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between bg-amber-500 px-4 py-2 text-white">
          <span className="text-sm font-semibold">Vista previa — esta noticia no está publicada</span>
          <a
            href="/api/disable-preview"
            className="rounded bg-white px-3 py-1 text-xs font-bold text-amber-600 hover:bg-amber-50 transition"
          >
            Salir del preview
          </a>
        </div>
      )}

      {/* Imagen hero */}
      {noticia.featuredImage?.url && (
        <div className="relative h-72 w-full overflow-hidden sm:h-96 lg:h-[480px]">
          <img
            src={noticia.featuredImage.url}
            alt={noticia.featuredImage.alt || noticia.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>
      )}

      <div className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 ${noticia.featuredImage?.url ? '-mt-24 relative' : 'pt-28'} pb-20`}>

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-white/40">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/noticias" className="hover:text-white transition-colors">Noticias</Link>
          <span>/</span>
          <span className="text-white/60 line-clamp-1">{noticia.title}</span>
        </nav>

        {/* Categoría */}
        {categoryLabel && (
          <span className="mb-4 inline-block rounded-full border border-[#5CFF5C]/30 bg-[#5CFF5C]/10 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-widest text-[#5CFF5C]">
            {categoryLabel}
          </span>
        )}

        {/* Título */}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {noticia.title}
        </h1>

        {/* Meta */}
        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-white/40">
          {noticia.publishedAt && (
            <time dateTime={noticia.publishedAt}>
              {new Date(noticia.publishedAt).toLocaleDateString('es-PY', {
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

        {/* Resumen */}
        {noticia.summary && (
          <p className="mb-8 text-lg font-medium leading-relaxed text-white/70 border-l-4 border-[#5CFF5C] pl-4">
            {noticia.summary}
          </p>
        )}

        {/* Contenido richtext */}
        {noticia.content?.root && (
          <RichText content={noticia.content} className="prose-lg" />
        )}

        {/* Etiquetas */}
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

        {/* Galería */}
        {noticia.gallery && noticia.gallery.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-4 text-lg font-semibold text-white">Galería</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {noticia.gallery.map((item, i) => (
                <div key={i} className="overflow-hidden rounded-xl">
                  {item.image.url && (
                    <img
                      src={item.image.url}
                      alt={item.caption || item.image.alt || ''}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  {item.caption && (
                    <p className="mt-1 text-xs text-white/40">{item.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Volver */}
        <div className="mt-16 border-t border-white/10 pt-8">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-[#5CFF5C]/40 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ver más noticias
          </Link>
        </div>
      </div>
    </div>
  )
}
