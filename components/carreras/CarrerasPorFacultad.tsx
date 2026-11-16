// INST-04: catálogo de /carreras agrupado por facultad (servidor, sin estado).
// Qué hace: una sección por facultad con su nombre, el enlace a su página y, debajo, una lista de filas por tipo
// (carreras de grado, posgrados). Cada fila es UN enlace a la página de la carrera con su nombre y una línea de datos
// (sede, modalidad y duración, solo los que existen). Sin tarjetas iguales en cuadrícula ni etiquetas sobre el nombre.
// Por qué listas de filas: son 62 programas; el nombre es lo que se escanea y se recorre con el teclado (un enlace por
// fila, foco visible). Los datos que el CMS no tiene no se pintan ni se completan.
// Límite: no consulta el CMS ni traduce; recibe los grupos ya mapeados (`agruparPorFacultad`) y los textos resueltos.
import Link from 'next/link'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15
import { rutaFacultad } from '@/lib/cms/facultadRutas'
import type { GrupoFacultad } from '@/lib/cms/carrerasCatalogo'

export interface CarrerasPorFacultadLabels {
  verFacultad: string
  sinFacultad: string
  tipos: { grado: string; posgrado: string; otros: string }
  sede: string
  modalidad: string
  duracion: (n: number) => string
  /** Texto de la acción de cada fila (visible desde `sm`; en móvil es solo para lectores de pantalla). */
  action: string
}

const focus =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[#00A300]'

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

export default function CarrerasPorFacultad({ grupos, prefix, labels }: { grupos: GrupoFacultad[]; prefix: string; labels: CarrerasPorFacultadLabels }) {
  return (
    <div className="flex flex-col gap-16">
      {grupos.map((g) => (
        <section key={g.key} id={`fac-${g.key}`} aria-labelledby={`fac-${g.key}-titulo`} className="scroll-mt-28">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id={`fac-${g.key}-titulo`} className="text-balance font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
              {g.facultad ? g.facultad.nombre : labels.sinFacultad}
            </h2>
            {g.facultad && (
              <Link
                href={safeHref(`/${prefix}${rutaFacultad(g.facultad.slug).replace(/^\//, '')}`)}
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-bold text-[#004700] underline underline-offset-4 transition-colors hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
              >
                {labels.verFacultad}
              </Link>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-10">
            {g.listas.map((l) => (
              <div key={l.tipo}>
                {/* El subtítulo solo aparece si la facultad tiene más de un tipo (si no, repetiría el contexto). */}
                {g.listas.length > 1 && (
                  <h3 className="mb-4 text-lg font-bold text-[#09231D]">
                    {labels.tipos[l.tipo]} <span className="font-semibold tabular-nums text-[#3E4A45]">({l.items.length})</span>
                  </h3>
                )}
                <ul className="divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
                  {l.items.map((c) => {
                    const datos = [c.sede, c.modalidad, c.duracion ? labels.duracion(c.duracion) : undefined].filter(Boolean)
                    return (
                      <li key={c.id}>
                        <Link
                          href={safeHref(`/${prefix}carreras/${encodeURIComponent(c.slug)}`)}
                          className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 px-6 py-5 transition-colors hover:bg-[#F4F7F5] motion-reduce:transition-none sm:px-8 ${focus}`}
                        >
                          <span className="text-balance font-serif text-xl font-bold leading-snug tracking-[-0.01em] text-[#09231D] group-hover:text-[#004700] sm:text-2xl">{c.nombre}</span>
                          <span className="row-span-2 inline-flex items-center gap-2 self-center text-sm font-bold text-[#004700]">
                            <span className="hidden sm:inline">{labels.action}</span>
                            <IconArrow />
                          </span>
                          {datos.length > 0 && <span className="text-base text-[#3E4A45]">{datos.join(' · ')}</span>}
                          <span className="sr-only sm:hidden">{labels.action}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
