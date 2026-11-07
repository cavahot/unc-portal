// INST-08: lista de revistas de /revistas (servidor, sin estado).
// Qué hace: una fila por revista con la portada (si el CMS la trae), el nombre, el año de inicio, la descripción y, si el CMS
// trae un enlace https válido, el botón que abre la revista en OJS en una pestaña nueva. Sin tarjetas iguales en cuadrícula
// ni etiquetas en mayúsculas sobre el nombre (reglas de diseño del portal).
// Por qué el enlace aparte y con el nombre en el texto accesible: la acción abre un sitio externo y debe anunciarse como
// tal, y varias filas con el mismo texto «Ir a la revista» no se distinguirían entre sí.
// Límite: no consulta el CMS ni traduce; recibe las revistas ya mapeadas (`mapRevistas`) y los textos resueltos.
import Image from 'next/image'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15
import type { RevistaItem } from '@/lib/cms/revistasCatalogo'

export interface RevistasListaLabels {
  /** Etiqueta accesible de la lista. */
  lista: string
  /** Texto del año de inicio, ya resuelto (p. ej. «Desde 2015»). */
  desde: (year: number) => string
  /** Texto del botón de OJS. */
  visitar: string
  /** Aviso accesible: el enlace abre un sitio externo en una pestaña nueva. */
  nuevaPestana: string
}

export default function RevistasLista({ items, labels }: { items: RevistaItem[]; labels: RevistasListaLabels }) {
  return (
    <ul aria-label={labels.lista} className="divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
      {items.map((r) => (
        <li key={r.id} className="grid gap-x-8 gap-y-4 px-6 py-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          {r.portada && (
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-[#E3EDE7]">
              <Image src={r.portada.url} alt={r.portada.alt} fill sizes="96px" className="object-cover" />
            </div>
          )}
          <div className={r.portada ? '' : 'sm:col-span-2 md:col-span-1'}>
            <h3 className="text-balance font-serif text-xl font-bold leading-snug tracking-[-0.01em] text-[#09231D] sm:text-2xl">{r.nombre}</h3>
            {r.anioInicio !== undefined && <p className="mt-2 text-base text-[#3E4A45]">{labels.desde(r.anioInicio)}</p>}
            <p className="mt-3 line-clamp-3 max-w-[65ch] text-base leading-7 text-[#1F2D27]">{r.descripcion}</p>
          </div>
          {r.urlOjs && (
            <a
              href={safeHref(r.urlOjs)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border-2 border-[#004700]/30 px-6 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300] motion-reduce:transition-none sm:col-span-2 md:col-span-1"
            >
              {labels.visitar}
              <span className="sr-only">: {r.nombre}. {labels.nuevaPestana}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
