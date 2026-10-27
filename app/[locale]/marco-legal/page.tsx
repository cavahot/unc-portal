// MLG-01: página pública «Marco legal» conectada al CMS (spec docs/specs/portal/MARCO-LEGAL.md).
// DEP-15: todo href que proviene del CMS pasa por safeHref (bloquea javascript:/data:) además de la allowlist.
import { safeHref } from '@/lib/security/safeUrl'
import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import MarcoLegalBrowser, { type MarcoLegalLabels, type MarcoLegalViewGroup } from '@/components/institutional/MarcoLegalBrowser'
import { getT } from '@/lib/i18n/server'
import { splitTitulo, type CategoryGroup, type DocCategory } from '@/lib/cms/marcoLegal'
import { getLegalDocumentSections } from '@/lib/cms/queries/marcoLegal'

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

type T = Awaited<ReturnType<typeof getT>>

/**
 * Escalones de la jerarquía normativa que se dibuja en la portada: de la norma que crea la Universidad a los
 * instrumentos de gestión. Es la firma visual de la página y, a la vez, un índice con conteos reales.
 */
const HIERARCHY: Array<{ tier: string; categories: DocCategory[] }> = [
  { tier: 'creacion', categories: ['ley-creacion'] },
  { tier: 'fundamental', categories: ['estatuto'] },
  { tier: 'general', categories: ['reglamento-general'] },
  { tier: 'especificas', categories: ['reglamentos-especiales', 'codigos', 'politicas'] },
  { tier: 'gestion', categories: ['planes', 'manuales', 'procedimientos', 'protocolos'] },
]

/** Ancho de cada escalón (de angosto a ancho): la forma de pirámide comunica la jerarquía sin texto extra. */
const TIER_WIDTH = ['lg:w-[44%]', 'lg:w-[58%]', 'lg:w-[72%]', 'lg:w-[86%]', 'lg:w-full']
const TIER_TONE = ['bg-white/[0.16]', 'bg-white/[0.13]', 'bg-white/[0.10]', 'bg-white/[0.08]', 'bg-white/[0.06]']

/**
 * Fecha del documento en el idioma de la página. Se formatea en el servidor (no en el cliente) para que el
 * HTML hidratado coincida; `gn` no tiene datos de Intl en todos los motores y usa es-PY.
 */
function formatDay(day: string, locale: string): string {
  const tag = locale === 'gn' ? 'es-PY' : locale
  try {
    return new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
  } catch {
    return day
  }
}

