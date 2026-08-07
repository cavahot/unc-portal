import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { getT } from '@/lib/i18n/server'
import { OrgChart } from '@/components/organigrama/OrgChart'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.organigrama')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

export default async function OrganigramaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.organigrama')

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-white/60">
              <li>
                <Link href={`/${locale === 'es' ? '' : locale}`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">{t('breadcrumb.page')}</li>
            </ol>
          </nav>

          <Reveal>
            <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
              {t('hero.label')}
            </span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {t('hero.description')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── ORG CHART ────────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-16 sm:pb-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-8">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                {t('chart.label')}
              </span>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl">
                {t('chart.title')}
              </h2>
            </div>
          </Reveal>

          <OrgChart />
        </div>
      </section>

      {/* ── LINKS ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={`/${locale === 'es' ? '' : locale + '/'}autoridades`}
                className="inline-flex items-center gap-2 rounded-full bg-[#004700] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
              >
                {t('links.seeAuthorities')}
              </Link>
              <Link
                href={`/${locale === 'es' ? '' : locale + '/'}institucional`}
                className="inline-flex items-center gap-2 rounded-full border border-[#D7E0DB] bg-[#F4F7F5] px-6 py-3 text-sm font-bold text-[#09231D] transition-colors hover:border-[#008000]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
              >
                {t('links.backToInstitucional')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
