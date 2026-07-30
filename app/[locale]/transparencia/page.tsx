import { getTransparencia } from '@/lib/cms/queries/institutional'
import DocumentCard from '@/components/institutional/DocumentCard'

export const metadata = {
  title: 'Transparencia — UNC',
  description:
    'Información institucional de cumplimiento legal según las Leyes N° 5.189/2014 y N° 5.282/2014 de la Universidad Nacional de Concepción.',
}

export default async function TransparenciaPage() {
  let data: Awaited<ReturnType<typeof getTransparencia>> = { ley5189: [], ley5282: [] }

  try {
    data = await getTransparencia()
  } catch {
    // CMS unavailable — render empty sections silently
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="mb-14">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Portal UNC</p>
          <h1 className="text-4xl font-bold text-white">Transparencia Institucional</h1>
          <p className="mt-3 max-w-2xl text-white/50">
            En cumplimiento de las Leyes de Transparencia de la República del Paraguay, la Universidad
            Nacional de Concepción pone a disposición de la ciudadanía la siguiente información institucional.
          </p>
        </div>

        {/* Ley 5.189/2014 */}
        <section className="mb-14" aria-labelledby="ley5189-heading">
          <div className="mb-6">
            <h2 id="ley5189-heading" className="text-xl font-semibold text-white">
              Ley N° 5.189/2014
            </h2>
            <p className="mt-1 text-sm text-white/40">
              Que establece la obligatoriedad de la provisión de informaciones en los organismos,
              entidades e instituciones del Estado.
            </p>
          </div>

          {data.ley5189.length === 0 ? (
            <p className="text-sm text-white/30 italic">No hay documentos disponibles.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.ley5189.map((item, i) => (
                <DocumentCard key={i} label={item.label} url={item.url} nota={item.nota} />
              ))}
            </div>
          )}
        </section>

        {/* Ley 5.282/2014 */}
        <section aria-labelledby="ley5282-heading">
          <div className="mb-6">
            <h2 id="ley5282-heading" className="text-xl font-semibold text-white">
              Ley N° 5.282/2014
            </h2>
            <p className="mt-1 text-sm text-white/40">
              De libre acceso ciudadano a la información pública y gubernamental.
            </p>
          </div>

          {data.ley5282.length === 0 ? (
            <p className="text-sm text-white/30 italic">No hay documentos disponibles.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.ley5282.map((item, i) => (
                <DocumentCard key={i} label={item.label} url={item.url} nota={item.nota} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
