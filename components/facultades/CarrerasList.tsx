// FAC-01: lista de carreras o posgrados (spec FACULTADES.md §2.5). Filas, no tarjetas con iconos: el nombre manda,
// los datos disponibles van en una línea y las resoluciones CONES son la columna de documento (la «firma» de la
// página: es el respaldo oficial que publica la UNC por cada programa). Solo pinta datos que existen.
import type { CarreraItem } from '@/lib/cms/facultad'
import { safeHref } from '@/lib/security/safeUrl'

export interface CarrerasListLabels {
  resLabel: string
  /** Plantilla con `{numero}` ya sustituida por la página. */
  resOpen: (numero: string) => string
  sede: string
  modalidad: string
  titulo: string
  duracion: (n: number) => string
  perfil: string
}

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004700]'

export default function CarrerasList({ items, labels, compact = false }: { items: CarreraItem[]; labels: CarrerasListLabels; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((c) => {
        const meta = [
          c.sede && { term: labels.sede, value: c.sede },
          c.modalidad && { term: labels.modalidad, value: c.modalidad },
          c.duracion && { term: '', value: labels.duracion(c.duracion) },
          c.titulo && { term: labels.titulo, value: c.titulo },
        ].filter(Boolean) as Array<{ term: string; value: string }>
        return (
          <li
            key={c.id}
            className="lt-reveal grid gap-5 rounded-[1.25rem] bg-white p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10 print:break-inside-avoid print:border print:border-black/30"
          >
            <div>
              <h3 className={`font-serif font-bold leading-tight tracking-[-0.02em] text-[#001A00] ${compact ? 'text-xl sm:text-[1.4rem]' : 'text-2xl sm:text-[1.85rem]'}`}>
                {c.nombre}
              </h3>
              {meta.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] text-[#3E4A45]">
                  {meta.map((m) => (
                    <span key={m.value}>
                      {m.term && <span className="sr-only">{m.term}: </span>}
                      {m.value}
                    </span>
                  ))}
                </p>
              )}
              {c.descripcion && <p className="mt-3 max-w-2xl text-base leading-7 text-[#001A00]">{c.descripcion}</p>}
              {c.perfil && (
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#001A00]">
                  <span className="font-semibold">{labels.perfil}: </span>
                  {c.perfil}
                </p>
              )}
            </div>
            {c.resoluciones.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span className="mr-1 text-sm text-[#3E4A45]">{labels.resLabel}</span>
                {c.resoluciones.map((r) =>
                  r.href ? (
                    <a
                      key={r.numero}
                      href={safeHref(r.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={labels.resOpen(r.numero)}
                      className={`group inline-flex min-h-11 items-center gap-2 rounded-full bg-[#E3F3E6] px-4 font-serif text-lg font-bold tabular-nums text-[#004700] transition-colors hover:bg-[#004700] hover:text-white ${focus}`}
                    >
                      {r.numero}
                      {r.detalle && <span className="font-sans text-xs font-semibold">{r.detalle}</span>}
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </a>
                  ) : (
                    <span key={r.numero} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F4F7F5] px-4 font-serif text-lg font-bold tabular-nums text-[#004700]">
                      {r.numero}
                      {r.detalle && <span className="font-sans text-xs font-semibold">{r.detalle}</span>}
                    </span>
                  ),
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
