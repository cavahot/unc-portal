import { cmsFetch } from '../client'
import { PayloadResponse } from '../types'

export const FAQ_CATEGORIES = [
  { value: 'horarios',      label: 'Horarios y Atención',     icon: '⏰' },
  { value: 'admision',      label: 'Admisión e Inscripción',  icon: '🎓' },
  { value: 'tramites',      label: 'Trámites',                icon: '📋' },
  { value: 'servicios',     label: 'Servicios',               icon: '🏛️' },
  { value: 'transparencia', label: 'Transparencia',           icon: '📊' },
  { value: 'rrhh',          label: 'Recursos Humanos',        icon: '💼' },
  { value: 'titulos',       label: 'Títulos y Certificados',  icon: '📜' },
] as const

export type FAQCategory = (typeof FAQ_CATEGORIES)[number]['value']

export interface FAQItem {
  id: number
  question: string
  answer: {
    root: {
      type: string
      children: unknown[]
    }
  }
  category: FAQCategory
  order: number
  tags?: Array<{ tag: string }>
}

export const DEMO_FAQS: FAQItem[] = [
  // Horarios
  {
    id: 1,
    question: '¿Cuál es el horario de atención?',
    answer: lexical('El Rectorado y la mayoría de las dependencias atienden de lunes a viernes de 07:00 a 13:00 hs. Algunas unidades académicas tienen horarios extendidos hasta las 19:00 hs. Te recomendamos confirmar con la facultad correspondiente antes de concurrir.'),
    category: 'horarios',
    order: 1,
  },
  {
    id: 2,
    question: '¿Abren durante los feriados?',
    answer: lexical('No. Las oficinas permanecen cerradas los días feriados nacionales y los asuetos universitarios declarados por el Rectorado. El calendario de asuetos se publica en el portal institucional.'),
    category: 'horarios',
    order: 2,
  },
  {
    id: 3,
    question: '¿Dónde están ubicados?',
    answer: lexical('El Campus Central de la UNC se encuentra en Ruta V Gral. Bernardino Caballero Km 2, Concepción, Paraguay. La Facultad de Medicina también cuenta con instalaciones en el predio del Hospital Regional de Concepción. Algunas facultades tienen filiales en Horqueta.'),
    category: 'horarios',
    order: 3,
  },
  // Admisión
  {
    id: 4,
    question: '¿Dónde puedo ver las carreras que tiene la Universidad?',
    answer: lexical('Podés consultar la oferta académica completa en la sección Carreras del portal, o ingresar directamente al sitio de cada facultad. La UNC ofrece carreras en Medicina, Odontología, Ciencias Agrarias, Ciencias Económicas, Humanidades y Ciencias Exactas.'),
    category: 'admision',
    order: 1,
  },
  {
    id: 5,
    question: '¿Cuándo inician las clases?',
    answer: lexical('El año lectivo generalmente inicia en marzo. Las fechas exactas se publican en el Calendario Académico de cada facultad. Te recomendamos verificar directamente con la unidad académica de tu interés, ya que los cronogramas pueden variar entre facultades.'),
    category: 'admision',
    order: 2,
  },
  {
    id: 6,
    question: '¿Cómo hago para estudiar en la UNC?',
    answer: lexical('Para inscribirte en una carrera de grado: (1) elegí la carrera y la facultad, (2) reuní los documentos requeridos, (3) presentate en la secretaría de la facultad en el período de inscripción, (4) completá el proceso de preinscripción. Algunas carreras requieren rendir el Curso de Preparación e Ingreso (CPI).'),
    category: 'admision',
    order: 3,
  },
  {
    id: 7,
    question: '¿Qué documentos necesito para inscribirme?',
    answer: lexical('Los documentos básicos para inscripción de grado son: cédula de identidad vigente, título de bachillerato (original y fotocopia), certificado de notas del bachillerato, dos fotos carnet 3x4 y formulario de inscripción completado. Algunos programas pueden requerir documentación adicional.'),
    category: 'admision',
    order: 4,
  },
  {
    id: 8,
    question: '¿Qué es el CPI?',
    answer: lexical('El CPI (Curso de Preparación e Ingreso) es un curso nivelatorio que deben rendir los aspirantes a determinadas carreras, especialmente Medicina. El curso evalúa conocimientos básicos de Biología, Química, Física y Matemáticas. La aprobación del CPI es requisito para continuar con la inscripción regular.'),
    category: 'admision',
    order: 5,
  },
  // Trámites
  {
    id: 9,
    question: '¿Qué trámites se realizan en el Rectorado?',
    answer: lexical('En el Rectorado se gestionan: legalización y apostilla de documentos universitarios, emisión de títulos, certificados de estudios, constancias de egreso, registros académicos generales, trámites de convenios y acuerdos institucionales, y gestiones administrativas que involucren a más de una facultad.'),
    category: 'tramites',
    order: 1,
  },
  {
    id: 10,
    question: '¿Las inscripciones a carreras se realizan en el Rectorado?',
    answer: lexical('No. Las inscripciones a carreras de grado, programas de postgrado y cursos de extensión se realizan directamente en cada facultad. El Rectorado no gestiona inscripciones académicas. Dirigite a la secretaría de la unidad académica de tu interés.'),
    category: 'tramites',
    order: 2,
  },
  {
    id: 11,
    question: '¿Tienen costo los trámites?',
    answer: lexical('Algunos trámites son gratuitos (constancias de estudio, certificados internos) y otros tienen un arancel establecido por resolución rectorado (legalizaciones, apostillas, reposición de títulos). Los aranceles vigentes están disponibles en la sección de Aranceles del portal.'),
    category: 'tramites',
    order: 3,
  },
  {
    id: 12,
    question: '¿Dónde puedo saber qué documentos necesito para un trámite específico?',
    answer: lexical('En la sección Trámites del portal encontrarás la guía detallada de cada gestión: requisitos, pasos, costos y tiempo estimado. También podés consultar directamente en las dependencias correspondientes o al correo secgral@unc.edu.py.'),
    category: 'tramites',
    order: 4,
  },
  {
    id: 13,
    question: '¿Los trámites se pueden realizar a distancia?',
    answer: lexical('Algunos trámites administrativos pueden iniciarse en forma digital, pero la mayoría requieren presencia personal para la entrega de documentación original. Estamos avanzando hacia la digitalización de servicios. Consultá la guía de trámites para saber cuáles admiten gestión remota.'),
    category: 'tramites',
    order: 5,
  },
  // Servicios
  {
    id: 14,
    question: '¿Qué servicios ofrece la UNC?',
    answer: lexical('La UNC ofrece a su comunidad: biblioteca digital, laboratorios, consultorio jurídico gratuito, brigadas de salud, actividades culturales y deportivas, bienestar estudiantil, bolsa de trabajo y convenios con instituciones nacionales e internacionales. Algunos servicios están disponibles también para la comunidad externa.'),
    category: 'servicios',
    order: 1,
  },
  {
    id: 15,
    question: '¿Los servicios tienen algún costo?',
    answer: lexical('La mayoría de los servicios académicos y de bienestar son gratuitos para estudiantes activos. Algunos servicios especiales (impresiones, laboratorio externo, cursos de extensión) tienen aranceles diferenciados. El consultorio jurídico es gratuito para personas de bajos ingresos.'),
    category: 'servicios',
    order: 2,
  },
  // Transparencia
  {
    id: 16,
    question: '¿Dónde puedo encontrar información sobre presupuesto, nómina, viajes y becas?',
    answer: lexical('Toda la información de acceso público está disponible en la sección Transparencia e Información Pública del portal, en cumplimiento de la Ley 5282/2014. Podés consultar presupuestos, nóminas, declaraciones juradas, contratos, viáticos y más. También podés realizar solicitudes formales de información pública.'),
    category: 'transparencia',
    order: 1,
  },
  // RRHH
  {
    id: 17,
    question: '¿Cómo hago para trabajar en la UNC?',
    answer: lexical('Los cargos docentes y administrativos se cubren mediante concursos públicos de méritos y aptitudes, convocados por resolución del Rectorado o de cada facultad. Las convocatorias se publican en el portal, en el Diario Oficial y en medios locales. No hay inscripciones espontáneas permanentes.'),
    category: 'rrhh',
    order: 1,
  },
  {
    id: 18,
    question: '¿Dónde puedo ver los resultados de los concursos?',
    answer: lexical('Los resultados de concursos docentes y administrativos se publican en el portal institucional, en el tablón de anuncios de cada facultad y en el Diario Oficial cuando corresponde. También podés suscribirte a las notificaciones del portal para recibir actualizaciones.'),
    category: 'rrhh',
    order: 2,
  },
  // Títulos
  {
    id: 19,
    question: '¿Cómo gestiono mi título universitario?',
    answer: lexical('Para solicitar tu título debés: (1) completar todas las materias y defensas requeridas, (2) presentarte en la secretaría de tu facultad con los documentos de egreso, (3) la facultad eleva la solicitud al Rectorado, (4) el Rectorado procesa el título y lo remite al MEC para el registro nacional. El proceso tarda aproximadamente 60 días hábiles.'),
    category: 'titulos',
    order: 1,
  },
  {
    id: 20,
    question: '¿Cuándo inician los exámenes parciales, finales y defensas de tesis?',
    answer: lexical('Los calendarios de exámenes parciales, finales y defensas se publican en el Calendario Académico de cada facultad al inicio del semestre. Los períodos pueden variar entre unidades académicas. Consultá el calendario en la sección correspondiente del portal o directamente con tu facultad.'),
    category: 'admision',
    order: 6,
  },
]

function lexical(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text, format: 0 }],
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

export async function getFAQs(): Promise<FAQItem[]> {
  try {
    const res = await cmsFetch<PayloadResponse<FAQItem>>(
      '/faqs?where[active][equals]=true&sort=order&limit=100',
      { tags: ['faqs'], next: { revalidate: 3600 } },
    )
    return res.docs ?? []
  } catch {
    return DEMO_FAQS
  }
}
