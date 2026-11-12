// Bienestar Institucional: título, descripción y servicios salen del catálogo por idioma (pages.bienestar-institucional);
// sin textos de contenido en el código. Español en «usted» (antes usaba voseo).
// Límite: el catálogo es editorial (no CMS); el gn está pendiente de revisión nativa.
import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.bienestar-institucional')
  return { title: t('meta.title'), description: t('meta.description') }
}

const ICONS = ['🧠', '♿', '🎒', '🏃', '🤝']

export default async function BienestarInstitucionalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.bienestar-institucional')
  const areas = ICONS.map((icon, i) => ({ icon, title: t(`areas.a${i + 1}.title`), description: t(`areas.a${i + 1}.description`) }))

  return (
    <AcademicSectionPage
      title={t('hero.title')}
      label={t('hero.label')}
      description={t('hero.description')}
      breadcrumb={[{ label: t('breadcrumb'), href: '#' }]}
      areas={areas}
      areasTitle={t('areasTitle')}
      contactEmail="bienestar@unc.edu.py"
      contactLabel={t('contactLabel')}
    />
  )
}
