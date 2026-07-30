import Link from 'next/link'
import Image from 'next/image'
import { getNews, getNewsByQuery } from '@/lib/cms/queries/news'
import { UNC_BLUR } from '@/lib/imagePlaceholder'

const CATEGORY_LABELS: Record<string, string> = {
  institucional: 'Institucional',
  academica: 'Académica',
  investigacion: 'Investigación',
  extension: 'Extensión',
  eventos: 'Eventos',
  comunicados: 'Comunicados',
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return {
    title: q ? `Búsqueda: "${q}" — UNC` : 'Buscar — Universidad Nacional de Concepción',
    description: 'Buscar noticias y contenido en el portal de la Universidad Nacional de Concepción.',
  }
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const { docs: results } = query
    ? await getNewsByQuery(query, { limit: 12 })
    : await getNews({ limit: 12 })

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Portal UNC</p>
          <h1 className="text-4xl font-bold text-white">
            {query ? (
              <>Resultados para <span className="text-[#5CFF5C]">&ldquo;{query}&rdquo;</span></>
            ) : (
              'Explorar noticias'
            )}
          </h1>
          {query && (
            <p className="mt-2 text-white/40">
              {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>

        {/* Search form */}
        <form method="GET" action="/buscar" className="mb-12">
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Buscar noticias..."
              aria-label="Buscar en el portal"
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#5CFF5C]/50 focus:outline-none focus:ring-1 focus:ring-[#5CFF5C]/50"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-[#5CFF5C]/40 hover:bg-[#5CFF5C]/10 hover:text-[#5CFF5C]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" strokeWidth={2} />
                <path d="m21 21-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
              </svg>
              Buscar
            </button>
          </div>
        </form>

        {/* Results */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" strokeWidth={1.5} />
                <path d="m21 21-4.35-4.35" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-white/60">
              No encontramos noticias para &ldquo;{query}&rdquo;
            </p>
            <p className="mt-2 text-sm text-white/30">Intentá con otras palabras</p>
            <Link
              href="/noticias"
              className="mt-6 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/60 transition-all hover:border-[#5CFF5C]/40 hover:text-white"
            >
              Ver todas las noticias
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((n) => (
              <Link
                key={n.id}
                href={`/noticias/${n.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
              >
                {n.featuredImage?.url ? (
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={n.featuredImage.url}
                      alt={n.featuredImage.alt || n.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL={UNC_BLUR}
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-[#004700]/30">
                    <svg className="h-12 w-12 text-[#5CFF5C]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6" />
                    </svg>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  {n.category && (
                    <span className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#5CFF5C]">
                      {CATEGORY_LABELS[n.category] ?? n.category}
                    </span>
                  )}
                  <h2 className="mb-2 line-clamp-3 text-[0.95rem] font-semibold leading-snug text-white transition-colors group-hover:text-[#8AFF8A]">
                    {n.title}
                  </h2>
                  {n.summary && (
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-white/45">{n.summary}</p>
                  )}
                  {n.publishedAt && (
                    <p className="mt-4 text-xs text-white/30">
                      {new Date(n.publishedAt).toLocaleDateString('es-PY', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
