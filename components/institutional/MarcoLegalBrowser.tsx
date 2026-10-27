'use client'

// MLG-01: buscador, índice y listado de /marco-legal (spec docs/specs/portal/MARCO-LEGAL.md §2.6 y §2.7).
// El servidor renderiza TODOS los documentos con query vacía, así la página funciona sin JavaScript; con JS
// la búsqueda filtra en el cliente sin pedir nada a la red. Todas las cadenas llegan ya traducidas.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { filterGroups } from '@/lib/cms/marcoLegal'
// DEP-15: el href ya llega validado del servidor; se repite safeHref aquí porque este componente es el que lo
// pone en el DOM (defensa en profundidad si otro consumidor le pasa datos sin validar).
import { safeHref } from '@/lib/security/safeUrl'
import type { DocCategory, DocEstado } from '@/lib/cms/marcoLegal'

export interface MarcoLegalViewDoc {
  id: string | number
  title: string
  description: string | null
  nota: string | null
  /** Enlace ya validado en el servidor (safeHref + allowlist o media propia). */
  href: string
  formatLabel: string
  estado: DocEstado
  estadoLabel: string | null
  dateLabel: string | null
  /** Solo en el Reglamento General: numeral romano y nombre del título. */
  numeral: string | null
  heading: string | null
  tituloLabel: string | null
  downloadAria: string
}

export interface MarcoLegalViewGroup {
  category: DocCategory
  label: string
  description: string
  docs: MarcoLegalViewDoc[]
}

export interface MarcoLegalLabels {
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
  download: string
}

/** Sustituye `{nombre}` por su valor; las plantillas vienen de messages/*\/pages.marco-legal.json. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}

const sectionId = (c: DocCategory) => `cat-${c}`

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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

/**
 * Fila de un documento. El nombre accesible del enlace incluye el título y el aviso de pestaña nueva.
 * En móvil el formato y el botón comparten la última línea (filas más cortas); desde sm el botón pasa a una
 * columna propia. En el Reglamento General el numeral romano es la marca visual de la secuencia real del
 * reglamento (aria-hidden: el h3 ya dice «Título VII» para lectores de pantalla).
 */
