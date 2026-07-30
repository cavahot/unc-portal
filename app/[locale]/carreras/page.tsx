import { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getCarreras } from '@/lib/cms/queries/carreras'

export const metadata: Metadata = {
  title: 'Carreras | Universidad Nacional de Concepción',
  description: 'Explorá todas las carreras de grado de la Universidad Nacional de Concepción.',
}

export default async function CarrerasPage() {
  const carreras = await getCarreras()

  // Group by facultad slug → { slug: string, nombre: string, carreras: Carrera[] }
  const grouped = carreras.reduce(
    (acc: Record<string, { nombre: string; slug: string; carreras: any[] }>, c: any) => {
      const facultadSlug: string = c.facultad?.slug ?? 'sin-facultad'
      const facultadNombre: string = c.facultad?.nombre ?? 'Sin facultad'
      if (!acc[facultadSlug]) {
        acc[facultadSlug] = { slug: facultadSlug, nombre: facultadNombre, carreras: [] }
      }
      acc[facultadSlug].carreras.push(c)
      return acc
    },
    {} as Record<string, { nombre: string; slug: string; carreras: any[] }>,
  )

  const grupos = Object.values(grouped)

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-12">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            Universidad Nacional de Concepción
          </p>
          <h1 className="text-4xl font-bold text-white">Carreras</h1>
          <p className="mt-2 text-white/50">
            Oferta académica de grado de nuestra institución.
          </p>
        </div>

        <div className="space-y-14">
          {grupos.map((grupo) => (
            <section key={grupo.slug}>
              <div className="mb-5 flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">{grupo.nombre}</h2>
                <Link
                  href={`/facultades/detalle?slug=${grupo.slug}`}
                  className="text-xs text-[#5CFF5C] hover:underline"
                >
                  Ver facultad →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.carreras.map((c: any) => (
                  <Link
                    key={c.slug}
                    href={`/carreras/detalle?slug=${c.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
                  >
                    <h3 className="mb-1 font-semibold text-white transition-colors group-hover:text-[#8AFF8A]">
                      {c.nombre}
                    </h3>
                    {c.titulo && (
                      <p className="mb-3 text-xs text-white/50">{c.titulo}</p>
                    )}
                    <div className="mt-auto flex items-center gap-2 flex-wrap">
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
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
