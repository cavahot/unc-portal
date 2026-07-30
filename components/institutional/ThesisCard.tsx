const FACULTY_LABELS: Record<string, string> = {
  odontologia: 'Odontología',
  medicina: 'Medicina',
  'ciencias-agrarias': 'Ciencias Agrarias',
  'ciencias-exactas': 'Ciencias Exactas y Tecnológicas',
  humanidades: 'Humanidades y Cs. de la Educación',
  'ciencias-economicas': 'Ciencias Económicas y Administrativas',
}

interface ThesisCardProps {
  titulo: string
  autor: string
  anio: number
  facultad: string
  urlPdf: string
  resumen?: string | null
}

export default function ThesisCard({
  titulo,
  autor,
  anio,
  facultad,
  urlPdf,
  resumen,
}: ThesisCardProps) {
  const facultadLabel = FACULTY_LABELS[facultad] ?? facultad

  return (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]">
      {/* Faculty badge */}
      <span className="mb-3 inline-block w-fit rounded-full border border-[#5CFF5C]/25 bg-[#5CFF5C]/8 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-[#5CFF5C]">
        {facultadLabel}
      </span>

      <h3 className="mb-1 font-semibold leading-snug text-white group-hover:text-[#8AFF8A] transition-colors">
        {titulo}
      </h3>

      <div className="mb-3 flex items-center gap-2 text-xs text-white/40">
        <span>{autor}</span>
        <span aria-hidden="true">·</span>
        <span>{anio}</span>
      </div>

      {resumen && (
        <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-white/50">
          {resumen}
        </p>
      )}

      <a
        href={urlPdf}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-[#5CFF5C] transition-colors hover:text-[#8AFF8A]"
      >
        Ver tesis
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
