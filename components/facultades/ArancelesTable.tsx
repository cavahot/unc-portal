// FAC-01: aranceles de la facultad en tablas reales por grupo (spec FACULTADES.md §2.8). Mismo formato de monto que
// /aranceles-rectorado (`formatGuaranies`, sin depender del ICU del motor); `<data value>` conserva el número exacto.
import { formatGuaranies } from '@/lib/cms/aranceles'
import type { ArancelFacultad, ArancelFacultadGrupo } from '@/lib/cms/facultad'

export interface ArancelesTableLabels {
  concept: string
  amount: string
  currencyName: string
  caption: (grupo: string) => string
  /** Texto accesible del índice; opcional para conservar compatibilidad con consumidores existentes. */
  groupIndex?: string
  grupos: Record<ArancelFacultadGrupo, string>
}

/** Un grupo largo ocupa el ancho completo; la lectura permanece en una sola columna para evitar tablas apretadas. */
export default function ArancelesTable({
  groups,
  labels,
}: {
  groups: Array<{ grupo: ArancelFacultadGrupo; items: ArancelFacultad[] }>
  labels: ArancelesTableLabels
}) {
  const hasIndex = groups.length > 1
  return (
    <div className="max-w-3xl">
      {hasIndex && (
        <nav aria-label={labels.groupIndex ?? 'Grupos de aranceles'} className="mb-5 print:hidden">
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.grupo}>
                <a href={`#aranceles-${g.grupo}`} className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#004700] transition-colors hover:bg-[#004700] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004700]">
                  {labels.grupos[g.grupo]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="flex flex-col gap-5">
        {groups.map((g) => {
          const title = labels.grupos[g.grupo]
          return (
            <div key={g.grupo} id={`aranceles-${g.grupo}`} className="lt-reveal overflow-hidden rounded-[1.25rem] bg-white print:break-inside-avoid">
              <table className="w-full text-left text-[0.95rem]">
                <caption className="px-5 pb-3 pt-5 text-left font-serif text-xl font-bold text-[#001A00] sm:px-7 sm:pt-6">
                  {title}
                  <span className="sr-only"> — {labels.caption(title)}</span>
                </caption>
                <thead>
                  <tr className="bg-[#F4F7F5] text-sm text-[#3E4A45]">
                    <th scope="col" className="px-5 py-2.5 font-semibold sm:px-7">{labels.concept}</th>
                    <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-right font-semibold sm:px-7">
                      {labels.amount} ({labels.currencyName})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((i, idx) => (
                    <tr key={i.id} className={`transition-colors hover:bg-[#E3F3E6] ${idx % 2 === 1 ? 'bg-[#FAFCFB]' : ''}`}>
                      <th scope="row" className="px-5 py-3 font-normal text-[#001A00] sm:px-7">
                        {i.concepto}
                        {i.nota && <span className="block text-sm text-[#3E4A45]">{i.nota}</span>}
                      </th>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-[#004700] sm:px-7">
                        <data value={i.monto}>{formatGuaranies(i.monto)}</data>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
