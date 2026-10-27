'use client'

// CNV-01: buscador, filtros, índice de años y tabla de /convenios (spec docs/specs/portal/CONVENIOS.md §2 y §2.1).
// El servidor renderiza TODOS los convenios con filtros vacíos, así la página funciona sin JavaScript; con JS la
// búsqueda y los filtros trabajan en el cliente sin pedir nada a la red. Todas las cadenas llegan ya traducidas.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { filterConvenioGroups, type ConvenioCategoria, type ConvenioYearGroup } from '@/lib/cms/convenios'
// DEP-15: el href ya llega validado del servidor (allowlist + safeHref); se repite safeHref aquí porque este
// componente es el que lo pone en el DOM (defensa en profundidad si otro consumidor le pasa datos sin validar).
import { safeHref } from '@/lib/security/safeUrl'

export interface ConvenioViewItem {
  id: string | number
  year: number
  /** Denominación lista para mostrar (sin el punto final suelto). */
  title: string
  parties: string
  objective: string | null
  signedMonth: string | null
  duration: string | null
  categoria: ConvenioCategoria
  nota: string | null
  href: string | null
  linkLabel: string | null
  docAria: string
}

export interface ConveniosLabels {
  caption: string
  searchLabel: string
  placeholder: string
  clear: string
  statusAll: string
  statusOne: string
  statusOther: string
  statusNone: string
  emptyTitle: string
  emptyHint: string
  showAll: string
  categoryLabel: string
  categoryAll: string
  categories: Record<ConvenioCategoria, string>
  badgeBenefit: string
  yearLabel: string
  allYears: string
  indexLabel: string
  countOne: string
  countOther: string
  columns: { title: string; parties: string; signed: string; duration: string; objective: string; document: string }
  notRecorded: string
  noObjective: string
  docView: string
  docNone: string
}

/** Sustituye `{nombre}` por su valor; las plantillas vienen de messages/*\/pages.convenios.json. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}

const yearId = (y: number) => `y-${y}`
const CATS: ConvenioCategoria[] = ['institucional', 'beneficios']

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

/** Lee `?q=`, `?categoria=` y `?anio=` validando cada valor (la URL es entrada no confiable). */
function readUrlState(years: number[]): { q: string; categoria: ConvenioCategoria | null; year: number | null } {
  const sp = new URLSearchParams(window.location.search)
  const cat = sp.get('categoria')
  const y = Number(sp.get('anio'))
  return {
    q: (sp.get('q') ?? '').slice(0, 100),
    categoria: CATS.includes(cat as ConvenioCategoria) ? (cat as ConvenioCategoria) : null,
    year: Number.isInteger(y) && years.includes(y) ? y : null,
  }
}

/**
 * Celda con etiqueta: en la vista apilada (debajo de lg) muestra el nombre de la columna antes del valor, tomado
 * de `data-label`; en la tabla ancha la etiqueta la da el `<th scope="col">`.
 */
const LABELED =
  'max-lg:before:mb-0.5 max-lg:before:block max-lg:before:text-[0.8125rem] max-lg:before:font-semibold max-lg:before:text-[#56655F] max-lg:before:content-[attr(data-label)]'

function ConvenioRow({ item, labels, showBadge }: { item: ConvenioViewItem; labels: ConveniosLabels; showBadge: boolean }) {
  const cell = 'align-top lg:border-t lg:border-[#E3EAE6] lg:px-4 lg:py-5 first:lg:pl-6 last:lg:pr-6'
  return (
    <tr
      role="row"
      className="max-lg:mb-3 max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-5 max-lg:gap-y-4 max-lg:rounded-2xl max-lg:bg-white max-lg:p-5 sm:max-lg:p-6 bg-white transition-colors hover:bg-[#FAFCFB] motion-reduce:transition-none print:break-inside-avoid"
    >
      <td role="cell" className={`${cell} max-lg:col-span-2 lg:w-[19%]`}>
        <p className="text-[1.0625rem] font-semibold leading-snug text-[#09231D]">{item.title}</p>
        {showBadge && item.categoria === 'beneficios' && (
          <span className="mt-2 inline-block rounded-md bg-[#E3F2E3] px-2 py-0.5 text-[0.8125rem] font-semibold text-[#004700]">{labels.badgeBenefit}</span>
        )}
        {item.nota && <p className="mt-2 text-[0.9375rem] leading-6 text-[#3E4A45]">{item.nota}</p>}
      </td>
      <td role="cell" data-label={labels.columns.parties} className={`${cell} ${LABELED} max-lg:col-span-2 text-[0.9375rem] leading-6 text-[#1E2D27] lg:w-[21%]`}>
        {item.parties}
      </td>
      <td role="cell" data-label={labels.columns.signed} className={`${cell} ${LABELED} text-[0.9375rem] leading-6 text-[#1E2D27] lg:w-[10%]`}>
        {item.signedMonth ?? <span className="text-[#56655F]">{labels.notRecorded}</span>}
      </td>
      <td role="cell" data-label={labels.columns.duration} className={`${cell} ${LABELED} text-[0.9375rem] leading-6 text-[#1E2D27] lg:w-[9%]`}>
        {item.duration ?? <span className="text-[#56655F]">{labels.notRecorded}</span>}
      </td>
      <td role="cell" data-label={labels.columns.objective} className={`${cell} ${LABELED} max-lg:col-span-2 text-[0.9375rem] leading-6 text-[#3E4A45]`}>
        {item.objective ?? <span className="text-[#56655F]">{labels.noObjective}</span>}
      </td>
      <td role="cell" className={`${cell} max-lg:col-span-2 lg:w-[11.5rem]`}>
        {item.href ? (
          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-1.5">
            <a
              href={safeHref(item.href)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.docAria}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#004700] px-5 text-sm font-bold text-white transition-colors hover:bg-[#003300] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300] motion-reduce:transition-none print:hidden"
            >
              {labels.docView}
              <IconExternal />
            </a>
            {item.linkLabel && <span className="text-[0.8125rem] text-[#56655F] print:hidden">{item.linkLabel}</span>}
            <span className="hidden break-all text-xs text-black print:block">{item.href}</span>
          </div>
        ) : (
          <span className="inline-flex min-h-11 items-center text-[0.9375rem] text-[#56655F]">{labels.docNone}</span>
        )}
      </td>
    </tr>
  )
}

