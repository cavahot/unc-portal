// TITULOS-01: documentos que debe presentar, por tipo de universidad (spec docs/specs/portal/TITULOS.md §2.5).
// Qué hace: un bloque por tipo con su título y su lista de requisitos, y la nota del CONES si existe. Todo viene del CMS.
// Por qué así: los tipos NO son tres tarjetas iguales con icono: cada tipo es una sección con ancla (`#tipo-<slug>`) a la
// que salta el índice de la cabecera, y la lista de requisitos es el contenido, no un adorno.
// Amenaza que evita: un `acento` o una URL del CMS llevados sin filtrar; aquí el acento es una clase fija y el enlace del
// CONES ya llegó validado (host exacto) desde `lib/cms/titulos.ts`. Límite: no formatea ni traduce el contenido.
import type { TituloTipo } from '@/lib/cms/titulos'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: el enlace del CONES viene del CMS; defensa en profundidad
import { ACENTO_BG } from './acento'

export interface TiposDocumentosProps {
  title: string
  intro: string
  /** Texto accesible de la lista; recibe el título del tipo. */
  listLabel: (tipo: string) => string
  tipos: TituloTipo[]
  nota: { texto: string; url: string | null } | null
  conesLink: string
  newTab: string
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-4 w-4 shrink-0 text-[#00A300]" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  )
}

export default function TiposDocumentos({ title, intro, listLabel, tipos, nota, conesLink, newTab }: TiposDocumentosProps) {
  return (
    <section aria-labelledby="titulos-documentos">
      <h2 id="titulos-documentos" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{intro}</p>

      <div className="mt-10 flex flex-col gap-6">
        {tipos.map((tipo) => (
          <section
            key={tipo.slug}
            id={`tipo-${tipo.slug}`}
            aria-labelledby={`tipo-${tipo.slug}-titulo`}
            className="scroll-mt-24 rounded-2xl bg-white p-6 sm:p-8 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 print:break-inside-avoid"
          >
            <div>
              <h3 id={`tipo-${tipo.slug}-titulo`} className="flex items-center gap-3 text-xl font-bold text-[#004700] sm:text-2xl">
                <span aria-hidden="true" data-acento={tipo.acento} className={`h-2.5 w-2.5 shrink-0 rounded-full ${ACENTO_BG[tipo.acento]}`} />
                {tipo.titulo}
              </h3>
              {tipo.subtitulo && <p className="mt-2 text-base text-[#3E4A45]">{tipo.subtitulo}</p>}
            </div>
            <ul aria-label={listLabel(tipo.titulo)} className="mt-6 flex flex-col gap-3 lg:mt-0">
              {tipo.requisitos.map((requisito, i) => (
                <li key={i} className="flex items-start gap-3 text-base leading-7 text-[#26332E]">
                  <IconCheck />
                  <span className="max-w-[65ch]">{requisito}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {nota && (
        <aside className="mt-6 rounded-2xl bg-white p-6 text-base leading-7 text-[#26332E] sm:p-8">
          <p className="max-w-[65ch]">{nota.texto}</p>
          {nota.url && (
            <a
              href={safeHref(nota.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center rounded-sm font-semibold text-[#004700] underline underline-offset-4 transition-colors hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {conesLink}
              <span className="sr-only"> {newTab}</span>
            </a>
          )}
        </aside>
      )}
    </section>
  )
}
