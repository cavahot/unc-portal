// FAC-01: sello de acreditación (spec FACULTADES.md §2.7). Solo se renderiza con filas que `mapAccreditations`
// dejó pasar (active + verificado + vigencia no vencida): la página nunca afirma una acreditación sin evidencia.
import type { Accreditation } from '@/lib/cms/queries/accreditations'
import { safeHref } from '@/lib/security/safeUrl'

const ORGANISMOS: Record<string, string> = { aneaes: 'ANEAES', arcusur: 'ARCU-SUR' }

export default function AcreditacionBadge({
  items,
  labels,
}: {
  items: Accreditation[]
  labels: { badge: (organismo: string) => string; vigencia: (anio: number) => string; fuente: string }
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => {
        const org = ORGANISMOS[a.organism] ?? a.organism.toUpperCase()
        return (
          <li key={a.id} className="lt-reveal flex items-start gap-5 rounded-[1.25rem] bg-white p-6">
            <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#004700] text-[#8AFF8A]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <path d="m5 12 4.5 4.5L19 7" />
              </svg>
            </span>
            <div>
              <p className="font-serif text-xl font-bold text-[#001A00]">{labels.badge(org)}</p>
              <p className="mt-1 text-base text-[#3E4A45]">
                {a.programa}
                {a.vigenciaAnio ? ` · ${labels.vigencia(a.vigenciaAnio)}` : ''}
              </p>
              {a.fuenteUrl && (
                <a href={safeHref(a.fuenteUrl)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#004700] underline underline-offset-4">
                  {labels.fuente}
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
