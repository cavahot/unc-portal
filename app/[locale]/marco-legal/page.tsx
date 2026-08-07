import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { getT } from '@/lib/i18n/server'
import { getLegalDocuments, CATEGORY_LABELS, type CategoryGroup, type DocCategory } from '@/lib/cms/queries/marcoLegal'

/* ── generateMetadata ─────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.marco-legal')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/* ── Category section ─────────────────────────────────────────────────────── */

function CategorySection({ group, downloadLabel }: { group: CategoryGroup; downloadLabel: string }) {
  return (
    <Reveal>
      <div className="mb-8">
        {/* Category header */}
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#004700]/10 text-[#004700]">
            <IconFolder />
          </span>
          <h2 className="text-base font-bold tracking-tight text-[#09231D]">
            {CATEGORY_LABELS[group.category as DocCategory]}
          </h2>
          <span className="ml-auto text-xs font-medium text-[#6C7B76]">
            {group.docs.length} {group.docs.length === 1 ? 'doc.' : 'docs.'}
          </span>
        </div>

        {/* Document list */}
        <div className="overflow-hidden rounded-xl border border-[#D7E0DB] bg-white">
          {group.docs.map((doc, idx) => {
            const href = doc.fileUrl ?? doc.externalUrl ?? '#'
            const isExternal = !doc.fileUrl && !!doc.externalUrl
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#F4F7F5] ${
                  idx > 0 ? 'border-t border-[#D7E0DB]/60' : ''
                }`}
              >
                {/* Row number */}
                <span className="w-5 shrink-0 text-center text-xs font-bold text-[#B0BDB7]">
                  {idx + 1}
                </span>

                {/* Title */}
                <p className="flex-1 text-sm leading-snug text-[#1E2D27]">
                  {doc.title}
                  {doc.description && (
                    <span className="mt-0.5 block text-xs text-[#6C7B76]">{doc.description}</span>
                  )}
                </p>

                {/* Download link */}
                {href !== '#' ? (
                  <a
                    href={href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D7E0DB] bg-[#F4F7F5] px-3 py-1.5 text-xs font-bold text-[#004700] transition-colors hover:border-[#008000]/30 hover:bg-[#E6FFE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                  >
                    <IconDownload />
                    {downloadLabel}
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-[#B0BDB7]">—</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Reveal>
  )
}

/* ── Static fallback (CMS unavailable) ───────────────────────────────────── */

const STATIC_GROUPS: CategoryGroup[] = []

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function MarcoLegalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.marco-legal')

  let groups: CategoryGroup[] = []
  let cmsAvailable = true

  try {
    groups = await getLegalDocuments()
  } catch {
    cmsAvailable = false
    groups = STATIC_GROUPS
  }

  const totalDocs = groups.reduce((sum, g) => sum + g.docs.length, 0)

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
              <li>
                <Link href={`/${locale === 'es' ? '' : locale + '/'}institucional`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.institutional')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">{t('hero.title')}</li>
            </ol>
          </nav>

          <Reveal>
            <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
              {t('hero.eyebrow')}
            </span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {t('hero.description')}
            </p>
            <p className="mt-4 text-sm text-white/50">
              {t('hero.softwareNote')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── DOCUMENTS ────────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-12 sm:pb-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">

          {/* Section header */}
          <Reveal>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('docs.eyebrow')}
                </span>
                <h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl">
                  {t('docs.heading')}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#6C7B76]">
                  {t('docs.description')}
                </p>
              </div>
              {totalDocs > 0 && (
                <span className="rounded-full border border-[#D7E0DB] bg-white px-4 py-1.5 text-sm font-semibold text-[#004700]">
                  {totalDocs} {t('docs.totalLabel')}
                </span>
              )}
            </div>
          </Reveal>

          {/* Category groups */}
          {groups.length === 0 ? (
            <Reveal>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D7E0DB] bg-white py-20 text-center">
                <p className="text-[#6C7B76]">{t('docs.empty')}</p>
              </div>
            </Reveal>
          ) : (
            groups.map((group) => (
              <CategorySection
                key={group.category}
                group={group}
                downloadLabel={t('docs.downloadLabel')}
              />
            ))
          )}

          {!cmsAvailable && (
            <Reveal>
              <p className="mt-2 text-center text-xs text-[#B0BDB7]">{t('docs.fallbackNote')}</p>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── INFO STRIP ───────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-[1.5rem] border border-[#D7E0DB] bg-[#F4F7F5] p-8 lg:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
                <div className="flex-1">
                  <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                    {t('info.eyebrow')}
                  </span>
                  <h2 className="mt-4 font-serif text-2xl font-bold tracking-[-0.03em] text-[#09231D]">
                    {t('info.title')}
                  </h2>
                  <p className="mt-3 text-base leading-7 text-[#6C7B76]">
                    {t('info.description')}
                  </p>
                </div>
                <div className="flex flex-col gap-3 lg:shrink-0">
                  <Link
                    href={`/${locale === 'es' ? '' : locale + '/'}tramites`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#004700] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                  >
                    {t('info.ctaTramites')}
                  </Link>
                  <Link
                    href={`/${locale === 'es' ? '' : locale + '/'}institucional`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D7E0DB] bg-white px-6 py-3 text-sm font-bold text-[#09231D] transition-colors hover:border-[#008000]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                  >
                    {t('info.ctaInstitutional')}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
