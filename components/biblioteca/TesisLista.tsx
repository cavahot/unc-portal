// INST-06: lista de tesis de /biblioteca (servidor, sin estado).
// Qué hace: una fila por tesis con el título, una línea de autoría (autor, año y facultad), el resumen y, si el CMS trae un
// enlace https válido, el botón «Ver tesis» que abre el PDF en una pestaña nueva. Sin tarjetas iguales en cuadrícula ni
// etiquetas en mayúsculas sobre el título (reglas de diseño del portal).
// Por qué filas con un enlace aparte y no la fila entera como enlace: lo que se lee es el título y el resumen, y la acción
// (abrir el PDF, un documento externo) debe anunciarse como tal; así el enlace dice qué documento abre.
// Límite: no consulta el CMS ni traduce; recibe las tesis ya mapeadas (`mapTesisList`) y los textos resueltos.
import { safeHref } from '@/lib/security/safeUrl' // DEP-15
import type { TesisItem } from '@/lib/cms/tesisCatalogo'

export interface TesisListaLabels {
  /** Etiqueta accesible de la lista. */
  lista: string
  /** Texto del botón del PDF. */
  ver: string
  /** Aviso accesible: el enlace abre un documento en una pestaña nueva. */
  nuevaPestana: string
}

export default function TesisLista({ items, labels }: { items: TesisItem[]; labels: TesisListaLabels }) {
  return (
    <ul aria-label={labels.lista} className="divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
      {items.map((t) => {
        const datos = [t.autor, String(t.anio), t.facultad].filter(Boolean)
        return (
          <li key={t.id} className="grid gap-x-8 gap-y-4 px-6 py-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h3 className="text-balance font-serif text-xl font-bold leading-snug tracking-[-0.01em] text-[#09231D] sm:text-2xl">{t.titulo}</h3>
              <p className="mt-2 text-base text-[#3E4A45]">{datos.join(' · ')}</p>
              {t.resumen && <p className="mt-3 line-clamp-3 max-w-[65ch] text-base leading-7 text-[#1F2D27]">{t.resumen}</p>}
            </div>
            {t.urlPdf && (
              <a
                href={safeHref(t.urlPdf)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border-2 border-[#004700]/30 px-6 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300] motion-reduce:transition-none"
              >
                {labels.ver}
                <span className="sr-only">: {t.titulo}. {labels.nuevaPestana}</span>
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}
