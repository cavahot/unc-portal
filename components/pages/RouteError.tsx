'use client'

// INST-01: límite de error de ruta compartido (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5).
// Qué hace: si algo falla de forma inesperada al pintar una página, muestra un aviso en línea con el estilo del portal,
// con una salida clara (reintentar y contacto) y una referencia para soporte, y reporta la excepción a Sentry.
// Por qué existe: el límite global usa otro estilo y textos fijos sin traducir; aquí el error se captura dentro del
// diseño del portal y en el idioma de la persona. Cada ruta lo usa con su propio espacio de nombres de mensajes.
// Amenazas que evita: filtrar al visitante el mensaje o el stack del error (solo se muestra el `digest`, que no revela
// nada interno) y una ventana modal que atrape el foco para algo que no lo necesita (patrón SweetAlert2).
// Límite: no distingue la causa; el detalle queda en Sentry y en los registros del servidor.
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export interface RouteErrorProps {
  /** Espacio de nombres con las claves `error.title`, `error.body`, `error.retry`, `error.contact` y `error.reference`. */
  namespace: string
  error: Error & { digest?: string }
  reset: () => void
}

export default function RouteError({ namespace, error, reset }: RouteErrorProps) {
  const t = useTranslations(namespace)

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <section className="bg-[#F4F7F5] pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-[760px] px-5 sm:px-6 lg:px-8">
        <div role="alert" className="rounded-2xl bg-white p-8 sm:p-10">
          <h1 className="text-balance font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">{t('error.title')}</h1>
          <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{t('error.body')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {t('error.retry')}
            </button>
            <Link
              href="/contacto"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {t('error.contact')}
            </Link>
          </div>
          {error.digest && <p className="mt-8 text-sm tabular-nums text-[#3E4A45]">{t('error.reference', { digest: error.digest })}</p>}
        </div>
      </div>
    </section>
  )
}
