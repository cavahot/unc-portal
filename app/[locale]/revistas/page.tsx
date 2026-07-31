import { getT } from '@/lib/i18n/server'
import { getRevistas } from '@/lib/cms/queries/institutional'
import JournalCard from '@/components/institutional/JournalCard'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.revistas')
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  }
}

export default async function RevistasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.revistas')

  let docs: Awaited<ReturnType<typeof getRevistas>>['docs'] = []

  try {
    const res = await getRevistas()
    docs = res.docs ?? []
  } catch {
    // CMS unavailable — render empty state silently
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="mb-12">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('portalLabel')}</p>
          <h1 className="text-4xl font-bold text-white">{t('heading')}</h1>
          <p className="mt-2 text-white/50">{t('subheading')}</p>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-white/40">{t('empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((revista) => (
              <JournalCard
                key={revista.id}
                nombre={revista.nombre}
                descripcion={revista.descripcion}
                anioInicio={revista.anioInicio}
                urlOjs={revista.urlOjs}
                portada={revista.portada ? { url: revista.portada.url, alt: revista.portada.alt } : null}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
