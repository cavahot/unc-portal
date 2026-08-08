import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'

export const metadata: Metadata = {
  title: 'Aseguramiento de la Calidad',
  description:
    'La UNC impulsa la mejora continua de sus procesos académicos e institucionales a través de sistemas de evaluación, acreditación y aseguramiento de la calidad educativa.',
}

const AREAS = [
  {
    icon: '📋',
    title: 'Autoevaluación institucional',
    description:
      'Procesos periódicos de autoevaluación que identifican fortalezas, debilidades y oportunidades de mejora en las funciones sustantivas de la universidad.',
  },
  {
    icon: '✅',
    title: 'Acreditación de carreras',
    description:
      'Acompañamiento a facultades en los procesos de acreditación nacional e internacional ante organismos como ANEAES y ARCUSUR.',
  },
  {
    icon: '📈',
    title: 'Indicadores de calidad',
    description:
      'Sistema de indicadores para el seguimiento y evaluación de la calidad educativa: eficiencia terminal, titulación, desempeño docente y satisfacción estudiantil.',
  },
]

export default function AseguramientoCalidadPage() {
  return (
    <AcademicSectionPage
      title="Aseguramiento de la Calidad"
      label="Academia · Calidad"
      description="La UNC está comprometida con la mejora continua de sus estándares educativos. El área de aseguramiento de la calidad coordina procesos de evaluación, acreditación y desarrollo institucional."
      breadcrumb={[{ label: 'Academia', href: '#' }]}
      areas={AREAS}
      areasTitle="Procesos clave"
      contactEmail="secgral@unc.edu.py"
      contactLabel="¿Consultas sobre acreditación o calidad?"
    />
  )
}
