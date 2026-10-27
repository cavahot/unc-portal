import type { Metadata } from 'next'
import LeyDocumentos from '@/components/transparencia/LeyDocumentos'
import { getLey5282Page } from '@/lib/cms/queries/ley5282'
import { getT } from '@/lib/i18n/server'

// TRANS-01: página de la Ley 5282/2014 (Art. 8°, 17 ítems). Usa su colección PROPIA `ley5282` y su etiqueta de
// caché; la presentación y los estados los resuelve LeyDocumentos. Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.ley-5282')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function Ley5282Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.ley-5282'), getLey5282Page()])
  return <LeyDocumentos locale={locale} result={result} t={t} />
}
