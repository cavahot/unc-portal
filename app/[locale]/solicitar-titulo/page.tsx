import { getEnlacesExternos } from '@/lib/cms/queries/institutional'
import ExternalCTA from '@/components/institutional/ExternalCTA'

export const metadata = {
  title: 'Solicitar Título — UNC',
  description:
    'Solicita la gestión de tu título universitario en la Universidad Nacional de Concepción a través del formulario oficial.',
}

const FALLBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSekLymnL6bc1Gg2mWFflwKTR0VW4Ui3Y6CkDAm8NtgTsSI0pA/viewform'

const STEPS = [
  {
    number: '01',
    title: 'Completá el formulario',
    description: 'Ingresá tus datos personales y la información de tu carrera.',
  },
  {
    number: '02',
    title: 'Adjuntá la documentación',
    description:
      'Cédula de identidad, certificado de egreso y demás documentos requeridos según tu facultad.',
  },
  {
    number: '03',
    title: 'Seguimiento',
    description:
      'Recibirás notificaciones sobre el estado de tu solicitud a través del correo registrado.',
  },
  {
    number: '04',
    title: 'Retiro del título',
    description:
      'Una vez aprobado, te notificaremos la fecha y lugar de entrega de tu diploma universitario.',
  },
]

export default async function SolicitarTituloPage() {
  let formUrl = FALLBACK_FORM_URL

  try {
    const enlaces = await getEnlacesExternos()
    if (enlaces.formularioTitulos) {
      formUrl = enlaces.formularioTitulos
    }
  } catch {
    // CMS unavailable — use fallback URL silently
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="mb-14">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Portal UNC</p>
          <h1 className="text-4xl font-bold text-white">Solicitud de Título Universitario</h1>
          <p className="mt-3 max-w-2xl text-white/50">
            Iniciá el proceso de gestión de tu diploma universitario de forma online a través del
            formulario oficial de la Universidad Nacional de Concepción.
          </p>
        </div>

        {/* CTA prominente */}
        <div className="mb-16 rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.05] p-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Iniciar ahora</p>
          <h2 className="mb-4 text-2xl font-bold text-white">¿Listo para solicitar tu título?</h2>
          <p className="mb-6 text-sm text-white/40">
            Este formulario abre en Google Forms en una nueva pestaña.
          </p>
          <ExternalCTA href={formUrl} label="Iniciar solicitud" />
        </div>

        {/* Pasos del proceso */}
        <div>
          <h2 className="mb-8 text-xl font-semibold text-white">Proceso de solicitud</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="shrink-0 text-3xl font-bold text-[#5CFF5C]/30">{step.number}</span>
                <div>
                  <h3 className="font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm text-white/45">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
