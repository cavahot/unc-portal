// INST-01 (T3): secciones del hub /institucional (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.2 y §2.6).
// Qué hace: una lista de filas, cada una un único enlace a la página de destino con su título, su descripción y su
// acción. Todo viene del CMS; la ruta sale de la lista cerrada de destinos (`lib/cms/institucional.ts`), nunca de un
// valor libre del editor.
// Por qué así: las secciones NO son tarjetas iguales con icono ni «etiqueta + título»: son filas de una sola lista, con
// separadores finos, que se leen de arriba abajo y se recorren con el teclado (un enlace por fila, foco visible).
// Límite: no consulta el CMS ni traduce; recibe los textos ya resueltos.
import Link from 'next/link'
import type { InstitucionalSeccion } from '@/lib/cms/institucional'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15

export interface HubSeccionesProps {
  title: string
  intro: string
  secciones: InstitucionalSeccion[]
  /** Prefijo de idioma para las rutas («» en español, «gn/» en guaraní, etc.). */
  prefix: string
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

export default function HubSecciones({ title, intro, secciones, prefix }: HubSeccionesProps) {
  return (
    <section aria-labelledby="inst-secciones">
      <h2 id="inst-secciones" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{intro}</p>

      <ul className="mt-10 divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
        {secciones.map((s) => (
          <li key={s.destino}>
            <Link
              href={safeHref(`/${prefix}${s.ruta.replace(/^\//, '')}`)}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 px-6 py-6 transition-colors hover:bg-[#F4F7F5] focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[#00A300] motion-reduce:transition-none sm:px-8"
            >
              <span className="text-xl font-bold text-[#004700] sm:text-2xl">{s.titulo}</span>
              <span className="row-span-2 inline-flex items-center gap-2 self-center text-sm font-bold text-[#004700]">
                <span className="hidden sm:inline">{s.accion}</span>
                <IconArrow />
              </span>
              <span className="max-w-[65ch] text-base leading-7 text-[#3E4A45]">{s.descripcion}</span>
              <span className="sr-only sm:hidden">{s.accion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
