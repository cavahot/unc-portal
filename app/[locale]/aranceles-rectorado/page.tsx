// ARR-01: página pública «Aranceles del Rectorado» conectada al CMS (spec docs/specs/portal/ARANCELES-RECTORADO.md).
// Todos los montos salen de la colección `aranceles-rectorado`; si el CMS está vacío o caído se muestra un aviso,
// nunca una lista de precios escrita en el código.
import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import ArancelesBrowser, { type ArancelesLabels, type ArancelViewGroup } from '@/components/aranceles/ArancelesBrowser'
import { getT } from '@/lib/i18n/server'
import { formatGuaranies, formatMonto, grupoId, type ArancelGroup } from '@/lib/cms/aranceles'
import { getArancelesRectorado } from '@/lib/cms/queries/aranceles'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.aranceles-rectorado')
  return { title: t('meta.title'), description: t('meta.description') }
}

type T = Awaited<ReturnType<typeof getT>>

/**
 * Fecha de la última actualización en el idioma de la página. Se formatea en el servidor (el HTML hidratado
 * coincide) y en hora de Paraguay; `gn` no tiene datos de Intl en todos los motores y usa es-PY.
 */
function formatUpdated(iso: string, locale: string): string {
  const tag = locale === 'gn' ? 'es-PY' : locale
  try {
    return new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeZone: 'America/Asuncion' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

/** Rango real de montos del grupo («De Gs. 10.000 a Gs. 60.000»), o un único monto si todos son iguales. */
function rangeLabel(g: ArancelGroup, t: T): string {
  return g.min === g.max ? formatMonto(g.min) : t('index.range', { min: formatMonto(g.min), max: formatMonto(g.max) })
}

/** Convierte los grupos del dominio en el modelo serializable del cliente (cadenas ya traducidas y formateadas). */
function toViewGroups(groups: ArancelGroup[], t: T): ArancelViewGroup[] {
  return groups.map((g) => {
    const label = t(`grupos.${g.grupo}.title`)
    return {
      grupo: g.grupo,
      label,
      short: t(`grupos.${g.grupo}.short`),
      caption: t('table.caption', { group: label }),
      rangeLabel: rangeLabel(g, t),
      items: g.items.map((i) => ({ id: i.id, concepto: i.concepto, monto: i.monto, amountText: formatGuaranies(i.monto) })),
    }
  })
}

export default async function ArancelesRectoradoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.aranceles-rectorado')
  const prefix = locale === 'es' ? '' : `${locale}/`

  const result = await getArancelesRectorado()
  const groups = result.status === 'ok' ? toViewGroups(result.groups, t) : []
  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const updated = result.status === 'ok' && result.updatedAt ? formatUpdated(result.updatedAt, locale) : null

  const labels: ArancelesLabels = {
    searchLabel: t('search.label'),
    placeholder: t('search.placeholder'),
    clear: t('search.clear'),
    statusAll: t('search.statusAll', { total, groups: groups.length }),
    statusOne: t('search.statusOne', { query: '{query}' }),
    statusOther: t('search.statusOther', { count: '{count}', query: '{query}' }),
    statusNone: t('search.statusNone', { query: '{query}' }),
    emptyTitle: t('search.emptyTitle', { query: '{query}' }),
    emptyHint: t('search.emptyHint'),
    showAll: t('search.showAll'),
    indexLabel: t('index.label'),
    countOne: t('index.countOne'),
    countOther: t('index.countOther', { count: '{count}' }),
    colConcept: t('table.concept'),
    colAmount: t('table.amount'),
    currencyName: t('table.currencyName'),
  }

  const linkFocus = 'rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]'

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 text-white sm:pt-32 lg:pb-28 print:bg-none print:pb-4 print:pt-0 print:text-black">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl print:hidden" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 print:hidden">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/75">
              <li>
                <Link href={`/${locale === 'es' ? '' : locale}`} className={linkFocus}>
                  {t('breadcrumb.inicio')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none text-white/50">/</li>
              <li>
                {/* El menú principal ubica esta página bajo «Facultades» (como el sitio publicado). */}
                <Link href={`/${prefix}facultades`} className={linkFocus}>
                  {t('breadcrumb.facultades')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none text-white/50">/</li>
              <li className="font-semibold text-white" aria-current="page">{t('breadcrumb.nombre')}</li>
            </ol>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-end lg:gap-16">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8] print:text-black">{t('hero.badge')}</span>
              <h1 className="mt-4 text-balance font-serif text-5xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl print:text-black">
                {t('hero.titulo')}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 print:text-black">{t('hero.subtitulo')}</p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 print:text-black">{t('hero.currencyNote')}</p>
              {result.status === 'ok' && (
                <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#B8FFB8] print:text-black">
                  {updated && <span>{t('updated', { date: updated })}</span>}
                  <span>{t('summary', { count: total, groups: groups.length })}</span>
                </p>
              )}
            </div>

            {/* Firma: cada grupo con su rango real de montos, como índice de salto. Solo en pantallas anchas
                (en móvil el índice fijo de la lista cumple esa función). */}
            {groups.length > 0 && (
              <nav aria-labelledby="arr-ledger" className="hidden lg:block print:hidden">
                <p id="arr-ledger" className="mb-3 text-sm font-semibold text-white/80">
                  {t('index.label')}
                </p>
                <ul className="flex flex-col gap-2">
                  {groups.map((g) => (
                    <li key={g.grupo}>
                      <a
                        href={`#${grupoId(g.grupo)}`}
                        className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 rounded-2xl bg-white/[0.09] px-6 py-4 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                      >
                        <span className="text-base font-semibold text-white group-hover:text-[#004700]">{g.short}</span>
                        <span className="text-sm tabular-nums text-white/75 group-hover:text-[#004700]/75">
                          {g.items.length === 1 ? t('index.countOne') : t('index.countOther', { count: g.items.length })}
                        </span>
                        <span className="col-span-2 font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.02em] tabular-nums text-white group-hover:text-[#004700]">
                          {g.rangeLabel}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </section>

      {/* ── TABLAS ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' && groups.length > 0 ? (
            <ArancelesBrowser groups={groups} labels={labels} />
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
                  href={`/${prefix}legalizaciones`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('info.ctaLegalizaciones')}
                </Link>
                <Link
                  href={`/${prefix}titulos`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-white/30 px-7 text-sm font-bold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('info.ctaTitulos')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
