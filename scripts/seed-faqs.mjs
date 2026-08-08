/**
 * seed-faqs.mjs
 * Seeds the FAQs collection in Payload CMS.
 *
 * Usage:
 *   node scripts/seed-faqs.mjs
 *
 * Requires:
 *   PAYLOAD_SECRET and DATABASE_URI env vars (from apps/cms/.env)
 */

import dotenv from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../apps/cms/.env') })

const CMS_URL = process.env.CMS_URL || 'http://localhost:3002'
const EMAIL = process.env.SEED_USER_EMAIL || 'admin@unc.edu.py'
const PASSWORD = process.env.SEED_USER_PASSWORD

if (!PASSWORD) {
  console.error('❌  Set SEED_USER_PASSWORD in env (or apps/cms/.env)')
  process.exit(1)
}

/* ─── Auth ────────────────────────────────────────────────────────────────── */

async function login() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('Login failed: ' + JSON.stringify(data))
  console.log('✅  Logged in as', EMAIL)
  return data.token
}

/* ─── FAQ data ────────────────────────────────────────────────────────────── */

function paragraph(text) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text, format: 0, version: 1 }],
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

const FAQS = [
  // ── Horarios ──────────────────────────────────────────────────────────────
  {
    question: '¿Cuál es el horario de atención al público?',
    answer: paragraph(
      'El Rectorado y la mayoría de las dependencias atienden de lunes a viernes de 07:00 a 13:00 hs. Algunas unidades académicas tienen horarios extendidos hasta las 19:00 hs. Te recomendamos confirmar con la facultad correspondiente antes de concurrir.',
    ),
    category: 'horarios',
    order: 1,
    active: true,
    tags: [{ tag: 'horario' }, { tag: 'atención' }, { tag: 'rectorado' }],
  },
  {
    question: '¿Abren durante los feriados?',
    answer: paragraph(
      'No. Las oficinas permanecen cerradas los días feriados nacionales y los asuetos universitarios declarados por el Rectorado. El calendario de asuetos se publica en el portal institucional.',
    ),
    category: 'horarios',
    order: 2,
    active: true,
    tags: [{ tag: 'feriado' }, { tag: 'asueto' }],
  },
  {
    question: '¿Dónde están ubicados?',
    answer: paragraph(
      'El Campus Central de la UNC se encuentra en Ruta V Gral. Bernardino Caballero Km 2, Concepción, Paraguay. La Facultad de Medicina también cuenta con instalaciones en el predio del Hospital Regional de Concepción.',
    ),
    category: 'horarios',
    order: 3,
    active: true,
    tags: [{ tag: 'ubicación' }, { tag: 'dirección' }, { tag: 'campus' }],
  },

  // ── Admisión ──────────────────────────────────────────────────────────────
  {
    question: '¿Dónde puedo ver las carreras que ofrece la UNC?',
    answer: paragraph(
      'Podés consultar la oferta académica completa en la sección Carreras del portal, o ingresar directamente al sitio de cada facultad. La UNC ofrece carreras en Medicina, Odontología, Ciencias Agrarias, Ciencias Económicas, Humanidades y Ciencias Exactas.',
    ),
    category: 'admision',
    order: 1,
    active: true,
    tags: [{ tag: 'carreras' }, { tag: 'oferta académica' }],
  },
  {
    question: '¿Cuándo inician las clases?',
    answer: paragraph(
      'El año lectivo generalmente inicia en marzo. Las fechas exactas se publican en el Calendario Académico de cada facultad. Te recomendamos verificar directamente con la unidad académica de tu interés.',
    ),
    category: 'admision',
    order: 2,
    active: true,
    tags: [{ tag: 'inicio de clases' }, { tag: 'calendario' }],
  },
  {
    question: '¿Cómo hago para inscribirme en una carrera?',
    answer: paragraph(
      'Para inscribirte en una carrera de grado: (1) elegí la carrera y la facultad, (2) reuní los documentos requeridos, (3) presentate en la secretaría de la facultad en el período de inscripción, (4) completá el proceso de preinscripción. Algunas carreras requieren rendir el Curso de Preparación e Ingreso (CPI).',
    ),
    category: 'admision',
    order: 3,
    active: true,
    tags: [{ tag: 'inscripción' }, { tag: 'cómo inscribirse' }],
  },
  {
    question: '¿Qué documentos necesito para inscribirme?',
    answer: paragraph(
      'Los documentos básicos para inscripción de grado son: cédula de identidad vigente, título de bachillerato (original y fotocopia), certificado de notas del bachillerato, dos fotos carnet 3×4 y formulario de inscripción completado. Algunos programas pueden requerir documentación adicional.',
    ),
    category: 'admision',
    order: 4,
    active: true,
    tags: [{ tag: 'documentos' }, { tag: 'requisitos' }],
  },
  {
    question: '¿Qué es el CPI?',
    answer: paragraph(
      'El CPI (Curso de Preparación e Ingreso) es un curso nivelatorio que deben rendir los aspirantes a determinadas carreras, especialmente Medicina. El curso evalúa conocimientos básicos de Biología, Química, Física y Matemáticas. La aprobación del CPI es requisito para continuar con la inscripción regular.',
    ),
    category: 'admision',
    order: 5,
    active: true,
    tags: [{ tag: 'CPI' }, { tag: 'ingreso' }, { tag: 'medicina' }],
  },
  {
    question: '¿Cuándo son los exámenes parciales, finales y defensas de tesis?',
    answer: paragraph(
      'Los calendarios de exámenes parciales, finales y defensas se publican en el Calendario Académico de cada facultad al inicio del semestre. Los períodos pueden variar entre unidades académicas.',
    ),
    category: 'admision',
    order: 6,
    active: true,
    tags: [{ tag: 'examen' }, { tag: 'parcial' }, { tag: 'final' }, { tag: 'tesis' }],
  },

  // ── Trámites ──────────────────────────────────────────────────────────────
  {
    question: '¿Qué trámites se realizan en el Rectorado?',
    answer: paragraph(
      'En el Rectorado se gestionan: legalización y apostilla de documentos universitarios, emisión de títulos, certificados de estudios, constancias de egreso, registros académicos generales, trámites de convenios y acuerdos institucionales.',
    ),
    category: 'tramites',
    order: 1,
    active: true,
    tags: [{ tag: 'rectorado' }, { tag: 'legalización' }, { tag: 'apostilla' }],
  },
  {
    question: '¿Las inscripciones a carreras se hacen en el Rectorado?',
    answer: paragraph(
      'No. Las inscripciones a carreras de grado, programas de postgrado y cursos de extensión se realizan directamente en cada facultad. El Rectorado no gestiona inscripciones académicas.',
    ),
    category: 'tramites',
    order: 2,
    active: true,
    tags: [{ tag: 'inscripción' }, { tag: 'rectorado' }, { tag: 'facultad' }],
  },
  {
    question: '¿Tienen costo los trámites?',
    answer: paragraph(
      'Algunos trámites son gratuitos (constancias de estudio, certificados internos) y otros tienen un arancel establecido por resolución del Rectorado (legalizaciones, apostillas, reposición de títulos). Los aranceles vigentes están disponibles en la sección de Aranceles del portal.',
    ),
    category: 'tramites',
    order: 3,
    active: true,
    tags: [{ tag: 'aranceles' }, { tag: 'costo' }, { tag: 'gratuito' }],
  },
  {
    question: '¿Dónde veo qué documentos necesito para un trámite específico?',
    answer: paragraph(
      'En la sección Trámites del portal encontrarás la guía detallada de cada gestión: requisitos, pasos, costos y tiempo estimado. También podés consultar al correo secgral@unc.edu.py.',
    ),
    category: 'tramites',
    order: 4,
    active: true,
    tags: [{ tag: 'requisitos' }, { tag: 'guía' }],
  },
  {
    question: '¿Los trámites se pueden realizar a distancia?',
    answer: paragraph(
      'Algunos trámites administrativos pueden iniciarse en forma digital, pero la mayoría requieren presencia personal para la entrega de documentación original. Estamos avanzando hacia la digitalización de servicios.',
    ),
    category: 'tramites',
    order: 5,
    active: true,
    tags: [{ tag: 'digital' }, { tag: 'online' }, { tag: 'remoto' }],
  },

  // ── Servicios ─────────────────────────────────────────────────────────────
  {
    question: '¿Qué servicios ofrece la UNC a su comunidad?',
    answer: paragraph(
      'La UNC ofrece: biblioteca digital, laboratorios, consultorio jurídico gratuito, brigadas de salud, actividades culturales y deportivas, bienestar estudiantil, bolsa de trabajo y convenios con instituciones nacionales e internacionales.',
    ),
    category: 'servicios',
    order: 1,
    active: true,
    tags: [{ tag: 'servicios' }, { tag: 'biblioteca' }, { tag: 'bienestar' }],
  },
  {
    question: '¿Los servicios tienen algún costo?',
    answer: paragraph(
      'La mayoría de los servicios académicos y de bienestar son gratuitos para estudiantes activos. Algunos servicios especiales (impresiones, laboratorio externo, cursos de extensión) tienen aranceles diferenciados. El consultorio jurídico es gratuito para personas de bajos ingresos.',
    ),
    category: 'servicios',
    order: 2,
    active: true,
    tags: [{ tag: 'costo' }, { tag: 'gratuito' }, { tag: 'arancel' }],
  },

  // ── Transparencia ─────────────────────────────────────────────────────────
  {
    question: '¿Dónde encuentro información sobre presupuesto, nómina, viajes y becas?',
    answer: paragraph(
      'Toda la información de acceso público está disponible en la sección Transparencia e Información Pública del portal, en cumplimiento de la Ley 5282/2014. Podés consultar presupuestos, nóminas, declaraciones juradas, contratos, viáticos y más.',
    ),
    category: 'transparencia',
    order: 1,
    active: true,
    tags: [{ tag: 'transparencia' }, { tag: 'ley 5282' }, { tag: 'presupuesto' }],
  },

  // ── RRHH ──────────────────────────────────────────────────────────────────
  {
    question: '¿Cómo hago para trabajar en la UNC?',
    answer: paragraph(
      'Los cargos docentes y administrativos se cubren mediante concursos públicos de méritos y aptitudes, convocados por resolución del Rectorado o de cada facultad. Las convocatorias se publican en el portal, en el Diario Oficial y en medios locales.',
    ),
    category: 'rrhh',
    order: 1,
    active: true,
    tags: [{ tag: 'empleo' }, { tag: 'concurso' }, { tag: 'trabajo' }],
  },
  {
    question: '¿Dónde veo los resultados de los concursos?',
    answer: paragraph(
      'Los resultados de concursos docentes y administrativos se publican en el portal institucional, en el tablón de anuncios de cada facultad y en el Diario Oficial cuando corresponde.',
    ),
    category: 'rrhh',
    order: 2,
    active: true,
    tags: [{ tag: 'resultados' }, { tag: 'concurso' }],
  },

  // ── Títulos ───────────────────────────────────────────────────────────────
  {
    question: '¿Cómo gestiono mi título universitario?',
    answer: paragraph(
      'Para solicitar tu título debés: (1) completar todas las materias y defensas requeridas, (2) presentarte en la secretaría de tu facultad con los documentos de egreso, (3) la facultad eleva la solicitud al Rectorado, (4) el Rectorado procesa el título y lo remite al MEC para el registro nacional. El proceso tarda aproximadamente 60 días hábiles.',
    ),
    category: 'titulos',
    order: 1,
    active: true,
    tags: [{ tag: 'título' }, { tag: 'egreso' }, { tag: 'certificado' }],
  },
]

/* ─── Main ────────────────────────────────────────────────────────────────── */

async function seed() {
  console.log('🌱  Seeding FAQs →', CMS_URL)

  const token = await login()
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `JWT ${token}`,
  }

  // Check existing
  const existing = await fetch(`${CMS_URL}/api/faqs?limit=1`, { headers })
  const existingData = await existing.json()
  if (existingData.totalDocs > 0) {
    console.log(`⚠️  ${existingData.totalDocs} FAQs already exist. Skipping seed.`)
    console.log('   Delete them from the CMS admin to re-seed.')
    return
  }

  let created = 0
  let failed = 0

  for (const faq of FAQS) {
    const res = await fetch(`${CMS_URL}/api/faqs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(faq),
    })
    const data = await res.json()
    if (res.ok) {
      created++
      console.log(`  ✅ [${faq.category}] ${faq.question.slice(0, 60)}…`)
    } else {
      failed++
      console.error(`  ❌ Failed: ${faq.question.slice(0, 60)}`)
      console.error('     ', JSON.stringify(data.errors ?? data))
    }
  }

  console.log(`\n🏁  Done — ${created} created, ${failed} failed`)
}

seed().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
