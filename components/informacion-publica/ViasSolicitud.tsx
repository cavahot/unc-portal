// INST-01: vías para solicitar información pública (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1 y §2.6).
// Qué hace: una sección por vía, con ancla (`#via-<slug>`) a la que salta el índice de la cabecera. La vía recomendada
// lleva el botón principal y un rótulo fijo de la interfaz; las demás, el botón secundario. Todo viene del CMS.
// Por qué así: las vías NO son tarjetas iguales con icono: cada una es una fila con su título y su acción, y no hay un
// color distinto por vía (un color libre del CMS llegaría a un `style`). Los enlaces ya llegan validados (ruta interna o
// https de host oficial) desde `lib/cms/informacionPublica.ts` y vuelven a pasar por `safeHref`.
// Límite: no formatea ni traduce el contenido del CMS.
import Link from 'next/link'
import type { InfoVia } from '@/lib/cms/informacionPublica'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15

export interface ViasSolicitudProps {
  title: string
  intro: string
  vias: InfoVia[]
  recommended: string
  newTab: string
  /** Prefijo de idioma para las rutas internas («» en español, «gn/» en guaraní, etc.). */
  prefix: string
}

const focus = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const primary = `inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] ${focus}`
const secondary = `inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] ${focus}`

/** Antepone el idioma a una ruta interna; los enlaces externos no se tocan. */
function withLocale(href: string, externo: boolean, prefix: string): string {
  return externo ? href : `/${prefix}${href.replace(/^\//, '')}`
}

export default function ViasSolicitud({ title, intro, vias, recommended, newTab, prefix }: ViasSolicitudProps) {
  return (
    <section aria-labelledby="info-vias">
      <h2 id="info-vias" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{intro}</p>

      <div className="mt-10 flex flex-col gap-6">
        {vias.map((via) => (
          <section
            key={via.slug}
            id={`via-${via.slug}`}
            aria-labelledby={`via-${via.slug}-titulo`}
            className="scroll-mt-24 rounded-2xl bg-white p-6 sm:p-8 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 print:break-inside-avoid"
          >
            <div>
              <h3 id={`via-${via.slug}-titulo`} className="text-xl font-bold text-[#004700] sm:text-2xl">
                {via.titulo}
              </h3>
              <p className="mt-2 text-base text-[#3E4A45]">{via.etiqueta}</p>
              {via.destacada && (
                <p className="mt-3 inline-flex rounded-full bg-[#E4F7E4] px-3 py-1 text-sm font-semibold text-[#004700]">{recommended}</p>
              )}
            </div>
            <div className="mt-6 lg:mt-0">
              <p className="max-w-[65ch] text-base leading-7 text-[#26332E]">{via.descripcion}</p>
              {via.accion && (
                <div className="mt-6">
                  <Link
                    href={safeHref(withLocale(via.accion.href, via.accion.externo, prefix))}
                    className={via.destacada ? primary : secondary}
                    {...(via.accion.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {via.accion.texto}
                    {via.accion.externo && <span className="sr-only"> {newTab}</span>}
                  </Link>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
