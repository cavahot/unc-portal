// CNV-01: vista completa de /convenios y /convenios/internacionales (spec docs/specs/portal/CONVENIOS.md §2.1).
// Componente de servidor: lee el CMS, traduce todas las cadenas y entrega al cliente un modelo serializable.
// DEP-15: todo href que proviene del CMS pasa por safeHref además de la allowlist (lib/cms/convenios.ts).
import Link from 'next/link'
import { safeHref } from '@/lib/security/safeUrl'
import { getT } from '@/lib/i18n/server'
import { displayLabel, type Convenio, type ConvenioType, type ConvenioYearGroup } from '@/lib/cms/convenios'
import { getConveniosPage } from '@/lib/cms/queries/convenios'
import ConveniosBrowser, { type ConveniosLabels, type ConvenioViewItem } from './ConveniosBrowser'

type T = Awaited<ReturnType<typeof getT>>

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]'

/** Convierte los grupos del dominio al modelo de vista (cadenas ya traducidas, href revalidado). */
function toViewGroups(groups: ConvenioYearGroup<Convenio>[], t: T): ConvenioYearGroup<ConvenioViewItem>[] {
  return groups.map((g) => ({
    year: g.year,
    items: g.items.map((c) => {
      const href = c.href && safeHref(c.href) !== '#' ? c.href : null
      const title = displayLabel(c.title)
      return {
        id: c.id,
        year: c.year,
        title,
        parties: c.parties,
        objective: c.objective,
        signedMonth: c.signedMonth ? displayLabel(c.signedMonth) : null,
        duration: c.duration ? displayLabel(c.duration) : null,
        categoria: c.categoria,
        nota: c.nota,
        href,
        linkLabel: href && c.linkKind ? t(`doc.${c.linkKind}`) : null,
        docAria: t('doc.aria', { title }),
      }
    }),
  }))
}

/**
 * Firma de la página: «registro por año». Una columna por año del período (también los años sin convenios, en
 * cero, porque el hueco es información), con altura proporcional y dos tonos (institucional / beneficios). Cada
 * columna con datos es un enlace al año de la lista. Solo en pantallas anchas; en móvil hace de índice la fila
 * de chips del navegador. Sin animación: se lee igual con o sin JS y con movimiento reducido.
 */
