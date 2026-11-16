// TITULOS-01: cabecera de /titulos (spec docs/specs/portal/TITULOS.md §2.5). Servidor, sin estado.
// Qué hace: migas, título y descripción (del CMS), los datos del trámite como lista de definición simple y un índice de
// salto por tipo de universidad (la acción principal de la página). Hereda la cabecera de Aranceles del Rectorado.
// Por qué así: la persona llega con una pregunta (¿qué llevo, cuánto cuesta, cuánto tarda?); los datos van en prosa
// de hechos, sin «métricas» sueltas ni etiquetas sobre los títulos. Todos los textos llegan ya traducidos.
// Límite: no consulta el CMS ni formatea montos; eso lo hace la página.
import Link from 'next/link'
import type { TituloAcento } from '@/lib/cms/titulos'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href que llega por props pasa por la allowlist de esquemas
import { ACENTO_BG } from './acento'

export interface HeroFact {
  term: string
  value: string
  /** Enlace de salida cuando el valor es un aviso (p. ej. arancel sin fila enlazada). */
  link?: { href: string; label: string }
}

export interface TitulosHeroProps {
  homeHref: string
  homeLabel: string
  pageName: string
  title: string
  description: string | null
  factsLabel: string
  facts: HeroFact[]
  updatedText: string | null
  indexLabel: string
  index: Array<{ slug: string; etiqueta: string; acento: TituloAcento; countText: string }>
}

const linkFocus =
  'rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]'

export default function TitulosHero(props: TitulosHeroProps) {
  const { facts, index } = props
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 text-white sm:pt-32 lg:pb-28 print:bg-none print:pb-4 print:pt-0 print:text-black">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl print:hidden" />

      <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8 print:hidden">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <li>
              <Link href={safeHref(props.homeHref)} className={linkFocus}>
                {props.homeLabel}
              </Link>
            </li>
            <li aria-hidden="true" className="select-none text-white/50">/</li>
            <li className="font-semibold text-white" aria-current="page">{props.pageName}</li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-end lg:gap-16">
          <div>
            <h1 className="text-balance font-serif text-5xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl print:text-black">
              {props.title}
            </h1>
            {props.description && (
              <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 print:text-black">{props.description}</p>
            )}

            {facts.length > 0 && (
              <dl aria-label={props.factsLabel} className="mt-8 grid max-w-xl gap-x-10 gap-y-5 sm:grid-cols-2 print:text-black">
                {facts.map((fact) => (
                  <div key={fact.term}>
                    <dt className="text-sm text-white/75 print:text-black">{fact.term}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-white print:text-black">
                      {fact.value}
                      {fact.link && (
                        <Link href={safeHref(fact.link.href)} className="mt-1 block text-sm font-semibold text-[#B8FFB8] underline underline-offset-4 print:text-black">
                          {fact.link.label}
                        </Link>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {props.updatedText && <p className="mt-6 text-sm font-semibold text-[#B8FFB8] print:text-black">{props.updatedText}</p>}
          </div>

          {/* Firma: el índice de tipos es la acción principal (elegir su caso). Visible también en móvil. */}
          {index.length > 0 && (
            <nav aria-labelledby="titulos-index" className="print:hidden">
              <p id="titulos-index" className="mb-3 text-sm font-semibold text-white/80">
                {props.indexLabel}
              </p>
              <ul className="flex flex-col gap-2">
                {index.map((item) => (
                  <li key={item.slug}>
                    <a
                      href={`#tipo-${item.slug}`}
                      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl bg-white/[0.09] px-6 py-4 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                    >
                      <span aria-hidden="true" data-acento={item.acento} className={`h-2.5 w-2.5 rounded-full ${ACENTO_BG[item.acento]}`} />
                      <span className="text-base font-semibold text-white group-hover:text-[#004700]">{item.etiqueta}</span>
                      <span className="text-sm tabular-nums text-white/75 group-hover:text-[#004700]/75">{item.countText}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </section>
  )
}
