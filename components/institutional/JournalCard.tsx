import Image from 'next/image'
import { UNC_BLUR } from '@/lib/imagePlaceholder'

interface JournalCardProps {
  nombre: string
  descripcion: string
  anioInicio: number
  urlOjs: string
  portada?: {
    url?: string | null
    alt?: string | null
  } | null
}

export default function JournalCard({
  nombre,
  descripcion,
  anioInicio,
  urlOjs,
  portada,
}: JournalCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]">
      {/* Cover image */}
      {portada?.url ? (
        <div className="relative h-44 overflow-hidden bg-[#004700]/20">
          <Image
            src={portada.url}
            alt={portada.alt || nombre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            placeholder="blur"
            blurDataURL={UNC_BLUR}
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-[#004700]/20">
          <svg
            aria-hidden="true"
            className="h-12 w-12 text-[#5CFF5C]/20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-[#5CFF5C]">
          Desde {anioInicio}
        </p>
        <h3 className="mb-2 text-[0.95rem] font-semibold leading-snug text-white group-hover:text-[#8AFF8A] transition-colors">
          {nombre}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-white/45">{descripcion}</p>

        <a
          href={urlOjs}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#5CFF5C]/30 bg-[#5CFF5C]/10 px-4 py-2 text-xs font-semibold text-[#5CFF5C] transition-colors hover:bg-[#5CFF5C]/20 hover:text-white"
        >
          Ver revista
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </a>
      </div>
    </div>
  )
}
