import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'

export const metadata: Metadata = {
  title: 'Investigación',
  description:
    'La Universidad Nacional de Concepción promueve la investigación científica y tecnológica orientada al desarrollo regional y al avance del conocimiento.',
}

const AREAS = [
  {
    icon: '🔬',
    title: 'Investigación científica',
    description:
      'Proyectos de investigación básica y aplicada en ciencias naturales, exactas, de la salud y humanidades, financiados por fondos nacionales e internacionales.',
  },
  {
    icon: '🏛️',
    title: 'Instituto de Investigación',
    description:
      'Centro interdisciplinario que coordina la agenda investigativa de la universidad, articula grupos y gestiona publicaciones científicas.',
  },
  {
    icon: '🌍',
    title: 'Cooperación internacional',
    description:
      'Redes de investigación con universidades de América Latina, Europa y organismos internacionales para el intercambio académico y científico.',
  },
  {
    icon: '📊',
    title: 'Transferencia tecnológica',
    description:
      'Articulación con el sector público y privado para la aplicación de resultados de investigación en soluciones concretas para la sociedad.',
  },
  {
    icon: '📰',
    title: 'Publicaciones científicas',
    description:
      'Revistas académicas y repositorios institucionales que difunden el conocimiento generado por investigadores de la UNC.',
  },
  {
    icon: '🎓',
    title: 'Formación de investigadores',
    description:
      'Programas de postgrado y semilleros de investigación para estudiantes avanzados que deseen desarrollar una carrera científica.',
  },
]

export default function InvestigacionPage() {
  return (
    <AcademicSectionPage
      title="Investigación"
      label="Academia · Investigación"
      description="La UNC impulsa la producción de conocimiento científico comprometido con el desarrollo sostenible del norte paraguayo y la mejora de la calidad de vida de sus comunidades."
      breadcrumb={[{ label: 'Academia', href: '#' }]}
      areas={AREAS}
      areasTitle="Líneas de trabajo"
      contactEmail="secgral@unc.edu.py"
      contactLabel="¿Interesado en proyectos de investigación?"
    />
  )
}
