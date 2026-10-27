import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { getLey5189Page } from '@/lib/cms/queries/ley5189'
import { getLey5282Page } from '@/lib/cms/queries/ley5282'
import type { LeyResult } from '@/lib/cms/transparenciaLeyes'
import { safeHref } from '@/lib/security/safeUrl'
import { getT } from '@/lib/i18n/server'

// TRANS-01: hub de transparencia. Antes leía el global `transparencia` (una segunda fuente que nadie alimentaba y
// que siempre salía vacía); ahora resume las colecciones `ley5189` y `ley5282` y enlaza a cada ley. Muestra cuántas
// categorías ya tienen documentos, sin enlaces de relleno. Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md §5.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.transparencia')
  return { title: t('pageTitle'), description: t('pageDescription') }
}

type T = (key: string, values?: Record<string, string | number | Date | undefined>) => string

/** Línea de estado de una ley: avance, "aún sin documentos" o "no disponible" (tres casos distintos). */
function statusLine(result: LeyResult, t: T): string {
  if (result.status === 'unavailable') return t('unavailable')
  if (result.status === 'empty') return t('pending')
  return t('progress', { withDocs: result.groups.filter((g) => g.docs.length > 0).length, total: result.groups.length })
}

export default async function TransparenciaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, r5189, r5282] = await Promise.all([getT(locale, 'pages.transparencia'), getLey5189Page(), getLey5282Page()])
  const prefix = locale === 'es' ? '' : `${locale}/`
  const cards = [
    { key: 'ley5189', href: `/${prefix}ley-5189`, result: r5189 },
    { key: 'ley5282', href: `/${prefix}ley-5282`, result: r5282 },
  ]

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <span className="block text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">{t('portalLabel')}</span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] sm:text-5xl lg:text-6xl">{t('heading')}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{t('description')}</p>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-12 sm:pb-24">
        <div className="mx-auto grid max-w-[1260px] gap-5 px-5 sm:px-6 md:grid-cols-2 lg:px-8">
          {cards.map(({ key, href, result }) => (
            <Link
              key={key}
              href={safeHref(href)}
              className="group flex flex-col rounded-2xl border border-[#D7E0DB] bg-white p-6 transition-colors hover:border-[#008000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008000] focus-visible:ring-offset-2 sm:p-8"
            >
              <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-[#09231D]">{t(`${key}.heading`)}</h2>
              <p className="mt-3 flex-1 text-base leading-7 text-[#3F514B]">{t(`${key}.description`)}</p>
              <p className="mt-5 text-sm font-semibold text-[#004700]">{statusLine(result, t)}</p>
              <span className="mt-5 inline-flex w-fit items-center rounded-full bg-[#004700] px-5 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-[#005c00]">
                {t('viewLabel')}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
