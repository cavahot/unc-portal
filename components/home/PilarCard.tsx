// PILARES-01 (S1, S2): tarjeta de un pilar académico en la franja «Excelencia académica» de la portada.
// Qué hace: reproduce la estructura de la «Propuesta 02 • Editorial & Métricas» (ícono en recuadro, título serif, bajada,
//   descripción, recuadro con hasta dos métricas y botón a todo el ancho) con las fuentes y los verdes del portal.
// Interacción: sombra siempre; al pasar el cursor o con foco de teclado sube 4 px (solo si no se pidió reducir el
//   movimiento), crece la sombra, el borde toma el verde del portal y el botón pasa a verde. Toda la tarjeta es clicable
//   con un único enlace (el del botón, extendido con `after:inset-0`), así el lector de pantalla oye un solo enlace.
// Límite: solo dibuja lo que trae el CMS; sin métricas no hay recuadro de cifras.
import { Link } from '@/i18n/navigation'
import type { Pilar } from '@/lib/cms/pilares'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: la ruta sale de una lista fija, pero todo href no literal pasa por aquí
import PilarIcon from './PilarIcon'

export default function PilarCard({ pilar }: { pilar: Pilar }) {
  const [primera, segunda] = pilar.metricas
  return (
    <article className="group relative flex h-full w-full flex-col justify-between rounded-2xl border border-[#09231D]/10 bg-gradient-to-b from-white to-[#F4F7F5] p-8 text-left shadow-[0_16px_36px_-18px_rgba(0,35,0,0.55)] transition duration-300 ease-out hover:border-[#00A300]/40 hover:shadow-[0_28px_56px_-20px_rgba(0,35,0,0.7)] focus-within:border-[#00A300]/40 focus-within:shadow-[0_28px_56px_-20px_rgba(0,35,0,0.7)] motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1">
      <div>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6FFE6] text-[#004700]">
          <PilarIcon icono={pilar.icono} />
        </div>
        <h3 className="mb-1 font-serif text-2xl font-bold tracking-[-0.02em] text-[#09231D]">{pilar.titulo}</h3>
        {pilar.bajada && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#008000]">{pilar.bajada}</p>
        )}
        <p className="mb-6 text-sm leading-relaxed text-[#4A5C52]">{pilar.descripcion}</p>

        {primera && (
          <dl data-metricas className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-[#E3EDE7] bg-white p-4 shadow-sm">
            <div className="flex flex-col-reverse">
              <dt className="text-[11px] uppercase tracking-wide text-[#5F6E68]">{primera.etiqueta}</dt>
              <dd className="font-serif text-2xl font-bold text-[#004700]">{primera.valor}</dd>
            </div>
            {segunda && (
              <>
                <div data-divisor aria-hidden="true" className="h-8 w-px bg-[#E3EDE7]" />
                <div className="flex flex-col-reverse">
                  <dt className="text-[11px] uppercase tracking-wide text-[#5F6E68]">{segunda.etiqueta}</dt>
                  <dd className="font-serif text-2xl font-bold text-[#09231D]">{segunda.valor}</dd>
                </div>
              </>
            )}
          </dl>
        )}
      </div>

      <Link
        href={safeHref(pilar.href)}
        className="inline-flex w-full items-center justify-between rounded-xl bg-[#F4F7F5] px-4 py-2.5 text-xs font-semibold text-[#1F2D27] transition-colors duration-200 after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:bg-[#004700] group-hover:text-white focus-visible:bg-[#004700] focus-visible:text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
      >
        <span>{pilar.enlaceTexto}</span>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </article>
  )
}
