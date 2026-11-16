'use client'

// Página 404 en el estilo claro del portal, con textos por idioma (`pages.estados`) y salidas a inicio y noticias.
// Antes era una pantalla oscura de 380 líneas con textos en español fijos y voseo. Es un componente de cliente porque
// `not-found` de la ruta localizada se renderiza dentro del proveedor de idioma del layout.
// Límite: la ruta que falló no se muestra (no se refleja la URL ingresada, para no inyectar texto del visitante).
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  const t = useTranslations('pages.estados')
  return (
    <section className="bg-[#F4F7F5] pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-[760px] px-5 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 sm:p-10">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#008000]">{t('notFound.code')}</p>
          <h1 className="mt-3 text-balance font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">{t('notFound.title')}</h1>
          <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{t('notFound.body')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {t('notFound.home')}
            </Link>
            <Link
              href="/noticias"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {t('notFound.news')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