function DocumentRow({ doc, downloadLabel }: { doc: MarcoLegalViewDoc; downloadLabel: string }) {
  const muted = doc.estado !== 'vigente'
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] bg-white px-5 py-5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-[#FAFCFB] motion-reduce:transition-none sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-7 print:break-inside-avoid print:px-0 print:py-3">
      {doc.numeral && (
        <span aria-hidden="true" className="mb-1.5 font-serif text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-[#004700] sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:mb-0 sm:mr-6 sm:w-14 sm:self-center sm:text-[2rem]">
          {doc.numeral}
        </span>
      )}

      <div className="min-w-0 sm:col-start-2 sm:row-start-1">
        <h3 className={`text-[1.0625rem] font-semibold leading-snug ${muted ? 'text-[#3E4A45]' : 'text-[#09231D]'}`}>
          {doc.heading ? (
            <>
              <span className="sr-only">{doc.tituloLabel}: </span>
              {doc.heading}
            </>
          ) : (
            doc.title
          )}
        </h3>
        {doc.description && <p className="mt-1.5 text-[0.9375rem] leading-6 text-[#3E4A45]">{doc.description}</p>}
        {doc.nota && <p className="mt-1.5 text-[0.9375rem] leading-6 text-[#3E4A45]">{doc.nota}</p>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 sm:contents">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-[#56655F] sm:col-start-2 sm:row-start-2 sm:mt-2">
          <span>{doc.formatLabel}</span>
          {doc.dateLabel && <span>{doc.dateLabel}</span>}
          {doc.estadoLabel && (
            <span
              className={`rounded-md px-2 py-0.5 font-bold ${
                doc.estado === 'derogado' ? 'bg-[#FBE9E7] text-[#8A1C12]' : 'bg-[#E9EEEB] text-[#33403B]'
              }`}
            >
              {doc.estadoLabel}
            </span>
          )}
        </p>

        <a
          href={safeHref(doc.href)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={doc.downloadAria}
          className="inline-flex min-h-11 shrink-0 scroll-mb-6 scroll-mt-40 items-center justify-center gap-2 rounded-full border-2 border-[#004700]/20 bg-white px-5 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] hover:bg-[#004700] hover:text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300] motion-reduce:transition-none sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:ml-6 sm:self-center print:hidden"
        >
          <IconDownload />
          {downloadLabel}
        </a>
      </div>
      <span className="hidden break-all text-xs text-black print:block">{doc.href}</span>
    </li>
  )
}

export default function MarcoLegalBrowser({ groups, labels }: { groups: MarcoLegalViewGroup[]; labels: MarcoLegalLabels }) {
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<DocCategory | null>(null)
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
  // caracteres (la consulta solo filtra en el cliente; nunca viaja al CMS).
  useEffect(() => {
    if (!mounted) return
    const url = new URL(window.location.href)
    const q = query.trim().slice(0, 100)
    if (q) url.searchParams.set('q', q)
    else url.searchParams.delete('q')
    window.history.replaceState(window.history.state, '', url)
  }, [query, mounted])

  const result = useMemo(() => filterGroups(groups, query), [groups, query])
  const counts = useMemo(() => new Map(result.groups.map((g) => [g.category, g.docs.length])), [result])
  const trimmed = query.trim()

  // Índice activo según la sección visible (scrollspy). Sin IntersectionObserver no se marca nada.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const nodes = result.groups.map((g) => document.getElementById(sectionId(g.category))).filter((n): n is HTMLElement => !!n)
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting)
        if (hit) setActive(hit.target.id.replace(/^cat-/, '') as DocCategory)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [result.groups])

  // En móvil el índice es una fila desplazable: se lleva la categoría activa a la vista dentro de la fila
  // (solo desplazamiento horizontal, nunca de la página) y sin animación si el usuario pidió menos movimiento.
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
      {/* En móvil este envoltorio es `contents`: el índice queda pegajoso a lo largo de toda la lista. */}
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
          <ul ref={indexRef} className="relative flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {groups.map((g) => {
              const n = counts.get(g.category) ?? 0
              const isActive = active === g.category && n > 0
              const base =
                'flex min-h-11 snap-start items-center gap-3 whitespace-nowrap rounded-full px-4 text-sm transition-colors motion-reduce:transition-none lg:justify-between lg:whitespace-normal lg:rounded-xl lg:px-4 lg:py-2'
              return (
                <li key={g.category} className="shrink-0">
                  {n > 0 ? (
                    <a
                      href={`#${sectionId(g.category)}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`${base} ${
                        isActive
                          ? 'bg-[#004700] font-semibold text-white'
                          : 'bg-white font-medium text-[#1E2D27] hover:bg-[#E3F2E3] lg:bg-transparent'
                      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]`}
                    >
                      <span>{g.label}</span>
                      <span className={`tabular-nums ${isActive ? 'text-white/80' : 'text-[#56655F]'}`}>{n}</span>
                    </a>
                  ) : (
                    <span className={`${base} cursor-default bg-white/60 text-[#7D8A85] lg:bg-transparent`} aria-disabled="true">
                      <span>{g.label}</span>
                      <span className="tabular-nums">0</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div id="documentos" className="min-w-0">
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
            {result.groups.map((g) => {
              const List = g.category === 'reglamento-general' ? 'ol' : 'ul'
              return (
                <section key={g.category} id={sectionId(g.category)} aria-labelledby={`${sectionId(g.category)}-h`} className="scroll-mt-[136px] lg:scroll-mt-[112px]">
                  <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h2 id={`${sectionId(g.category)}-h`} className="text-balance font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-[#09231D] sm:text-[2rem]">
                      {g.label}
                    </h2>
                    <span className="text-sm font-semibold tabular-nums text-[#004700]">{countLabel(g.docs.length)}</span>
                  </div>
                  <p className="mb-5 max-w-2xl text-base leading-7 text-[#3E4A45]">{g.description}</p>
                  <List role="list" className="flex flex-col gap-1 print:gap-0">
                    {g.docs.map((d) => (
                      <DocumentRow key={d.id} doc={d} downloadLabel={labels.download} />
                    ))}
                  </List>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
