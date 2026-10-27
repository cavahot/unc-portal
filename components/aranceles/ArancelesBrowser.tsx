'use client'

// ARR-01: buscador, índice y tablas de /aranceles-rectorado (spec docs/specs/portal/ARANCELES-RECTORADO.md §2.4–2.6).
// El servidor renderiza TODAS las filas con la consulta vacía, así la página funciona sin JavaScript; con JS la
// búsqueda filtra en el cliente sin pedir nada a la red. Todas las cadenas llegan ya traducidas y los montos ya
// formateados (el formato no depende del motor del navegador).

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { filterArancelGroups, grupoId, type ArancelGrupo } from '@/lib/cms/aranceles'

export interface ArancelViewItem {
  id: string | number
  concepto: string
  /** Guaraníes enteros: lo usa la búsqueda y el `value` de `<data>`. */
  monto: number
  /** «50.000», ya agrupado en el servidor. */
  amountText: string
}

export interface ArancelViewGroup {
  grupo: ArancelGrupo
  /** Nombre completo del grupo (encabezado y búsqueda). */
  label: string
  /** Nombre corto para el índice. */
  short: string
  caption: string
  rangeLabel: string
  items: ArancelViewItem[]
}

export interface ArancelesLabels {
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
  indexLabel: string
  countOne: string
  countOther: string
  colConcept: string
  colAmount: string
  currencyName: string
}

/** Sustituye `{nombre}` por su valor; las plantillas vienen de messages/*\/pages.aranceles-rectorado.json. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}

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

/**
 * Tabla de un grupo. Es una tabla real a todos los anchos: con dos columnas cabe en 375 px y las tarjetas
 * apiladas (como en /convenios, que tiene 6 columnas) solo agregarían ruido. El concepto es el encabezado de
 * fila (`th scope="row"`) para que el lector de pantalla anuncie «Constancias Varias, Monto, Gs. 50.000».
 * El símbolo va en `<abbr>` con el nombre de la moneda y el número en `<data value>`: al copiar se obtiene
 * exactamente el texto visible, sin texto oculto duplicado.
 */
