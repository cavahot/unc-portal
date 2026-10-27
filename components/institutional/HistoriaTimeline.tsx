// LT-01: línea de tiempo de /historia (spec docs/specs/portal/LINEA-TIEMPO.md §2).
// Componente de servidor: el HTML llega completo, sin JS; la única animación es CSS (`.lt-reveal` en
// app/globals.css) y solo se activa con `animation-timeline` y sin `prefers-reduced-motion` (evita RDD-MLG-05).
// DEP-15: el enlace del CMS pasa por `safeHref` además de la validación https del modelo.
import Image from 'next/image'
import type { Milestone } from '@/lib/cms/lineaTiempo'
import { safeHref } from '@/lib/security/safeUrl'

export interface HistoriaTimelineLabels {
  moreInfo: string
  newTab: string
}

/**
 * Columna del año en pantallas anchas (lg+). El eje se dibuja en el centro del hueco entre año y contenido:
 * 10.5rem + 4rem / 2 = 12.5rem. Si cambia una medida, cambiar las tres (año, hueco, eje).
 */
const YEAR_COL = 'lg:grid-cols-[10.5rem_minmax(0,1fr)] lg:gap-x-16'

function IconExternal() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true">
      <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5V12" />
      <path d="M11 4h5v5" />
      <path d="M16 4 9 11" />
    </svg>
  )
}

/**
 * Un hito: año en numeral serif grande (el dato que se recorre con la vista), título, descripción y, si el
 * editor los cargó, foto y enlace. `lang="es"` marca los textos que cayeron al español en otro idioma.
 */
function MilestoneItem({ m, labels }: { m: Milestone; labels: HistoriaTimelineLabels }) {
  // Doble control: el modelo ya exige https; safeHref vuelve a filtrar justo antes del href (guardia DEP-15).
  return (
    <li className={`lt-reveal relative pb-16 pl-11 last:pb-0 sm:pl-14 lg:grid lg:pl-0 ${YEAR_COL} print:break-inside-avoid print:pb-8`}>
      {/* Nodo sobre el eje: decorativo, el año ya está en el texto. */}
      <span
        aria-hidden="true"
        className="absolute left-[11px] top-[0.55rem] h-[1.15rem] w-[1.15rem] -translate-x-1/2 rounded-full border-[3px] border-[#004700] bg-white sm:top-[0.95rem] lg:left-[12.5rem] lg:top-[1.35rem]"
      />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:block lg:text-right">
        <time
          dateTime={String(m.anio)}
          className="block font-serif text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-[#004700] [font-variant-numeric:lining-nums_tabular-nums] sm:text-6xl xl:text-[4rem]"
        >
          {m.anio}
        </time>
        {m.etiquetaFecha && (
          <span className="text-sm font-semibold text-[#2F5F3A] lg:mt-2 lg:block">{m.etiquetaFecha}</span>
        )}
      </div>

      <div className="mt-4 min-w-0 lg:mt-[0.9rem]">
        <h3 lang={m.tituloLang ?? undefined} className="max-w-[34ch] text-balance font-serif text-[1.45rem] font-bold leading-[1.2] tracking-[-0.015em] text-[#09231D] sm:text-[1.7rem]">
          {m.titulo}
        </h3>
        <p lang={m.descripcionLang ?? undefined} className="mt-3 max-w-[62ch] text-pretty text-base leading-[1.7] text-[#33413A] sm:text-[1.0625rem]">
          {m.descripcion}
        </p>

        {m.imagen && (
          <div className="relative mt-6 aspect-[3/2] w-full max-w-[34rem] overflow-hidden rounded-xl bg-[#E9F1EC] print:max-w-[18rem]">
            <Image
              src={m.imagen.src}
              alt={m.imagen.alt}
              fill
              sizes="(min-width: 1024px) 34rem, (min-width: 640px) calc(100vw - 7rem), calc(100vw - 5.5rem)"
              className="object-cover"
              placeholder={m.imagen.blurDataURL ? 'blur' : 'empty'}
              blurDataURL={m.imagen.blurDataURL ?? undefined}
            />
          </div>
        )}

        {m.enlace && safeHref(m.enlace) !== '#' && (
          <a
            href={safeHref(m.enlace)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${labels.moreInfo}: ${m.titulo} ${labels.newTab}`}
            className="group mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-[0.95rem] font-bold text-[#004700] underline decoration-[#00A300]/40 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#00A300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A300] focus-visible:ring-offset-4"
          >
            {labels.moreInfo}
            <IconExternal />
          </a>
        )}
      </div>
    </li>
  )
}

/**
 * Lista ordenada de hitos sobre un eje vertical verde. Móvil: eje a la izquierda y año sobre el contenido.
 * Pantallas anchas: el año en su propia columna a la izquierda del eje (se lee como un índice de años).
 * Por qué `<ol>`: el orden cronológico ES la información (WCAG 1.3.1).
 */
export default function HistoriaTimeline({ milestones, labels }: { milestones: Milestone[]; labels: HistoriaTimelineLabels }) {
  return (
    <div className="relative">
      {/* Eje fuera del <ol>: un <ol> solo admite <li> como hijos. */}
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-[11px] top-3 w-[3px] -translate-x-1/2 rounded-full bg-[#00A300]/30 lg:left-[12.5rem] print:bg-[#00A300]"
      />
      <ol className="relative">
        {milestones.map((m) => (
          <MilestoneItem key={m.id} m={m} labels={labels} />
        ))}
      </ol>
    </div>
  )
}
