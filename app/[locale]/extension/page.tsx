import type { Metadata } from 'next'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.extension')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

export default async function ExtensionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.extension')

  const programKeys = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const
  const programIcons = ['🏫', '🤝', '🎨', '🏥', '⚖️', '🌾']

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

      {/* Programas */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white">{t('programs.title')}</h2>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programKeys.map((key, i) => (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <span className="text-3xl" aria-hidden="true">{programIcons[i]}</span>
              <h3 className="mt-4 font-semibold text-white">{t(`programs.${key}.titulo`)}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{t(`programs.${key}.descripcion`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 p-6">
          <h2 className="text-sm font-semibold text-[#8AFF8A]">{t('cta.title')}</h2>
          <p className="mt-1 text-sm text-white/60">
            {t('cta.description')}{' '}
            <a href="mailto:secgral@unc.edu.py" className="text-[#5CFF5C] underline-offset-2 hover:underline">
              secgral@unc.edu.py
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
