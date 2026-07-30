import { getEnlacesExternos } from '@/lib/cms/queries/institutional'
import ExternalCTA from '@/components/institutional/ExternalCTA'
import RichText from '@/components/RichText'

export const metadata = {
  title: 'Información Pública — UNC',
  description:
    'Acceso a la información pública de la Universidad Nacional de Concepción según la Ley N° 5.282/2014.',
}

const FALLBACK_PORTAL_URL = 'https://informacionpublica.paraguay.gov.py'

export default async function InformacionPublicaPage() {
  let portalUrl = FALLBACK_PORTAL_URL
  let richContent: { root: any } | null = null

  try {
    const enlaces = await getEnlacesExternos()
    if (enlaces.urlPortalInfoPublica) {
      portalUrl = enlaces.urlPortalInfoPublica
    }
    if (enlaces.contenidoInfoPublica?.root) {
      richContent = enlaces.contenidoInfoPublica
    }
  } catch {
    // CMS unavailable — use fallback silently
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="mb-12">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Portal UNC</p>
          <h1 className="text-4xl font-bold text-white">Acceso a la Información Pública</h1>
          <p className="mt-3 max-w-2xl text-white/50">
            La Universidad Nacional de Concepción garantiza el acceso a la información pública en
            cumplimiento de la Ley N° 5.282/2014 de libre acceso ciudadano.
          </p>
        </div>

        {/* Rich text content from CMS or static fallback */}
        <div className="mb-12">
          {richContent ? (
            <RichText content={richContent} />
          ) : (
            <div className="space-y-4 text-white/70">
              <p className="leading-relaxed">
                Toda persona tiene derecho a solicitar y recibir información completa, veraz, adecuada
                y oportuna de cualquier institución del Estado Paraguayo, conforme a lo establecido en
                la Ley N° 5.282/2014.
              </p>
              <p className="leading-relaxed">
                Para ejercer este derecho podés utilizar el Portal Unificado de Acceso a la Información
                Pública del Gobierno Nacional, disponible en el siguiente enlace.
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Acceso externo</p>
          <h2 className="mb-4 text-xl font-bold text-white">Portal de Información Pública del Paraguay</h2>
          <p className="mb-6 text-sm text-white/40">
            Serás redirigido al portal oficial del Gobierno Nacional.
          </p>
          <ExternalCTA
            href={portalUrl}
            label="Portal de Acceso de Información Pública"
          />
        </div>

      </div>
    </div>
  )
}
