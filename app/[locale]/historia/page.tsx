// LT-01: la sección «Línea de tiempo» lee el CMS (docs/specs/portal/LINEA-TIEMPO.md); el resto de la página sigue en i18n.
import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import HistoriaTimeline from '@/components/institutional/HistoriaTimeline'
import { getT } from '@/lib/i18n/server'
import { yearSpan } from '@/lib/cms/lineaTiempo'
import { getTimeline } from '@/lib/cms/queries/lineaTiempo'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

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
   PAGE
   ========================================================= */

export default async function HistoriaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.historia')

  // LT-01: los hitos vienen del CMS (colección `linea-tiempo`); nunca lanza (ok / empty / unavailable).
  const timeline = await getTimeline(locale)
  const span = timeline.status === 'ok' ? yearSpan(timeline.milestones) : null
  const count = timeline.status === 'ok' ? timeline.milestones.length : 0
  const countLabel = count === 1 ? t('timeline.countOne') : t('timeline.countOther', { count })

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
      {/* LT-01: hitos desde el CMS. `empty` oculta la sección (retiro deliberado del PO); `unavailable` deja el
          encabezado y un aviso neutro (caída temporal). Nunca hitos escritos en el código. */}
      {timeline.status !== 'empty' && (
        <section aria-labelledby="timeline-title" className="bg-white py-20 sm:py-28 print:py-8">
          <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:px-8">
            {/* Encabezado fijo al desplazar en pantallas anchas: el título y el rango de años acompañan la lectura.
                Sin <Reveal>: no debe quedar oculto sin JS (RDD-MLG-05). */}
            <header className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start print:static">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                {t('timeline.label')}
              </span>
              <h2
                id="timeline-title"
                className="mt-4 font-serif text-4xl font-bold leading-[1.02] tracking-[-0.035em] text-[#09231D] sm:text-5xl"
              >
                {t('timeline.title')}
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-[#33413A] sm:text-lg sm:leading-8">
                {t('timeline.description')}
              </p>
              {span && (
                <p className="mt-8 border-t-[3px] border-[#004700] pt-4 sm:mt-10">
                  <span className="block font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] [font-variant-numeric:lining-nums_tabular-nums] sm:text-4xl">
                    {span.from === span.to ? span.from : `${span.from}–${span.to}`}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#2F5F3A]">{countLabel}</span>
                </p>
              )}
            </header>

            <div className="mt-14 lg:col-span-8 lg:mt-2">
              {timeline.status === 'ok' ? (
                <HistoriaTimeline
                  milestones={timeline.milestones}
                  labels={{ moreInfo: t('timeline.moreInfo'), newTab: t('timeline.newTab') }}
                />
              ) : (
                <p role="status" className="rounded-2xl bg-[#F4F7F5] p-6 text-base leading-7 text-[#33413A] sm:p-8">
                  {t('timeline.unavailable')}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

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
