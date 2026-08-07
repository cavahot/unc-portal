import type { Metadata } from 'next'
import { getT } from '@/lib/i18n/server'
import FacultadTabs from '@/components/tramites/FacultadTabs'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.tramites')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

export default async function TramitesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.tramites')

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            {t('hero.label')}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            {t('hero.description')}
          </p>
        </div>
      </section>

      {/* Faculty tabs + tramite cards */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <FacultadTabs />

        {/* Help box */}
        <div className="mt-14 rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 p-6">
          <h2 className="text-sm font-semibold text-[#8AFF8A]">{t('help.title')}</h2>
          <p className="mt-1 text-sm text-white/60">
            {t('help.description')}{' '}
            <a
              href="mailto:secgral@unc.edu.py"
              className="text-[#5CFF5C] underline-offset-2 hover:underline"
            >
              secgral@unc.edu.py
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
