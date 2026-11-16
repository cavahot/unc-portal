// INST-01: datos que debe aportar la persona al solicitar información (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1).
// Qué hace: una lista de verificación con los datos del CMS y, al lado, la dirección de correo de la oficina.
// Por qué así: la lista es el contenido, no un adorno; la persona la usa para preparar su solicitud. El correo se arma
// como enlace `mailto:` solo si pasó la validación de formato en `lib/cms/informacionPublica.ts`.
// Límite: no valida que el buzón exista; eso es responsabilidad de quien edita el CMS.
export interface DatosRequeridosProps {
  title: string
  intro: string
  listLabel: string
  datos: string[]
  correoTitle: string
  correoBody: string
  correo: string
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-4 w-4 shrink-0 text-[#00A300]" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  )
}

export default function DatosRequeridos({ title, intro, listLabel, datos, correoTitle, correoBody, correo }: DatosRequeridosProps) {
  return (
    <section aria-labelledby="info-datos" className="rounded-2xl bg-white p-6 sm:p-8 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
      <div>
        <h2 id="info-datos" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{intro}</p>
        <div className="mt-8">
          <h3 className="text-lg font-bold text-[#004700]">{correoTitle}</h3>
          <p className="mt-2 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{correoBody}</p>
          <a
            href={`mailto:${correo}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-sm font-semibold text-[#004700] underline underline-offset-4 transition-colors hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
          >
            {correo}
          </a>
        </div>
      </div>
      <ul aria-label={listLabel} className="mt-8 flex flex-col gap-3 lg:mt-0">
        {datos.map((dato, i) => (
          <li key={i} className="flex items-start gap-3 text-base leading-7 text-[#26332E]">
            <IconCheck />
            <span className="max-w-[65ch]">{dato}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
