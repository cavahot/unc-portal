import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getFacultadBySlug } from '@/lib/cms/queries/facultades'
import { getCarrerasByFacultad } from '@/lib/cms/queries/carreras'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}): Promise<Metadata> {
  const { slug } = await searchParams
  if (!slug) return { title: 'Facultad | UNC' }

  const facultad = await getFacultadBySlug(slug)
  return {
    title: facultad
      ? `${facultad.nombre} | Universidad Nacional de Concepción`
      : 'Facultad | UNC',
    description: facultad?.descripcion ?? undefined,
  }
}

export default async function FacultadDetallePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug } = await searchParams

  if (!slug) notFound()

  const [facultad, carreras] = await Promise.all([
    getFacultadBySlug(slug),
    getCarrerasByFacultad(slug),
  ])

  if (!facultad) notFound()

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-white/40">
          <Link href="/facultades" className="hover:text-[#5CFF5C] transition-colors">
            Facultades
          </Link>
          <span>/</span>
          <span className="text-white/60">{facultad.nombre}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            Universidad Nacional de Concepción
          </p>
          <h1 className="text-4xl font-bold text-white">{facultad.nombre}</h1>
          {facultad.descripcion && (
            <p className="mt-4 max-w-2xl text-white/60">{facultad.descripcion}</p>
          )}
        </div>

        {/* Contact info */}
        {(facultad.decano || facultad.email || facultad.telefono) && (
          <div className="mb-10 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:grid-cols-3">
            {facultad.decano && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                  Decano/a
                </p>
                <p className="text-sm text-white">{facultad.decano}</p>
              </div>
            )}
            {facultad.email && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                  Correo
                </p>
                <a
                  href={`mailto:${facultad.email}`}
                  className="text-sm text-white hover:text-[#8AFF8A] transition-colors"
                >
                  {facultad.email}
                </a>
              </div>
            )}
            {facultad.telefono && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                  Teléfono
                </p>
                <p className="text-sm text-white">{facultad.telefono}</p>
              </div>
            )}
          </div>
        )}

        {/* Carreras */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-white">Carreras</h2>

          {carreras.length === 0 ? (
            <p className="text-white/40">No hay carreras registradas para esta facultad.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {carreras.map((c: any) => (
                <Link
                  key={c.slug}
                  href={`/carreras/detalle?slug=${c.slug}`}
                  className="group rounded-xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07]"
                >
                  <h3 className="mb-1 font-semibold text-white transition-colors group-hover:text-[#8AFF8A]">
                    {c.nombre}
                  </h3>
                  {c.titulo && (
                    <p className="text-xs text-white/50">{c.titulo}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    {c.duracion && (
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                        {c.duracion} {c.duracion === 1 ? 'año' : 'años'}
                      </span>
                    )}
                    {c.modalidad && (
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                        {c.modalidad}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