/** Convierte los grupos del dominio en el modelo de vista serializable del cliente (cadenas ya traducidas). */
function toViewGroups(groups: CategoryGroup[], t: T, locale: string): MarcoLegalViewGroup[] {
  return groups.map((g) => ({
    category: g.category,
    label: t(`categories.${g.category}`),
    description: t(`categoryDescriptions.${g.category}`),
    docs: g.docs
      .map((d) => {
        const href = safeHref(d.href)
        if (href === '#') return null
        const split = g.category === 'reglamento-general' ? splitTitulo(d.title) : null
        const formatLabel = t(`format.${d.format}`)
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          nota: d.nota,
          href,
          formatLabel,
          estado: d.estado,
          estadoLabel: d.estado === 'vigente' ? null : t(`estado.${d.estado}`),
          dateLabel: d.fechaDocumento ? t('docs.dated', { date: formatDay(d.fechaDocumento, locale) }) : null,
          numeral: split?.numeral ?? null,
          heading: split?.heading ?? null,
          tituloLabel: split ? t('docs.titulo', { numeral: split.numeral }) : null,
          downloadAria: t('docs.downloadAria', { title: d.title, format: formatLabel }),
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
  })).filter((g) => g.docs.length > 0)
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function MarcoLegalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.marco-legal')
  const prefix = locale === 'es' ? '' : `${locale}/`

  const result = await getLegalDocumentSections()
  const groups = result.status === 'ok' ? toViewGroups(result.groups, t, locale) : []
  const total = groups.reduce((n, g) => n + g.docs.length, 0)
  const counts = new Map(groups.map((g) => [g.category, g.docs.length]))

  const labels: MarcoLegalLabels = {
    searchLabel: t('search.label'),
    placeholder: t('search.placeholder'),
    clear: t('search.clear'),
    statusAll: t('search.statusAll', { total, categories: groups.length }),
    statusOne: t('search.statusOne', { query: '{query}' }),
    statusOther: t('search.statusOther', { count: '{count}', query: '{query}' }),
    statusNone: t('search.statusNone', { query: '{query}' }),
    emptyTitle: t('search.emptyTitle', { query: '{query}' }),
    emptyHint: t('search.emptyHint'),
    showAll: t('search.showAll'),
    indexLabel: t('index.label'),
    countOne: t('docs.countOne'),
    countOther: t('docs.countOther', { count: '{count}' }),
    download: t('docs.download'),
  }

  const tiers = HIERARCHY.map((h, i) => ({ ...h, index: i, categories: h.categories.filter((c) => counts.has(c)) })).filter(
    (h) => h.categories.length > 0,
  )

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 text-white sm:pt-32 lg:pb-28 print:bg-none print:pb-4 print:pt-0 print:text-black">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl print:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl print:hidden" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 print:hidden">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/75">
              <li>
                <Link href={`/${locale === 'es' ? '' : locale}`} className="rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]">
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none text-white/50">/</li>
              <li>
                <Link href={`/${prefix}institucional`} className="rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]">
                  {t('breadcrumb.institutional')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none text-white/50">/</li>
              <li className="font-semibold text-white" aria-current="page">{t('hero.title')}</li>
            </ol>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-end lg:gap-16">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8] print:text-black">
                {t('hero.eyebrow')}
              </span>
              <h1 className="mt-4 text-balance font-serif text-5xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl print:text-black">
                {t('hero.title')}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 print:text-black">
                {t('hero.description')}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 print:hidden">{t('hero.softwareNote')}</p>
            </div>

            {/* Firma: la jerarquía normativa como índice. Solo en pantallas anchas (en móvil, el índice de chips). */}
            {tiers.length > 0 && (
              <nav aria-labelledby="ml-hierarchy" className="hidden lg:block print:hidden">
                <p id="ml-hierarchy" className="mb-4 text-center text-sm font-semibold text-white/80">
                  {t('hierarchy.heading')}
                </p>
                <ol className="flex flex-col items-center gap-1.5">
                  {tiers.map((tier) => (
                    <li key={tier.tier} className={`${TIER_WIDTH[tier.index]} ${TIER_TONE[tier.index]} rounded-xl px-4 py-2.5`}>
                      <p className="text-center text-[0.8125rem] text-white/75">{t(`hierarchy.tiers.${tier.tier}`)}</p>
                      <ul className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                        {tier.categories.map((c) => (
                          <li key={c}>
                            <a
                              href={`#cat-${c}`}
                              className="group inline-flex min-h-9 items-center gap-2 rounded-full bg-white/10 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#004700] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                            >
                              {t(`categories.${c}`)}
                              <span className="tabular-nums text-white/70 group-hover:text-[#004700]/70">{counts.get(c)}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </div>
      </section>

      {/* ── DOCUMENTOS ───────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' && groups.length > 0 ? (
            <MarcoLegalBrowser groups={groups} labels={labels} />
          ) : (
            <p role="status" className="rounded-2xl bg-white p-6 text-base leading-7 text-[#3E4A45] sm:p-8">
              {t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
            </p>
          )}
        </div>
      </section>

      {/* ── CIERRE ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24 print:hidden">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-8 rounded-[1.5rem] bg-[#004700] p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:gap-16 lg:p-14">
              <div className="flex-1">
                <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{t('info.title')}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{t('info.description')}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0 lg:flex-col">
                <Link
                  href={`/${prefix}tramites`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('info.ctaTramites')}
                </Link>
                <Link
                  href={`/${prefix}institucional`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-white/30 px-7 text-sm font-bold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('info.ctaInstitutional')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
