// FAC-01: cabecera de la página de facultad (spec docs/specs/portal/FACULTADES.md §2.3). Componente de presentación:
// recibe datos ya validados por lib/cms/facultad.ts y textos ya traducidos; no consulta el CMS.
// Diseño: campo verde institucional liso con el nombre en serif grande a la izquierda y, a la derecha, una «ficha»
// blanca (logo + datos contados desde el CMS). Nunca muestra cifras que no salgan de los datos (antes «30+ años»).
import Image from 'next/image'
import Link from 'next/link'
import { safeHref } from '@/lib/security/safeUrl'

export interface FacultadHeroProps {
  nombre: string
  siglas?: string
  descripcion?: string
  logoSrc?: string
  logoAlt: string
  breadcrumb: { inicio: string; inicioHref: string; facultades: string; facultadesHref: string }
  /** Acción principal del primer pantallazo (ancla a las carreras). */
  cta?: { label: string; href: string }
  ficha: {
    label: string
    /** Filas ya resueltas; solo las que tienen dato. */
    rows: Array<{ term: string; value: string }>
  }
}

const linkFocus =
  'rounded-sm underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]'

export default function FacultadHero({ nombre, siglas, descripcion, logoSrc, logoAlt, breadcrumb, cta, ficha }: FacultadHeroProps) {
  return (
    <section className="relative bg-[#004700] pb-16 pt-28 text-white sm:pt-32 lg:pb-24 print:bg-white print:pb-4 print:pt-0 print:text-black">
      <div className="mx-auto max-w-[1260px] px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-10 print:hidden">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            <li>
              <Link href={safeHref(breadcrumb.inicioHref)} className={linkFocus}>
                {breadcrumb.inicio}
              </Link>
            </li>
            <li aria-hidden="true" className="select-none text-white/50">/</li>
            <li>
              <Link href={safeHref(breadcrumb.facultadesHref)} className={linkFocus}>
                {breadcrumb.facultades}
              </Link>
            </li>
            <li aria-hidden="true" className="select-none text-white/50">/</li>
            <li className="font-semibold text-white" aria-current="page">
              {nombre}
            </li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-end lg:gap-16">
          <div>
            {/* Las siglas van como parte del nombre, no como etiqueta decorativa sobre el título. */}
            <h1 className="text-balance font-serif text-[2.6rem] font-bold leading-[0.98] tracking-[-0.035em] text-white sm:text-6xl lg:text-[5.25rem] print:text-black">
              {nombre}
            </h1>
            {siglas && <p className="mt-4 text-xl font-semibold tracking-[0.02em] text-[#8AFF8A] sm:text-2xl print:text-black">{siglas}</p>}
            {descripcion && <p className="mt-7 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl sm:leading-9 print:text-black">{descripcion}</p>}
            {cta && (
              <a
                href={safeHref(cta.href)}
                className="mt-9 inline-flex min-h-12 items-center rounded-full bg-[#8AFF8A] px-7 text-base font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white print:hidden"
              >
                {cta.label}
              </a>
            )}
          </div>

          <aside aria-label={ficha.label} className="rounded-[1.75rem] bg-white p-6 text-[#001A00] shadow-none sm:p-8 print:border print:border-black">
            {logoSrc && (
              <div className="mb-6 flex items-center gap-4">
                <Image src={logoSrc} alt={logoAlt} width={88} height={88} priority className="h-20 w-20 shrink-0 object-contain sm:h-[5.5rem] sm:w-[5.5rem]" />
                <p className="text-sm font-semibold leading-5 text-[#3E4A45]">{ficha.label}</p>
              </div>
            )}
            <dl className="grid gap-4">
              {ficha.rows.map((r) =>
                // Un valor largo (el nombre del decano) va debajo de su rótulo; un número, a la derecha.
                r.value.length > 6 ? (
                  <div key={r.term} className="rounded-2xl bg-[#F4F7F5] px-4 py-3">
                    <dt className="text-sm text-[#3E4A45]">{r.term}</dt>
                    <dd className="mt-1 font-serif text-xl font-bold leading-snug text-[#004700]">{r.value}</dd>
                  </div>
                ) : (
                  <div key={r.term} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-2xl bg-[#F4F7F5] px-4 py-3">
                    <dt className="text-sm text-[#3E4A45]">{r.term}</dt>
                    <dd className="font-serif text-3xl font-bold tabular-nums leading-none text-[#004700]">{r.value}</dd>
                  </div>
                ),
              )}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}
