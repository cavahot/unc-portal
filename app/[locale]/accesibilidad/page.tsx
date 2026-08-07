import type { Metadata } from 'next'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.accesibilidad')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

export default async function AccesibilidadPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.accesibilidad')

  const featureKeys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const
  const featureIcons = ['🔤', '🎨', '🔗', '🅰️', '⌨️', '📱']

  return (
    <div className="min-h-screen bg-slate-950">
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('hero.label')}</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{t('hero.title')}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            {t('hero.description')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-white">{t('features.title')}</h2>
        <p className="mt-2 text-sm text-white/50">
          {t('features.description')}
        </p>

        <div className="mt-8 space-y-6">
          {featureKeys.map((key, i) => (
            <div key={key} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <span className="text-2xl" aria-hidden="true">{featureIcons[i]}</span>
              <div>
                <h3 className="font-semibold text-white">{t(`features.${key}.title`)}</h3>
                <p className="mt-1 text-sm leading-6 text-white/55">{t(`features.${key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 p-6">
          <h2 className="text-sm font-semibold text-[#8AFF8A]">{t('cta.title')}</h2>
          <p className="mt-2 text-sm text-white/60">
            {t('cta.description')}{' '}
            <a href="mailto:secgral@unc.edu.py" className="text-[#5CFF5C] underline-offset-2 hover:underline">
              secgral@unc.edu.py
            </a>{' '}
            {t('cta.subject')}
          </p>
        </div>
      </section>
    </div>
  )
}
