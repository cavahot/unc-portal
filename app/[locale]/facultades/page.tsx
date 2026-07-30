import { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getFacultades } from '@/lib/cms/queries/facultades'

export const metadata: Metadata = {
  title: 'Facultades | Universidad Nacional de Concepción',
  description: 'Conocé las 6 facultades de la Universidad Nacional de Concepción.',
}

export default async function FacultadesPage() {
  const facultades = await getFacultades()

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-12">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            Universidad Nacional de Concepción
          </p>
          <h1 className="text-4xl font-bold text-white">Facultades</h1>
          <p className="mt-2 text-white/50">
            Unidades académicas que conforman nuestra institución.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {facultades.map((f: any) => (
            <Link
              key={f.slug}
              href={`/facultades/detalle?slug=${f.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
            >
              <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-[#8AFF8A]">
                {f.nombre}
              </h3>
              {f.descripcion && (
                <p className="mb-3 line-clamp-2 flex-1 text-sm text-white/45">{f.descripcion}</p>
              )}
              {f.decano && (
                <p className="mt-auto text-xs text-white/30">Decano/a: {f.decano}</p>
              )}
              <p className="mt-3 text-xs font-semibold text-[#5CFF5C]">Ver carreras →</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