function GroupTable({ group, labels }: { group: ArancelViewGroup; labels: ArancelesLabels }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-2xl bg-white text-left print:rounded-none">
      <caption className="sr-only">{group.caption}</caption>
      <colgroup>
        <col />
        <col className="w-[8.75rem] sm:w-[11rem]" />
      </colgroup>
      <thead>
        <tr className="bg-[#E9F1EC] text-[0.8125rem] font-bold text-[#33403B] print:bg-white">
          <th scope="col" className="px-4 py-3 sm:px-6">
            {labels.colConcept}
          </th>
          <th scope="col" className="px-4 py-3 text-right sm:px-6">
            {labels.colAmount}
          </th>
        </tr>
      </thead>
      <tbody>
        {group.items.map((it) => (
          <tr key={it.id} className="transition-colors hover:bg-[#F4F9F5] motion-reduce:transition-none print:break-inside-avoid">
            <th
              scope="row"
              className="border-t border-[#E3EAE6] px-4 py-4 align-baseline text-[0.9375rem] font-medium leading-6 text-[#09231D] sm:px-6 sm:text-base"
            >
              {it.concepto}
            </th>
            <td className="whitespace-nowrap border-t border-[#E3EAE6] px-4 py-4 text-right align-baseline tabular-nums sm:px-6">
              <data value={it.monto} className="text-[1.0625rem] font-bold text-[#004700] sm:text-lg print:text-black">
                <abbr title={labels.currencyName} className="mr-0.5 text-[0.8125rem] font-semibold text-[#3E4A45] no-underline print:text-black">
                  Gs.
                </abbr>
                {' '}
                {it.amountText}
              </data>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ArancelesBrowser({ groups, labels }: { groups: ArancelViewGroup[]; labels: ArancelesLabels }) {
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<ArancelGrupo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const statusId = useId()

  // La búsqueda solo existe con JS: hasta hidratar se reserva su espacio sin mostrar un control inútil.
  // También recupera `?q=` para que una búsqueda se pueda compartir o volver atrás (estado en la URL).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setQuery(q.slice(0, 100))
    setMounted(true)
  }, [])

  // Refleja la consulta en la URL sin recargar ni crear entradas de historial por cada tecla. Límite: 100
  // caracteres; la consulta solo filtra en el cliente y nunca viaja al CMS.
  useEffect(() => {
    if (!mounted) return
    const url = new URL(window.location.href)
    const q = query.trim().slice(0, 100)
    if (q) url.searchParams.set('q', q)
    else url.searchParams.delete('q')
    window.history.replaceState(window.history.state, '', url)
  }, [query, mounted])

  const result = useMemo(() => filterArancelGroups(groups, query), [groups, query])
  const counts = useMemo(() => new Map(result.groups.map((g) => [g.grupo, g.items.length])), [result])
  const trimmed = query.trim()

  // Grupo activo según la sección visible (scrollspy). Sin IntersectionObserver no se marca nada.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const nodes = result.groups.map((g) => document.getElementById(grupoId(g.grupo))).filter((n): n is HTMLElement => !!n)
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting)
        if (hit) setActive(hit.target.id.replace(/^grupo-/, '') as ArancelGrupo)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [result.groups])

  const countLabel = (n: number) => (n === 1 ? labels.countOne : fill(labels.countOther, { count: n }))
  const status = !trimmed
    ? labels.statusAll
    : result.matched === 0
      ? fill(labels.statusNone, { query: trimmed })
      : result.matched === 1
        ? fill(labels.statusOne, { query: trimmed })
        : fill(labels.statusOther, { count: result.matched, query: trimmed })

  const clear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-16">
      {/* En móvil este envoltorio es `contents`: el índice queda fijo a lo largo de todas las tablas. */}
      <div className="contents lg:sticky lg:top-[104px] lg:block lg:self-start xl:top-[112px]">
        <div role="search" className={`mb-5 lg:mb-8 print:hidden ${mounted ? '' : 'invisible'}`}>
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
                onClick={clear}
                aria-label={labels.clear}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#3E4A45] hover:bg-[#EEF3F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00A300]"
              >
                <IconClose />
              </button>
            )}
          </div>
          <p id={statusId} role="status" aria-live="polite" className="mt-2.5 min-h-5 text-sm text-[#3E4A45]">
            {mounted ? status : labels.statusAll}
          </p>
        </div>

        <nav
          aria-label={labels.indexLabel}
          className="sticky top-[72px] z-20 -mx-5 mb-6 bg-[#F4F7F5] px-5 py-2.5 sm:-mx-6 sm:px-6 lg:static lg:m-0 lg:bg-transparent lg:p-0 print:hidden"
        >
          <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {groups.map((g) => {
              const n = counts.get(g.grupo) ?? 0
              const isActive = active === g.grupo && n > 0
              const base =
                'flex min-h-11 snap-start items-center gap-3 whitespace-nowrap rounded-full px-4 text-sm transition-colors motion-reduce:transition-none lg:flex-col lg:items-start lg:gap-0.5 lg:whitespace-normal lg:rounded-xl lg:py-2.5'
              return (
                <li key={g.grupo} className="shrink-0">
                  {n > 0 ? (
                    <a
                      href={`#${grupoId(g.grupo)}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`${base} ${
                        isActive ? 'bg-[#004700] text-white' : 'bg-white text-[#1E2D27] hover:bg-[#E3F2E3] lg:bg-transparent'
                      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]`}
                    >
                      <span className="flex w-full items-baseline justify-between gap-3 font-semibold">
                        <span>{g.short}</span>
                        <span className={`tabular-nums ${isActive ? 'text-white/80' : 'text-[#56655F]'}`}>{n}</span>
                      </span>
                      <span className={`hidden text-[0.8125rem] tabular-nums lg:block ${isActive ? 'text-white/80' : 'text-[#56655F]'}`}>
                        {g.rangeLabel}
                      </span>
                    </a>
                  ) : (
                    <span className={`${base} cursor-default bg-white/60 text-[#7D8A85] lg:bg-transparent`} aria-disabled="true">
                      <span className="flex w-full items-baseline justify-between gap-3">
                        <span>{g.short}</span>
                        <span className="tabular-nums">0</span>
                      </span>
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
            <p className="font-serif text-2xl font-bold tracking-[-0.02em] text-[#09231D]">{fill(labels.emptyTitle, { query: trimmed })}</p>
            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#3E4A45]">{labels.emptyHint}</p>
            <button
              type="button"
              onClick={clear}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#004700] px-6 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {labels.showAll}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-14 sm:gap-16">
            {result.groups.map((g) => (
              <section key={g.grupo} id={grupoId(g.grupo)} aria-labelledby={`${grupoId(g.grupo)}-h`} className="scroll-mt-[136px] lg:scroll-mt-[112px]">
                <div className="lt-reveal mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h2 id={`${grupoId(g.grupo)}-h`} className="text-balance font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-[#09231D] sm:text-[2rem]">
                    {g.label}
                  </h2>
                  <span className="text-sm font-semibold tabular-nums text-[#004700]">{countLabel(g.items.length)}</span>
                </div>
                <GroupTable group={g} labels={labels} />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
