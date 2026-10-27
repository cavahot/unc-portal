// FAC-01: decano de la facultad, leído de la colección Autoridades (no se duplica en Facultades). Spec §2.6.
// Foto por resolveMediaUrl (ya resuelta en la consulta); sin foto, iniciales como en /autoridades.
import Image from 'next/image'
import Link from 'next/link'
import { getInitials, type Authority } from '@/lib/cms/authorities'
import { safeHref } from '@/lib/security/safeUrl'

const focus = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white'

export default function DecanoCard({
  decano,
  labels,
  autoridadesHref,
}: {
  decano: Authority
  labels: { verAutoridades: string; correo: string }
  autoridadesHref: string
}) {
  return (
    <div className="lt-reveal grid gap-8 rounded-[1.75rem] bg-[#001A00] p-7 text-white sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-10 print:bg-white print:text-black">
      {decano.photoUrl ? (
        <Image
          src={decano.photoUrl}
          alt={decano.photoAlt ?? decano.name}
          width={176}
          height={176}
          className="h-36 w-36 rounded-full object-cover sm:h-44 sm:w-44"
        />
      ) : (
        <div aria-hidden="true" className="flex h-36 w-36 items-center justify-center rounded-full bg-[#004700] font-serif text-5xl font-bold text-[#8AFF8A] sm:h-44 sm:w-44 sm:text-6xl">
          {getInitials(decano.name)}
        </div>
      )}
      <div>
        <p className="text-balance font-serif text-2xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">{decano.name}</p>
        <p className="mt-2 text-lg text-[#B8FFB8] print:text-black">{decano.role}</p>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <Link
            href={safeHref(autoridadesHref)}
            className={`inline-flex min-h-12 items-center rounded-full bg-[#8AFF8A] px-6 text-sm font-bold text-[#001A00] transition-colors hover:bg-white ${focus}`}
          >
            {labels.verAutoridades}
          </Link>
          {decano.email && (
            <a
              href={safeHref(`mailto:${decano.email}`)}
              className={`inline-flex min-h-12 items-center rounded-full bg-white/10 px-6 text-sm font-bold text-white transition-colors hover:bg-white hover:text-[#001A00] ${focus}`}
            >
              {labels.correo}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
