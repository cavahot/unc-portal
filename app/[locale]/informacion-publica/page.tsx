import { getTranslations } from 'next-intl/server'
import { getEnlacesExternos } from '@/lib/cms/queries/institutional'
import ExternalCTA from '@/components/institutional/ExternalCTA'
import RichText from '@/components/RichText'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.informacion-publica' })
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  }
}

const FALLBACK_PORTAL_URL = 'https://informacionpublica.paraguay.gov.py'

export default async function InformacionPublicaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.informacion-publica' })

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
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('portalLabel')}</p>
          <h1 className="text-4xl font-bold text-white">{t('heading')}</h1>
          <p className="mt-3 max-w-2xl text-white/50">{t('description')}</p>
        </div>

        {/* Rich text content from CMS or static fallback */}
        <div className="mb-12">
          {richContent ? (
            <RichText content={richContent} />
          ) : (
            <div className="space-y-4 text-white/70">
              <p className="leading-relaxed">{t('fallbackParagraph1')}</p>
              <p className="leading-relaxed">{t('fallbackParagraph2')}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('ctaLabel')}</p>
          <h2 className="mb-4 text-xl font-bold text-white">{t('ctaHeading')}</h2>
          <p className="mb-6 text-sm text-white/40">{t('ctaNote')}</p>
          <ExternalCTA href={portalUrl} label={t('ctaButton')} />
        </div>

      </div>
    </div>
  )
}
