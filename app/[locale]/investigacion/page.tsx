// I18N-GN-INV-01: la página consume el catálogo por locale y no conserva textos de contenido en código.
// Qué hace: construye la vista con messages/{locale}/pages.investigacion.json.
// Amenaza: evita que /gn muestre contenido español por literales hardcodeados y permite actualizar el catálogo de forma trazable.
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.investigacion.meta')
  return { title: t('title'), description: t('description') }
}

export default async function InvestigacionPage() {
  const locale = await getLocale()
  const t = await getTranslations('pages.investigacion')
  const areaKeys = ['a1', 'a2', 'a3', 'a4'] as const
  const icons = ['🔬', '🌱', '⚙️', '🏛️']

  const areas = areaKeys.map((key, index) => ({
    icon: icons[index],
    title: t(`areas.${key}.area`),
    // Las tres líneas del catálogo se mantienen juntas para no perder información editorial.
    description: [t(`areas.${key}.p1`), t(`areas.${key}.p2`), t(`areas.${key}.p3`)].join(' · '),
  }))

  return (
    <AcademicSectionPage
      title={t('hero.title')}
      label={t('hero.label')}
      description={t('hero.description')}
      breadcrumb={[{ label: t('breadcrumb'), href: `/${locale}` }]}
      areas={areas}
      areasTitle={t('lines.title')}
      contactEmail="secgral@unc.edu.py"
      contactLabel={t('cta.title')}
      visualVariant="research"
    />
  )
}
