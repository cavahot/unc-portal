import type { Metadata } from 'next'
import AcademicSectionPage from '@/components/pages/AcademicSectionPage'

export const metadata: Metadata = {
  title: 'Bienestar Institucional',
  description:
    'El área de Bienestar Institucional de la UNC promueve la salud integral, la inclusión y la permanencia de estudiantes, docentes y funcionarios en el ámbito universitario.',
}

const AREAS = [
  {
    icon: '🧠',
    title: 'Salud mental',
    description:
      'Servicio de acompañamiento psicológico gratuito para estudiantes, docentes y funcionarios. Atención individual y talleres de manejo del estrés y bienestar emocional.',
  },
  {
    icon: '♿',
    title: 'Inclusión y accesibilidad',
    description:
      'Programas y adaptaciones curriculares para garantizar la plena participación de personas con discapacidad en la vida universitaria.',
  },
  {
    icon: '🎒',
    title: 'Becas y apoyo económico',
    description:
      'Gestión de becas nacionales e internacionales, comedores universitarios y apoyos económicos para estudiantes en situación de vulnerabilidad.',
  },
  {
    icon: '🏃',
    title: 'Deporte y recreación',
    description:
      'Actividades deportivas, torneos inter-facultades y espacios de esparcimiento para fomentar la vida saludable en la comunidad universitaria.',
  },
  {
    icon: '🤝',
    title: 'Convivencia universitaria',
    description:
      'Protocolos de prevención de violencia y acoso, mediación de conflictos y promoción de un clima institucional inclusivo y respetuoso.',
  },
]

export default function BienestarInstitucionalPage() {
  return (
    <AcademicSectionPage
      title="Bienestar Institucional"
      label="Academia · Bienestar"
      description="La UNC cuida a su comunidad. El área de Bienestar Institucional acompaña a estudiantes, docentes y funcionarios en su desarrollo integral, promoviendo salud, inclusión y calidad de vida dentro del campus."
      breadcrumb={[{ label: 'Academia', href: '#' }]}
      areas={AREAS}
      areasTitle="Servicios disponibles"
      contactEmail="bienestar@unc.edu.py"
      contactLabel="¿Necesitás apoyo o información sobre un servicio?"
    />
  )
}
