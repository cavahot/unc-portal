import { getTranslations } from 'next-intl/server'
import { getEnlacesExternos } from '@/lib/cms/queries/institutional'
import ExternalCTA from '@/components/institutional/ExternalCTA'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.solicitar-titulo' })
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  }
}

const FALLBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSekLymnL6bc1Gg2mWFflwKTR0VW4Ui3Y6CkDAm8NtgTsSI0pA/viewform'

const STEP_KEYS = ['step01', 'step02', 'step03', 'step04'] as const

export default async function SolicitarTituloPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.solicitar-titulo' })

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
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('portalLabel')}</p>
          <h1 className="text-4xl font-bold text-white">{t('heading')}</h1>
          <p className="mt-3 max-w-2xl text-white/50">{t('description')}</p>
        </div>

        {/* Prominent CTA */}
        <div className="mb-16 rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.05] p-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('ctaLabel')}</p>
          <h2 className="mb-4 text-2xl font-bold text-white">{t('ctaHeading')}</h2>
          <p className="mb-6 text-sm text-white/40">{t('ctaNote')}</p>
          <ExternalCTA href={formUrl} label={t('ctaButton')} />
        </div>

        {/* Process steps */}
        <div>
          <h2 className="mb-8 text-xl font-semibold text-white">{t('processHeading')}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {STEP_KEYS.map((key, index) => (
              <div
                key={key}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="shrink-0 text-3xl font-bold text-[#5CFF5C]/30">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-1 text-sm text-white/45">{t(`steps.${key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