export default function ConveniosBrowser({
  groups,
  labels,
  showCategories,
}: {
  groups: ConvenioYearGroup<ConvenioViewItem>[]
  labels: ConveniosLabels
  /** Falso cuando el tipo no tiene acuerdos de beneficios (p. ej. internacionales): no se ofrece un filtro inútil. */
  showCategories: boolean
}) {
  const years = useMemo(() => groups.map((g) => g.year), [groups])
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState<ConvenioCategoria | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const statusId = useId()
  const yearSelectId = useId()

  // Los controles solo existen con JS: hasta hidratar se reserva su espacio sin mostrar controles inútiles.
  // También recupera el estado de la URL para que una búsqueda se pueda compartir o volver atrás.
  useEffect(() => {
    const s = readUrlState(years)
    setQuery(s.q)
    setCategoria(showCategories ? s.categoria : null)
    setYear(s.year)
    setMounted(true)
  }, [years, showCategories])

  // Refleja el estado en la URL sin recargar ni crear una entrada de historial por tecla. Nunca viaja al CMS.
  useEffect(() => {
    if (!mounted) return
    const url = new URL(window.location.href)
    const q = query.trim().slice(0, 100)
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
    set('q', q || null)
    set('categoria', categoria)
    set('anio', year ? String(year) : null)
    window.history.replaceState(window.history.state, '', url)
  }, [query, categoria, year, mounted])

  const result = useMemo(() => filterConvenioGroups(groups, { query, categoria, year }), [groups, query, categoria, year])
  const counts = useMemo(() => new Map(result.groups.map((g) => [g.year, g.items.length])), [result])
  const filtered = query.trim() !== '' || categoria !== null || year !== null

  // Año activo según el grupo visible (scrollspy). Sin IntersectionObserver no se marca nada.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const nodes = result.groups.map((g) => document.getElementById(yearId(g.year))).filter((n): n is HTMLElement => !!n)
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting)
        if (hit) setActive(Number(hit.target.id.slice(2)))
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [result.groups])

  // En la fila de chips (pantallas angostas) lleva el año activo a la vista, solo en horizontal y sin animación si
  // el usuario pidió menos movimiento.
  const indexRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const list = indexRef.current
    if (!list || list.scrollWidth <= list.clientWidth) return
    const current = list.querySelector<HTMLElement>('[aria-current="true"]')
    if (!current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    list.scrollTo({ left: current.parentElement!.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' })
  }, [active])

  const countLabel = (n: number) => (n === 1 ? labels.countOne : fill(labels.countOther, { count: n }))
  const status = !filtered
    ? labels.statusAll
    : result.matched === 0
      ? labels.statusNone
      : result.matched === 1
        ? labels.statusOne
        : fill(labels.statusOther, { count: result.matched })

  const reset = () => {
    setQuery('')
    setCategoria(null)
    setYear(null)
    inputRef.current?.focus()
  }

  const pill = (on: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300] ${
      on ? 'bg-[#004700] font-semibold text-white' : 'bg-white font-medium text-[#1E2D27] hover:bg-[#E3F2E3]'
    }`

  return (
    // Barra de controles arriba y fila de años pegajosa en TODOS los anchos: la tabla de 6 columnas necesita el
    // ancho completo (con un índice lateral la denominación se partía palabra por palabra a 1440 px).
    <div>
      <div className="contents">
        <div className={`mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8 print:hidden ${mounted ? '' : 'invisible'}`}>
          <div role="search" className="lg:w-[24rem] lg:shrink-0">
            <label htmlFor={inputId} className="mb-2 block text-sm font-bold text-[#09231D]">
              {labels.searchLabel}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#56655F]">
                <IconSearch />
              </span>
              <input
                ref={inputRef}
                id={inputId}
                name="q"
                type="search"
                maxLength={100}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && query) {
                    e.preventDefault()
                    setQuery('')
                  }
                }}
                placeholder={labels.placeholder}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                aria-describedby={statusId}
                className="h-12 w-full rounded-full border-2 border-[#C9D5CF] bg-white pl-12 pr-12 text-base text-[#09231D] placeholder:text-[#6A7973] focus:border-[#004700] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00A300]/25 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  aria-label={labels.clear}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#3E4A45] hover:bg-[#EEF3F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00A300]"
                >
                  <IconClose />
                </button>
              )}
            </div>
            <p id={statusId} role="status" aria-live="polite" className="mt-2.5 min-h-5 text-sm font-semibold text-[#004700]">
              {mounted ? status : labels.statusAll}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            {showCategories && (
              <div role="group" aria-label={labels.categoryLabel}>
                <p aria-hidden="true" className="mb-2 text-sm font-bold text-[#09231D]">{labels.categoryLabel}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={categoria === null} onClick={() => setCategoria(null)} className={pill(categoria === null)}>
                    {labels.categoryAll}
                  </button>
                  {CATS.map((c) => (
                    <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(categoria === c ? null : c)} className={pill(categoria === c)}>
                      {labels.categories[c]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label htmlFor={yearSelectId} className="mb-2 block text-sm font-bold text-[#09231D]">
                {labels.yearLabel}
              </label>
              <select
                id={yearSelectId}
                value={year ?? ''}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                className="h-11 min-w-[11rem] rounded-full border-2 border-[#C9D5CF] bg-white px-4 text-base text-[#09231D] focus:border-[#004700] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00A300]/25"
              >
                <option value="">{labels.allYears}</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <nav
          aria-label={labels.indexLabel}
          className="sticky top-[72px] z-20 -mx-5 mb-6 bg-[#F4F7F5] px-5 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:top-20 print:hidden"
        >
          <ul ref={indexRef} className="relative flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] xl:flex-wrap xl:gap-1.5 xl:overflow-visible xl:pb-0">
            {groups.map((g) => {
              const n = counts.get(g.year) ?? 0
              const isActive = active === g.year && n > 0
              const base = 'flex min-h-11 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm tabular-nums transition-colors motion-reduce:transition-none xl:px-3'
              return (
                <li key={g.year} className="shrink-0">
                  {n > 0 ? (
                    <a
                      href={`#${yearId(g.year)}`}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={`${g.year}: ${countLabel(n)}`}
                      className={`${base} ${isActive ? 'bg-[#004700] font-semibold text-white' : 'bg-white font-medium text-[#1E2D27] hover:bg-[#E3F2E3]'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]`}
                    >
                      {g.year}
                    </a>
                  ) : (
                    <span className={`${base} cursor-default bg-white/60 text-[#7D8A85]`} aria-disabled="true">
                      {g.year}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div className="min-w-0">
        {result.matched === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center sm:px-10">
            <p className="font-serif text-2xl font-bold tracking-[-0.02em] text-[#09231D]">{labels.emptyTitle}</p>
            {query.trim() && <p className="mt-2 text-base text-[#3E4A45]">«{query.trim()}»</p>}
            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#3E4A45]">{labels.emptyHint}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#004700] px-6 text-sm font-bold text-white transition-colors hover:bg-[#003300] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {labels.showAll}
            </button>
          </div>
        ) : (
          <table role="table" className="w-full max-lg:block lg:overflow-hidden lg:rounded-2xl lg:border-separate lg:border-spacing-0 lg:bg-white print:table">
            <caption className="sr-only">{labels.caption}</caption>
            <thead role="rowgroup" className="max-lg:sr-only">
              <tr role="row" className="bg-[#E9F1EC] text-left text-[0.8125rem] font-bold text-[#33403B]">
                {(['title', 'parties', 'signed', 'duration', 'objective', 'document'] as const).map((c) => (
                  <th key={c} role="columnheader" scope="col" className="px-4 py-3 first:pl-6 last:pr-6">
                    {labels.columns[c]}
                  </th>
                ))}
              </tr>
            </thead>
            {result.groups.map((g) => (
              <tbody key={g.year} id={yearId(g.year)} role="rowgroup" className="scroll-mt-[150px] max-lg:mb-10 max-lg:block xl:scroll-mt-[150px]">
                <tr role="row" className="max-lg:block">
                  <th
                    role="rowheader"
                    scope="rowgroup"
                    colSpan={6}
                    className="lt-reveal text-left max-lg:block max-lg:pb-3 lg:border-t lg:border-[#C9D5CF] lg:bg-[#F7FAF8] lg:px-6 lg:pb-3 lg:pt-6"
                  >
                    <span className="font-serif text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#004700] lg:text-[2.25rem]">{g.year}</span>
                    <span className="ml-3 text-sm font-semibold text-[#3E4A45]">{countLabel(g.items.length)}</span>
                  </th>
                </tr>
                {g.items.map((it) => (
                  <ConvenioRow key={it.id} item={it} labels={labels} showBadge={showCategories} />
                ))}
              </tbody>
            ))}
          </table>
        )}
      </div>
    </div>
  )
}
