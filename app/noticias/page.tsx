import Link from 'next/link'
import { getNews } from '@/lib/cms/queries/news'

const CATEGORY_LABELS: Record<string, string> = {
  institucional: 'Institucional',
  academica: 'Académica',
  investigacion: 'Investigación',
  extension: 'Extensión',
  eventos: 'Eventos',
  comunicados: 'Comunicados',
}

export const metadata = {
  title: 'Noticias - Universidad Nacional de Concepción',
  description: 'Novedades y comunicados institucionales de la UNC.',
}

export default async function NoticiasPage() {
  let noticias: Awaited<ReturnType<typeof getNews>>['docs'] = []

  try {
    const res = await getNews({ limit: 24 })
    noticias = res.docs ?? []
  } catch {
    // CMS no disponible — estado vacío
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-12">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Portal UNC</p>
          <h1 className="text-4xl font-bold text-white">Noticias</h1>
          <p className="mt-2 text-white/50">Novedades y comunicados de la Universidad Nacional de Concepción</p>
        </div>

        {noticias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6" />
              </svg>
            </div>
            <p className="text-white/40">No hay noticias disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {noticias.map((n) => (
              <Link
                key={n.id}
                href={`/noticias/${n.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
              >
                {n.featuredImage?.url ? (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={n.featuredImage.url}
                      alt={n.featuredImage.alt || n.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-[#004700]/30">
                    <svg className="h-12 w-12 text-[#5CFF5C]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
