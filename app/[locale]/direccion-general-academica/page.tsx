import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'

export const metadata: Metadata = {
  title: 'Dirección General Académica',
  description:
    'La Dirección General Académica de la UNC coordina los procesos académicos, curriculares y de evaluación de la oferta educativa universitaria.',
}

export default function DireccionGeneralAcademicaPage() {
  return (
    <AcademicSectionPage
      title="Dirección General Académica"
      label="Academia · DGA"
      description="La Dirección General Académica articula los procesos de planificación curricular, evaluación docente y regulación académica de todas las unidades de la Universidad Nacional de Concepción."
      breadcrumb={[{ label: 'Academia', href: '#' }]}
      underConstruction
      contactEmail="secgral@unc.edu.py"
      contactLabel="¿Consultas sobre gestión académica?"
    />
  )
}
