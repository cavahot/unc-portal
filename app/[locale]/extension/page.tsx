import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'

export const metadata: Metadata = {
  title: 'Extensión y Vinculación',
  description:
    'La Universidad Nacional de Concepción articula con la comunidad a través de programas de extensión universitaria, vinculación con el sector productivo y transferencia de conocimiento.',
}

const AREAS = [
  {
    icon: '🏫',
    title: 'Proyección comunitaria',
    description:
      'Programas que articulan el saber universitario con las necesidades de comunidades rurales y urbanas del departamento de Concepción.',
  },
  {
    icon: '🤝',
    title: 'Vinculación con el sector productivo',
    description:
      'Convenios y proyectos conjuntos con organismos públicos, empresas y organizaciones de la sociedad civil orientados al desarrollo regional.',
  },
  {
    icon: '🎨',
    title: 'Arte y cultura',
    description:
      'Eventos, talleres y producciones culturales que potencian la identidad y el patrimonio del norte paraguayo.',
  },
  {
    icon: '🏥',
    title: 'Salud comunitaria',
    description:
      'Operativos y brigadas de salud coordinados con facultades de Medicina y Odontología para comunidades de escasos recursos.',
  },
  {
    icon: '⚖️',
    title: 'Consultorio jurídico gratuito',
    description:
      'Asistencia legal a ciudadanos de bajos ingresos, administrado por la Facultad de Ciencias Económicas y Administrativas.',
  },
  {
    icon: '🌾',
    title: 'Transferencia agroalimentaria',
    description:
      'Capacitaciones y asistencia técnica a productores agropecuarios en coordinación con la Facultad de Ciencias Agrarias.',
  },
]

export default function ExtensionPage() {
  return (
    <AcademicSectionPage
      title="Extensión y Vinculación"
      label="Academia · Extensión"
      description="La UNC construye puentes entre el conocimiento académico y la sociedad. Nuestros programas de extensión universitaria y vinculación fortalecen el desarrollo sostenible del norte paraguayo."
      breadcrumb={[{ label: 'Academia', href: '#' }]}
      areas={AREAS}
      areasTitle="Líneas de acción"
      contactEmail="secgral@unc.edu.py"
      contactLabel="¿Querés participar o articular con el área?"
    />
  )
}
