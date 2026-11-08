// Dirección General Académica: título y descripción salen del catálogo por idioma (pages.direccion-general-academica).
// La sección sigue «en desarrollo» (sin áreas): la plantilla muestra su aviso traducido.
// Límite: el catálogo es editorial (no CMS); el gn está pendiente de revisión nativa.
import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.direccion-general-academica')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function DireccionGeneralAcademicaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.direccion-general-academica')

  return (
    <AcademicSectionPage
      title={t('hero.title')}
      label={t('hero.label')}
      description={t('hero.description')}
      breadcrumb={[{ label: t('breadcrumb'), href: '#' }]}
      underConstruction
      contactEmail="secgral@unc.edu.py"
      contactLabel={t('contactLabel')}
    />
  )
}
