import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.investigacion')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

export default async function InvestigacionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.investigacion')

  const areaKeys = ['a1', 'a2', 'a3', 'a4'] as const
  const areaIcons = ['🏥', '🌱', '⚙️', '📚']
  const projectKeys = ['p1', 'p2', 'p3'] as const

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

      {/* Líneas de investigación */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white">{t('lines.title')}</h2>
        <p className="mt-2 text-sm text-white/50">{t('lines.description')}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {areaKeys.map((key, i) => (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{areaIcons[i]}</span>
                <h3 className="font-semibold text-white">{t(`areas.${key}.area`)}</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {projectKeys.map((pk) => (
                  <li key={pk} className="flex items-start gap-2 text-sm text-white/55">
                    <span className="mt-0.5 shrink-0 text-[#5CFF5C]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {t(`areas.${key}.${pk}`)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#8AFF8A]">{t('cta.title')}</h2>
            <p className="mt-1 text-sm text-white/60">
              {t('cta.description')}
            </p>
          </div>
          <Link
            href="/contacto"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#5CFF5C] px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[#8AFF8A]"
          >
            {t('cta.link')} <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  )
}
