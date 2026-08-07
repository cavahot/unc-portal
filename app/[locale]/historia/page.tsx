import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.historia')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/* =========================================================
   ICONS
   ========================================================= */

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function HistoriaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.historia')

  const milestones = [
    { year: '2007', title: t('timeline.m1.title'), description: t('timeline.m1.description') },
    { year: '2008', title: t('timeline.m2.title'), description: t('timeline.m2.description') },
    { year: '2010', title: t('timeline.m3.title'), description: t('timeline.m3.description') },
    { year: '2015', title: t('timeline.m4.title'), description: t('timeline.m4.description') },
    { year: '2024', title: t('timeline.m5.title'), description: t('timeline.m5.description') },
  ]

  return (
    <>
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-white/60">
              <li>
                <Link href={`/${locale}`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
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

      {/* =====================================================
          INTRO
          ===================================================== */}
      <section className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-16 sm:pb-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:items-start">
            <Reveal>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('intro.label')}
                </span>
                <h2 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-[-0.03em] text-[#09231D] sm:text-4xl">
                  {t('intro.title')}
                </h2>
                <p className="mt-5 text-base leading-7 text-[#4A5C52]">
                  {t('intro.body1')}
                </p>
                <p className="mt-4 text-base leading-7 text-[#4A5C52]">
                  {t('intro.body2')}
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { value: '2007', label: t('intro.statFounded') },
                  { value: '6', label: t('intro.statFaculties') },
                  { value: '+5.000', label: t('intro.statStudents') },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col rounded-[1.1rem] border border-[#D7E0DB] bg-white p-4 text-center shadow-[0_8px_24px_rgba(7,42,15,0.06)]"
                  >
                    <dt className="order-2 mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#6C7B76]">
                      {stat.label}
                    </dt>
                    <dd className="order-1 font-serif text-2xl font-bold leading-tight text-[#004700]">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================
          TIMELINE
          ===================================================== */}
      <section aria-labelledby="timeline-title" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                {t('timeline.label')}
              </span>
              <h2
                id="timeline-title"
                className="mt-4 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl"
              >
                {t('timeline.title')}
              </h2>
              <p className="mt-4 text-base leading-7 text-[#6C7B76]">
                {t('timeline.description')}
              </p>
            </div>
          </Reveal>

          <div className="mt-14 relative">
            <div aria-hidden="true" className="absolute left-5 top-0 h-full w-px bg-[#D7E0DB] lg:left-1/2" />

            <ol className="space-y-12">
              {milestones.map((milestone, i) => (
                <li key={milestone.year} className={`relative flex gap-8 ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                  <Reveal delay={i * 80}>
                    <div aria-hidden="true" className="absolute left-5 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#008000] bg-white shadow-[0_0_0_4px_#E6FFE6] lg:left-1/2">
                      <span className="text-[#008000]">
                        <IconCalendar />
                      </span>
                    </div>

                    <div className={`ml-12 w-full lg:ml-0 lg:w-[calc(50%-2.5rem)] ${i % 2 === 0 ? 'lg:pr-10 lg:text-right' : 'lg:pl-10 lg:text-left'}`}>
                      <div className="rounded-[1.25rem] border border-[#D7E0DB] bg-white p-6 shadow-[0_12px_36px_rgba(7,42,15,0.07)]">
                        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#008000]">
                          {milestone.year}
                        </p>
                        <h3 className="mt-2 font-serif text-xl font-bold text-[#09231D]">
                          {milestone.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#6C7B76]">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* =====================================================
          MISSION STRIP
          ===================================================== */}
      <section className="bg-[#F4F7F5] py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-[1.5rem] bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] p-10 text-white shadow-[0_24px_60px_rgba(0,71,0,0.25)] lg:p-14">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
                {t('mission.label')}
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
                {t('mission.title')}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/80">
                {t('mission.body')}
              </p>
              <div className="mt-8">
                <Link
                  href={`/${locale}/mision-vision-y-valores`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  {t('mission.cta')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
