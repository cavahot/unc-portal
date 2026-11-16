// INST-01: aviso en línea cuando una página no tiene contenido publicable o el CMS no responde
// (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5). Servidor, sin estado.
// Qué hace: muestra un mensaje claro con una salida («Intentar de nuevo» solo si el CMS no responde, y «Contacto»).
// Por qué así: un error de carga NO es una acción que confirmar, así que no es un modal: no interrumpe ni atrapa el
// foco (alternativa accesible a SweetAlert2). `role="status"` lo anuncia a los lectores de pantalla sin robar el foco.
// Amenaza que evita: contenido de demostración o escrito en el código cuando el CMS falla; filtrar detalles internos
// (aquí solo llegan textos ya traducidos, nunca el error). Límite: no reintenta por sí solo; el enlace recarga la página.
import Link from 'next/link'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15

export interface StatePanelProps {
  message: string
  /** Si se pasa, aparece «Intentar de nuevo» (solo para el estado «no disponible»). */
  retry?: { href: string; label: string }
  contact: { href: string; label: string }
}

const primary =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const secondary =
  'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'

export default function StatePanel({ message, retry, contact }: StatePanelProps) {
  return (
    <div role="status" className="rounded-2xl bg-white p-6 sm:p-8">
      <p className="max-w-[65ch] text-base leading-7 text-[#3E4A45]">{message}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {retry && (
          <Link href={safeHref(retry.href)} prefetch={false} className={primary}>
            {retry.label}
          </Link>
        )}
        <Link href={safeHref(contact.href)} className={retry ? secondary : primary}>
          {contact.label}
        </Link>
      </div>
    </div>
  )
}
