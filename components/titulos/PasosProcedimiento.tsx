// TITULOS-01: procedimiento paso a paso (spec docs/specs/portal/TITULOS.md §2.5).
// Qué hace: lista ordenada con los pasos del CMS; el número lo calcula el portal según la posición, así el editor solo
// ordena filas. Muestra el tiempo total si el CMS lo trae.
// Por qué así: aquí la secuencia SÍ lleva información (el orden del trámite), por eso los pasos van numerados; es una
// lista, no una fila de tarjetas. Límite: no traduce ni formatea el contenido del CMS.
import type { TituloPaso } from '@/lib/cms/titulos'

export interface PasosProcedimientoProps {
  title: string
  intro: string
  total: string | null
  /** Texto accesible del número. */
  stepLabel: (n: number) => string
  responsibleLabel: string
  pasos: TituloPaso[]
}

export default function PasosProcedimiento({ title, intro, total, stepLabel, responsibleLabel, pasos }: PasosProcedimientoProps) {
  return (
    <section aria-labelledby="titulos-procedimiento">
      <h2 id="titulos-procedimiento" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{intro}</p>
      {total && <p className="mt-2 max-w-[65ch] text-base font-semibold leading-7 tabular-nums text-[#004700]">{total}</p>}

      <ol className="mt-10 rounded-2xl bg-white px-6 sm:px-8">
        {pasos.map((paso) => (
          <li key={paso.numero} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-[#E3EAE6] py-6 first:border-t-0 print:break-inside-avoid">
            <span
              aria-label={stepLabel(paso.numero)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#004700] text-base font-bold tabular-nums text-white print:bg-white print:text-black print:ring-1 print:ring-black"
            >
              {paso.numero}
            </span>
            <div>
              <p className="text-sm font-semibold text-[#004700]">
                <span className="sr-only">{responsibleLabel}: </span>
                {paso.responsable}
              </p>
              <p className="mt-1 max-w-[65ch] text-base leading-7 text-[#26332E]">{paso.descripcion}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
