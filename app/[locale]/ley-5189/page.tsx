import type { Metadata } from 'next'
import LeyDocumentos from '@/components/transparencia/LeyDocumentos'
import { getLey5189Page } from '@/lib/cms/queries/ley5189'
import { getT } from '@/lib/i18n/server'

// TRANS-01: página de la Ley 5189/2014. Los documentos vienen de la colección `ley5189` del CMS (sin datos de
// demostración); la presentación y los tres estados (ok / empty / unavailable) los resuelve LeyDocumentos.
// Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.ley-5189')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function Ley5189Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.ley-5189'), getLey5189Page()])
  return <LeyDocumentos locale={locale} result={result} t={t} />
}
