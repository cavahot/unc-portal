import type { JSX } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { getT } from '@/lib/i18n/server'

/* ── generateMetadata ─────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.mision-vision')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/* ── Value icons (10 distinct SVGs) ──────────────────────────────────────── */

const VALUE_ICONS: Record<string, JSX.Element> = {
  v1: ( // Integridad — diamond
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="8.5" x2="22" y2="8.5" /><line x1="2" y1="15.5" x2="22" y2="15.5" />
    </svg>
  ),
  v2: ( // Transparencia — eye
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  v3: ( // Responsabilidad — scale
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="21" /><path d="M3 9h18" /><path d="M3 9l4 7a5 5 0 0 0 10 0l4-7" />
    </svg>
  ),
  v4: ( // Servicio — heart in hands
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  v5: ( // Honradez — medal / badge
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  v6: ( // Respeto — handshake
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M17 11H9a2 2 0 0 0 0 4h4" /><path d="M11 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /><path d="m16 5 2 2-6 6" /><path d="m21 2-2.5 2.5" />
    </svg>
  ),
  v7: ( // Solidaridad — link / chain
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  v8: ( // Compromiso — star
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  v9: ( // Participación — users
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  v10: ( // Igualdad — equals sign in circle
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  ),
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function MisionVisionValoresPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.mision-vision')

  const valueKeys = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'] as const

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 text-white sm:pt-32">
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

      {/* ── MISIÓN — dark manifesto block ────────────────────────────────── */}
      <section className="bg-[#09231D]">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-10 py-20 lg:flex-row lg:items-start lg:gap-20 lg:py-24">
              {/* Label column */}
              <div className="shrink-0 lg:w-48 lg:pt-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5CFF5C]/15 text-[#5CFF5C]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.23em] text-[#5CFF5C]">
                  {t('mission.label')}
                </p>
              </div>

              {/* Quote */}
              <blockquote className="relative flex-1">
                <span aria-hidden="true" className="absolute -left-4 -top-4 font-serif text-8xl leading-none text-[#5CFF5C]/20 select-none">&ldquo;</span>
                <p className="relative font-serif text-xl font-medium leading-[1.6] text-white sm:text-2xl lg:text-3xl">
                  {t('mission.quote')}
                </p>
              </blockquote>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── VISIÓN — light statement block ───────────────────────────────── */}
      <section className="bg-[#F4F7F5]">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-10 py-20 lg:flex-row-reverse lg:items-start lg:gap-20 lg:py-24">
              {/* Label column */}
              <div className="shrink-0 lg:w-48 lg:pt-2 lg:text-right">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004700]/10 text-[#004700] lg:ml-auto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('vision.label')}
                </p>
              </div>

              {/* Quote */}
              <blockquote className="relative flex-1">
                <span aria-hidden="true" className="absolute -left-4 -top-4 font-serif text-8xl leading-none text-[#008000]/15 select-none">&ldquo;</span>
                <p className="relative font-serif text-xl font-medium leading-[1.6] text-[#09231D] sm:text-2xl lg:text-3xl">
                  {t('vision.quote')}
                </p>
              </blockquote>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── VALORES — 5×2 grid ───────────────────────────────────────────── */}
      <section aria-labelledby="values-heading" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                {t('values.eyebrow')}
              </span>
              <h2
                id="values-heading"
                className="mt-4 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl"
              >
                {t('values.title')}
              </h2>
              <p className="mt-4 text-base leading-7 text-[#6C7B76]">
                {t('values.description')}
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {valueKeys.map((key, i) => (
              <Reveal key={key} delay={i * 40}>
                <div className="group flex h-full flex-col items-center rounded-[1.25rem] border border-[#D7E0DB] bg-white p-6 text-center shadow-[0_4px_16px_rgba(7,42,15,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#008000]/30 hover:shadow-[0_12px_32px_rgba(7,42,15,0.12)]">
                  {/* Number */}
                  <span className="mb-3 font-mono text-[0.65rem] font-bold tracking-[0.15em] text-[#B0BDB7]">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4F7F5] text-[#004700] transition-colors duration-300 group-hover:bg-[#E6FFE6] group-hover:text-[#008000]">
                    {VALUE_ICONS[key]}
                  </div>

                  {/* Name */}
                  <h3 className="mt-4 font-serif text-base font-bold leading-tight text-[#09231D]">
                    {t(`values.${key}.name`)}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-xs leading-5 text-[#6C7B76]">
                    {t(`values.${key}.description`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F7F5] py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left lg:items-center">
              <div className="flex-1">
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('cta.label')}
                </span>
                <h2 className="mt-3 font-serif text-2xl font-bold tracking-[-0.03em] text-[#09231D]">
                  {t('cta.title')}
                </h2>
                <p className="mt-3 text-base leading-7 text-[#6C7B76]">
                  {t('cta.description')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale === 'es' ? '' : locale + '/'}historia`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#004700] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  {t('cta.linkHistory')}
                </Link>
                <Link
                  href={`/${locale === 'es' ? '' : locale + '/'}autoridades`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D7E0DB] bg-white px-6 py-3 text-sm font-bold text-[#09231D] transition-colors hover:border-[#008000]/30 hover:bg-[#F4F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  {t('cta.linkAuthorities')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
