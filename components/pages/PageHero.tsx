// INST-01: cabecera común de las páginas de Transparencia, Información Pública e Institución
// (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.6). Servidor, sin estado.
// Qué hace: migas, título (h1) y descripción sobre el degradado verde institucional, con un espacio opcional a la
// derecha (`aside`) para la acción principal de la página. Hereda la cabecera de /titulos.
// Por qué compartida: las tres páginas deben verse como una sola familia; el título y la descripción llegan ya
// resueltos (CMS o aviso). Sin etiqueta sobre el título (el título lleva su propio peso).
// Límite: no consulta el CMS ni traduce; recibe textos y enlaces ya preparados.
import type { ReactNode } from 'react'
import Link from 'next/link'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href que llega por props pasa por la allowlist de esquemas

export interface PageHeroProps {
  homeHref: string
  homeLabel: string
  pageName: string
  title: string
  description: string | null
  /** Línea de apoyo bajo la descripción (p. ej. la ley que ampara la página). */
  note?: string | null
  aside?: ReactNode
}

const linkFocus =
  'inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]'

export default function PageHero({ homeHref, homeLabel, pageName, title, description, note, aside }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 text-white sm:pt-32 lg:pb-28 print:bg-none print:pb-4 print:pt-0 print:text-black">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl print:hidden" />
      <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8 print:hidden">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <li>
              <Link href={safeHref(homeHref)} className={linkFocus}>
                {homeLabel}
              </Link>
            </li>
            <li aria-hidden="true" className="select-none text-white/50">/</li>
            <li className="font-semibold text-white" aria-current="page">{pageName}</li>
          </ol>
        </nav>

        <div className={aside ? 'grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-end lg:gap-16' : ''}>
          <div>
            <h1 className="text-balance font-serif text-5xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl print:text-black">
              {title}
            </h1>
            {description && <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 print:text-black">{description}</p>}
            {note && <p className="mt-5 max-w-xl text-sm font-semibold text-[#B8FFB8] print:text-black">{note}</p>}
          </div>
          {aside}
        </div>
      </div>
    </section>
  )
}
