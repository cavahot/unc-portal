import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/i18n/server'
import Reveal from '@/components/motion/Reveal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.institucional')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/* =========================================================
   ICONS
   ========================================================= */

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconLightbulb() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

/* =========================================================
   SECTION CARD
   ========================================================= */

type SectionItem = {
  key: string
  href: string
  delay?: number
  label: string
  title: string
  description: string
  action: string
}

function SectionCard({ item }: { item: SectionItem }) {
  return (
    <Reveal delay={item.delay ?? 0}>
      <Link
        href={item.href}
        className="group flex h-full flex-col rounded-[1.25rem] border border-[#D7E0DB] bg-white p-8 shadow-[0_12px_36px_rgba(7,42,15,0.07)] transition-all duration-300 hover:border-[#37D448]/60 hover:shadow-[0_22px_50px_rgba(0,71,0,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
      >
        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
          {item.label}
        </p>

        <h3 className="mt-3 font-serif text-2xl font-bold leading-tight tracking-[-0.02em] text-[#09231D]">
          {item.title}
        </h3>

        <p className="mt-3 flex-1 text-sm leading-6 text-[#6C7B76]">
          {item.description}
        </p>

        <span className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#008000] transition-colors group-hover:text-[#004700]">
          {item.action}
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            <IconArrow />
          </span>
        </span>
      </Link>
    </Reveal>
  )
}

/* =========================================================
   VALUE CARD
   ========================================================= */

function ValueCard({
  icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay?: number
}) {
  return (
    <Reveal delay={delay}>
      <div className="flex gap-5 rounded-[1.25rem] border border-[#D7E0DB] bg-white p-6 shadow-[0_12px_36px_rgba(7,42,15,0.05)]">
        <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6FFE6] text-[#008000]">
          {icon}
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-[#09231D]">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-[#6C7B76]">{description}</p>
        </div>
      </div>
    </Reveal>
  )
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function InstitucionalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.institucional')

  const sectionItems: SectionItem[] = [
    {
      key: 'historia',
      href: `/${locale}/institucional/historia`,
      label: t('sections.items.historia.label'),
      title: t('sections.items.historia.title'),
      description: t('sections.items.historia.description'),
      action: t('sections.items.historia.action'),
      delay: 0,
    },
    {
      key: 'mision',
      href: `/${locale}/institucional/mision`,
      label: t('sections.items.mision.label'),
      title: t('sections.items.mision.title'),
      description: t('sections.items.mision.description'),
      action: t('sections.items.mision.action'),
      delay: 70,
    },
    {
      key: 'autoridades',
      href: `/${locale}/institucional/autoridades`,
      label: t('sections.items.autoridades.label'),
      title: t('sections.items.autoridades.title'),
      description: t('sections.items.autoridades.description'),
      action: t('sections.items.autoridades.action'),
      delay: 140,
    },
    {
      key: 'organigrama',
      href: `/${locale}/institucional/organigrama`,
      label: t('sections.items.organigrama.label'),
      title: t('sections.items.organigrama.title'),
      description: t('sections.items.organigrama.description'),
      action: t('sections.items.organigrama.action'),
      delay: 210,
    },
  ]

  const valueIcons = [
    <IconStar key="star" />,
    <IconUsers key="users" />,
    <IconLightbulb key="lightbulb" />,
    <IconHeart key="heart" />,
  ]

  const valueKeys = ['excelencia', 'inclusion', 'innovacion', 'compromiso'] as const

  return (
    <>
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-white/60">
              <li>
                <Link href={`/${locale}`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">
                {t('breadcrumb.page')}
              </li>
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
          ABOUT STRIP
          ===================================================== */}
      <section
        aria-labelledby="about-title"
        className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-16 sm:pb-24"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:items-center">
            <Reveal>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('about.label')}
                </span>

                <h2
                  id="about-title"
                  className="mt-4 font-serif text-3xl font-bold leading-tight tracking-[-0.03em] text-[#09231D] sm:text-4xl"
                >
                  {t('about.title')}
                </h2>

                <p className="mt-5 text-base leading-7 text-[#4A5C52]">
                  {t('about.description')}
                </p>
              </div>
            </Reveal>

            {/* Stats */}
            <Reveal delay={120}>
              <dl className="grid grid-cols-3 gap-4">
                {[
                  { value: t('about.founded'), label: t('about.foundedLabel') },
                  { value: t('about.location'), label: t('about.locationLabel') },
                  { value: t('about.status'), label: t('about.statusLabel') },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col rounded-[1.1rem] border border-[#D7E0DB] bg-white p-4 text-center shadow-[0_8px_24px_rgba(7,42,15,0.06)]"
                  >
                    <dt className="order-2 mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#6C7B76]">
                      {stat.label}
                    </dt>
                    <dd className="order-1 font-serif text-lg font-bold leading-tight text-[#004700]">
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
          SECTION CARDS
          ===================================================== */}
      <section
        aria-labelledby="sections-title"
        className="bg-white py-20 sm:py-24"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="sections-title"
                className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl"
              >
                {t('sections.title')}
              </h2>
              <p className="mt-4 text-base leading-7 text-[#6C7B76]">
                {t('sections.description')}
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sectionItems.map((item) => (
              <SectionCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          VALUES
          ===================================================== */}
      <section
        aria-labelledby="values-title"
        className="bg-[#F4F7F5] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                {t('values.label')}
              </span>
              <h2
                id="values-title"
                className="mt-4 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl"
              >
                {t('values.title')}
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {valueKeys.map((key, i) => (
              <ValueCard
                key={key}
                icon={valueIcons[i]}
                title={t(`values.items.${key}.title`)}
                description={t(`values.items.${key}.description`)}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
