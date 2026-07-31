import { getT } from '@/lib/i18n/server'
import { getTesisByQuery } from '@/lib/cms/queries/institutional'
import ThesisCard from '@/components/institutional/ThesisCard'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.biblioteca')
  return {
    title: q ? t('pageTitleQuery', { q }) : t('pageTitleDefault'),
    description: t('pageDescription'),
  }
}

export default async function BibliotecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.biblioteca')

  const query = q?.trim() ?? ''

  let docs: Awaited<ReturnType<typeof getTesisByQuery>>['docs'] = []

  if (query) {
    try {
      const res = await getTesisByQuery(query, { limit: 12 })
      docs = res.docs ?? []
    } catch {
      // CMS unavailable — render empty state silently
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="mb-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('portalLabel')}</p>
          <h1 className="text-4xl font-bold text-white">
            {query ? (
              <>{t('headingResults')} <span className="text-[#5CFF5C]">&ldquo;{query}&rdquo;</span></>
            ) : (
              t('headingDefault')
            )}
          </h1>
          {!query && (
            <p className="mt-2 text-white/50">{t('subheading')}</p>
          )}
          {query && (
            <p className="mt-2 text-white/40">
              {docs.length} {docs.length === 1 ? t('resultsSingular') : t('resultsPlural')}
            </p>
          )}
        </div>

        {/* Search form */}
        <form method="GET" action="/biblioteca" className="mb-12">
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchAriaLabel')}
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
              {t('searchButton')}
            </button>
          </div>
        </form>

        {/* Results / empty state */}
        {!query ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-white/40">{t('emptyPrompt')}</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" strokeWidth={1.5} />
                <path d="m21 21-4.35-4.35" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-white/60">
              {t('noResults', { query })}
            </p>
            <p className="mt-2 text-sm text-white/30">{t('noResultsHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((tesis) => (
              <ThesisCard
                key={tesis.id}
                titulo={tesis.titulo}
                autor={tesis.autor}
                anio={tesis.anio}
                facultad={tesis.facultad}
                urlPdf={tesis.urlPdf}
                resumen={tesis.resumen}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
