import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getCarreraBySlug } from '@/lib/cms/queries/carreras'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}): Promise<Metadata> {
  const { slug } = await searchParams
  if (!slug) return { title: 'Carrera | UNC' }

  const carrera = await getCarreraBySlug(slug)
  return {
    title: carrera
      ? `${carrera.nombre} | Universidad Nacional de Concepción`
      : 'Carrera | UNC',
    description: carrera?.descripcion ?? carrera?.titulo ?? undefined,
  }
}

export default async function CarreraDetallePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug } = await searchParams

  if (!slug) notFound()

  const carrera = await getCarreraBySlug(slug)

  if (!carrera) notFound()

  const facultad = carrera.facultad

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-white/40">
          <Link href="/carreras" className="hover:text-[#5CFF5C] transition-colors">
            Carreras
          </Link>
          <span>/</span>
          <span className="text-white/60">{carrera.nombre}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          {facultad?.nombre && (
            <Link
              href={`/facultades/detalle?slug=${facultad.slug}`}
              className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#5CFF5C] hover:underline"
            >
              {facultad.nombre}
            </Link>
          )}
          <h1 className="text-4xl font-bold text-white">{carrera.nombre}</h1>
          {carrera.titulo && (
            <p className="mt-2 text-lg text-white/60">Título: {carrera.titulo}</p>
          )}
          {carrera.descripcion && (
            <p className="mt-4 max-w-2xl text-white/60">{carrera.descripcion}</p>
          )}
        </div>

        {/* Metadata grid */}
        <div className="mb-10 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:grid-cols-3">
          {carrera.duracion && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                Duración
              </p>
              <p className="text-lg font-semibold text-white">
                {carrera.duracion} {carrera.duracion === 1 ? 'año' : 'años'}
              </p>
            </div>
          )}
          {carrera.modalidad && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                Modalidad
              </p>
              <p className="text-lg font-semibold text-white">{carrera.modalidad}</p>
            </div>
          )}
          {carrera.titulo && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                Título otorgado
              </p>
              <p className="text-base font-semibold text-white">{carrera.titulo}</p>
            </div>
          )}
        </div>

        {/* Resolution */}
        {carrera.resolucion && (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
              Resolución de acreditación
            </p>
            <p className="text-sm text-white/70">{carrera.resolucion}</p>
          </div>
        )}
      </div>
    </div>
  )
}
