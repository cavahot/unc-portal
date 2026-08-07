import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getConvenios, DEMO_CONVENIOS } from '@/lib/cms/queries/convenios'
import ConveniosTabsClient from '@/components/convenios/ConveniosTabsClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.convenios' })
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

function IconHandshake() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  )
}

export default async function ConveniosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.convenios' })

  const convenios = await getConvenios().catch(() => DEMO_CONVENIOS)

  const totalCount         = convenios.length
  const nacionalCount      = convenios.filter(c => c.type === 'nacional').length
  const internacionalCount = convenios.filter(c => c.type === 'internacional').length

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(92,255,92,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#5CFF5C]/6 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-white/35">
            <Link href={`/${locale === 'es' ? '' : locale}`} className="transition-colors hover:text-white/70">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white/55">{t('breadcrumb')}</span>
          </nav>

          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.06] px-3 py-1.5">
            <span className="text-[#5CFF5C]"><IconHandshake /></span>
            <span className="text-xs font-bold text-[#5CFF5C]">{t('hero.badge')}</span>
          </div>

          <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">
            {t('hero.description')}
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { value: totalCount,         label: t('stats.total') },
              { value: nacionalCount,      label: t('stats.nacional') },
              { value: internacionalCount, label: t('stats.internacional') },
            ].map(stat => (
              <div key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/35">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENT ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <ConveniosTabsClient
          convenios={convenios}
          translations={{
            tabs: {
              all:            t('tabs.all'),
              nacional:       t('tabs.nacional'),
              internacional:  t('tabs.internacional'),
            },
            card: {
              duration:     t('card.duration'),
              signed:       t('card.signed'),
              objective:    t('card.objective'),
              viewDocument: t('card.viewDocument'),
              noDocument:   t('card.noDocument'),
            },
            empty: {
              title:       t('empty.title'),
              description: t('empty.description'),
            },
          }}
        />
      </div>
    </div>
  )
}
