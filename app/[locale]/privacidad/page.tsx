import type { Metadata } from 'next'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.privacidad')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

export default async function PrivacidadPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.privacidad')

  const sectionKeys = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const

  return (
    <div className="min-h-screen bg-slate-950">
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('hero.label')}</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{t('hero.title')}</h1>
          <p className="mt-3 text-sm text-white/40">{t('hero.lastUpdated')}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {sectionKeys.map((key) => (
            <div key={key}>
              <h2 className="text-lg font-semibold text-white">{t(`sections.${key}.title`)}</h2>
              <p className="mt-3 text-base leading-7 text-white/60">{t(`sections.${key}.content`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
