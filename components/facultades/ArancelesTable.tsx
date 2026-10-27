// FAC-01: aranceles de la facultad en tablas reales por grupo (spec FACULTADES.md §2.8). Mismo formato de monto que
// /aranceles-rectorado (`formatGuaranies`, sin depender del ICU del motor); `<data value>` conserva el número exacto.
import { formatGuaranies } from '@/lib/cms/aranceles'
import type { ArancelFacultad, ArancelFacultadGrupo } from '@/lib/cms/facultad'

export interface ArancelesTableLabels {
  concept: string
  amount: string
  currencyName: string
  caption: (grupo: string) => string
  grupos: Record<ArancelFacultadGrupo, string>
}

/** Un grupo largo ocupa el ancho completo; los cortos van de a dos en pantallas anchas. */
const LONG_GROUP = 8

export default function ArancelesTable({
  groups,
  labels,
}: {
  groups: Array<{ grupo: ArancelFacultadGrupo; items: ArancelFacultad[] }>
  labels: ArancelesTableLabels
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map((g) => {
        const title = labels.grupos[g.grupo]
        return (
          <div key={g.grupo} className={`lt-reveal overflow-hidden rounded-[1.25rem] bg-white ${g.items.length > LONG_GROUP ? 'lg:col-span-2' : ''} print:break-inside-avoid`}>
            <table className="w-full text-left text-[0.95rem]">
              <caption className="px-5 pb-3 pt-5 text-left font-serif text-xl font-bold text-[#001A00] sm:px-7 sm:pt-6">
                {title}
                <span className="sr-only"> — {labels.caption(title)}</span>
              </caption>
              <thead>
                <tr className="bg-[#F4F7F5] text-sm text-[#3E4A45]">
                  <th scope="col" className="px-5 py-2.5 font-semibold sm:px-7">{labels.concept}</th>
                  <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-right font-semibold sm:px-7">
                    {labels.amount} <abbr title={labels.currencyName} className="no-underline">(Gs.)</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((i, idx) => (
                  <tr key={i.id} className={idx % 2 === 1 ? 'bg-[#FAFCFB]' : undefined}>
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
  )
}
