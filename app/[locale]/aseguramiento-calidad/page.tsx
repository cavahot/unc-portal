// Aseguramiento de la Calidad: título, descripción y áreas salen del catálogo por idioma (pages.aseguramiento-calidad);
// la página ya no conserva textos de contenido en el código, así que /en, /pt-BR y /gn no muestran español.
// Límite: el catálogo es editorial (no CMS); el gn está pendiente de revisión nativa.
import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.aseguramiento-calidad')
  return { title: t('meta.title'), description: t('meta.description') }
}

const ICONS = ['📋', '✅', '📈']

export default async function AseguramientoCalidadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.aseguramiento-calidad')
  const areas = ICONS.map((icon, i) => ({ icon, title: t(`areas.a${i + 1}.title`), description: t(`areas.a${i + 1}.description`) }))

  return (
    <AcademicSectionPage
      title={t('hero.title')}
      label={t('hero.label')}
      description={t('hero.description')}
      breadcrumb={[{ label: t('breadcrumb'), href: '#' }]}
      areas={areas}
      areasTitle={t('areasTitle')}
      contactEmail="secgral@unc.edu.py"
      contactLabel={t('contactLabel')}
    />
  )
}