function YearLedger({ groups, span, t }: { groups: ConvenioYearGroup<Convenio>[]; span: { from: number; to: number }; t: T }) {
  const byYear = new Map(groups.map((g) => [g.year, g.items]))
  const years: number[] = []
  for (let y = span.to; y >= span.from; y--) years.push(y)
  years.reverse()
  const max = Math.max(...groups.map((g) => g.items.length))
  const hasBenefits = groups.some((g) => g.items.some((i) => i.categoria === 'beneficios'))
  return (
    <nav aria-labelledby="cnv-ledger" className="hidden lg:block print:hidden">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p id="cnv-ledger" className="text-sm font-semibold text-white">
          {t('chart.heading')}
        </p>
        <p aria-hidden="true" className="flex gap-4 text-[0.8125rem] text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#8AFF8A]" />
            {t('chart.legendInstitutional')}
          </span>
          {hasBenefits && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#8AFF8A]/40" />
              {t('chart.legendBenefits')}
            </span>
          )}
        </p>
      </div>
      <ol className="flex h-52 items-end gap-[3px]">
        {years.map((y) => {
          const items = byYear.get(y) ?? []
          const inst = items.filter((i) => i.categoria === 'institucional').length
          const ben = items.length - inst
          const pct = (n: number) => `${(n / max) * 100}%`
          return (
            <li key={y} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              {items.length > 0 ? (
                <a
                  href={`#y-${y}`}
                  aria-label={t('chart.yearLink', { year: y, count: items.length })}
                  className={`group flex h-full w-full flex-col items-center justify-end rounded-sm ${FOCUS}`}
                >
                  <span className="mb-1 text-[0.75rem] font-semibold tabular-nums text-white/85 group-hover:text-white">{items.length}</span>
                  <span className="flex w-full flex-col justify-end" style={{ height: pct(items.length) }}>
                    {ben > 0 && <span className="block w-full rounded-t-[3px] bg-[#8AFF8A]/40 group-hover:bg-[#8AFF8A]/55" style={{ height: `${(ben / items.length) * 100}%` }} />}
                    {inst > 0 && (
                      <span
                        className={`block w-full bg-[#8AFF8A] group-hover:bg-white ${ben > 0 ? '' : 'rounded-t-[3px]'}`}
                        style={{ height: `${(inst / items.length) * 100}%` }}
                      />
                    )}
                  </span>
                </a>
              ) : (
                <span aria-hidden="true" className="block h-[3px] w-full bg-white/20" />
              )}
              <span aria-hidden="true" className="mt-2 text-[0.75rem] tabular-nums text-white/75 [writing-mode:vertical-rl] rotate-180">
                {y}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export async function conveniosMetadata(locale: string, type: ConvenioType) {
  const t = await getT(locale, 'pages.convenios')
  return { title: t(`meta.${type}.title`), description: t(`meta.${type}.description`) }
}

export default async function ConveniosView({ locale, type }: { locale: string; type: ConvenioType }) {
  const t = await getT(locale, 'pages.convenios')
  const prefix = locale === 'es' ? '' : `${locale}/`
  const result = await getConveniosPage(type)
  const groups = result.status === 'ok' ? toViewGroups(result.groups, t) : []
  const total = result.status === 'ok' ? result.total : 0
  const showCategories = result.status === 'ok' && result.counts.beneficios > 0

  const labels: ConveniosLabels = {
    caption: t(`table.caption.${type}`),
    searchLabel: t('search.label'),
    placeholder: t('search.placeholder'),
    clear: t('search.clear'),
    statusAll: t('search.statusAll', { total, years: groups.length }),
    statusOne: t('search.statusOne'),
    statusOther: t('search.statusOther', { count: '{count}' }),
    statusNone: t('search.statusNone'),
    emptyTitle: t('search.emptyTitle'),
    emptyHint: t('search.emptyHint'),
    showAll: t('search.showAll'),
    categoryLabel: t('filters.category'),
    categoryAll: t('filters.all'),
    categories: { institucional: t('categories.institucional'), beneficios: t('categories.beneficios') },
    badgeBenefit: t('badge.beneficios'),
    yearLabel: t('filters.year'),
    allYears: t('filters.allYears'),
    indexLabel: t('index.label'),
    countOne: t('table.countOne'),
    countOther: t('table.countOther', { count: '{count}' }),
    columns: {
      title: t('columns.title'),
      parties: t('columns.parties'),
      signed: t('columns.signed'),
      duration: t('columns.duration'),
      objective: t('columns.objective'),
      document: t('columns.document'),
    },
    notRecorded: t('table.notRecorded'),
    noObjective: t('table.noObjective'),
    docView: t('doc.view'),
    docNone: t('doc.none'),
  }

  // Rutas internas fijas (no vienen del CMS): el href se arma con plantilla literal.
  const TYPE_PATH: Record<ConvenioType, string> = { nacional: 'convenios', internacional: 'convenios/internacionales' }
  const other: ConvenioType = type === 'nacional' ? 'internacional' : 'nacional'

  return (
    <>
      {/* ── PORTADA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#004700] pb-24 pt-28 text-white sm:pt-32 lg:pb-28 print:bg-white print:pb-4 print:pt-0 print:text-black">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 print:hidden">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              <li>
                <Link href={`/${locale === 'es' ? '' : locale}`} className={`rounded-sm transition-colors hover:text-white ${FOCUS}`}>
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none text-white/50">/</li>
              <li>
                <Link href={`/${prefix}institucional`} className={`rounded-sm transition-colors hover:text-white ${FOCUS}`}>
                  {t('breadcrumb.institutional')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none text-white/50">/</li>
              <li className="font-semibold text-white" aria-current="page">
                {t(`hero.title.${type}`)}
              </li>
            </ol>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-16">
            <div>
              {/* Selector de tipo: dos enlaces reales (URL compartible, funciona sin JS). */}
              <nav aria-label={t('switch.label')} className="mb-8 print:hidden">
                <ul className="inline-flex gap-1 rounded-full bg-[#001A00]/45 p-1">
                  {(['nacional', 'internacional'] as const).map((tabType) => {
                    const on = tabType === type
                    return (
                      <li key={tabType}>
                        <Link
                          href={`/${prefix}${TYPE_PATH[tabType]}`}
                          aria-current={on ? 'page' : undefined}
                          className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold transition-colors motion-reduce:transition-none ${FOCUS} ${
                            on ? 'bg-white text-[#004700]' : 'text-white hover:bg-white/10'
                          }`}
                        >
                          {t(`switch.${tabType}`)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
              <h1 className="text-balance font-serif text-5xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl print:text-black">
                {t(`hero.title.${type}`)}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg sm:leading-8 print:text-black">{t(`hero.intro.${type}`)}</p>
              {result.status === 'ok' && (
                <p className="mt-6 text-balance text-lg font-semibold tabular-nums text-[#8AFF8A] sm:text-2xl print:text-black">
                  {t(`hero.summary.${type}`, { count: result.total, from: result.span.from, to: result.span.to })}
                </p>
              )}
            </div>
            {result.status === 'ok' && <YearLedger groups={result.groups} span={result.span} t={t} />}
          </div>
        </div>
      </section>

      {/* ── LISTA ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' ? (
            <ConveniosBrowser groups={groups} labels={labels} showCategories={showCategories} />
          ) : (
            <div role="status" className="rounded-2xl bg-white p-6 sm:p-8">
              <p className="text-base leading-7 text-[#3E4A45]">{t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}</p>
              <Link
                href={`/${prefix}${TYPE_PATH[other]}`}
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#004700] px-6 text-sm font-bold text-white transition-colors hover:bg-[#003300] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
              >
                {t(`switch.${other}`)}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── CIERRE ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24 print:hidden">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 rounded-[1.5rem] bg-[#004700] p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:gap-16 lg:p-14">
            <div className="flex-1">
              <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{t('info.title')}</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/90">{t('info.description')}</p>
            </div>
            <Link
              href={`/${prefix}contacto`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white lg:shrink-0"
            >
              {t('info.cta')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
