// scripts/seed-convenios.mjs
// Usage: node scripts/seed-convenios.mjs
// Env: CMS_URL (default: http://localhost:3002), CMS_EMAIL, CMS_PASSWORD

const CMS_URL = process.env.CMS_URL ?? 'http://localhost:3002'
const EMAIL    = process.env.CMS_EMAIL
const PASSWORD = process.env.CMS_PASSWORD

const RECORDS = [
  // Nacional
  { year: 2012, type: 'nacional', title: 'Convenio Interinstitucional', parties: 'Universidad Nacional de Concepción y la Universidad Nacional de Asunción', signedMonth: '23 de Noviembre', duration: '5 Años', objective: 'Establecer una relación de cooperación interinstitucional entre ambas universidades nacionales del Paraguay', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2012, type: 'nacional', title: 'Convenio de Cooperación Interinstitucional', parties: 'Universidad Nacional de Concepción y Organización Multidisciplinaria de Apoyo a Profesores y Alumnos (OMAPA)', signedMonth: '28 de Marzo', duration: '3 Años', objective: 'Promover actividades tendientes a fomentar el avance de los jóvenes paraguayos en su formación intelectual y desarrollo integral como personas', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2012, type: 'nacional', title: 'Acuerdo Institucional', parties: 'Asociación de Universidades Públicas del Paraguay y el Ministerio de Educación y Cultura', signedMonth: '16 de Marzo', duration: '1 Año', objective: 'Propiciar la implementación del Programa de Concesión de Becas de Estudios Universitarios', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2012, type: 'nacional', title: 'Convenio de Cooperación Interinstitucional', parties: 'Universidad Nacional de Concepción y la Gobernación de Boquerón', signedMonth: '03 de Febrero', duration: '2 Años', objective: 'Desarrollar acciones conjuntas en investigación y regular la cooperación interinstitucional para el acceso a plazas en programas de Práctica Supervisada de Pregrado', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2011, type: 'nacional', title: 'Convenio Específico', parties: 'Universidad Nacional de Concepción y la Fundación Parque Tecnológico Itaipú – Paraguay', signedMonth: '29 de Diciembre', duration: '3 Meses', objective: "Ejecutar el proyecto 'Las Tic's en el Proceso Educativo como herramienta de Inclusión Social', Proyecto Adjudicado del Programa Retorno Social de Becarios de Itaipú", driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2011, type: 'nacional', title: 'Convenio Marco de Colaboración', parties: 'Universidad Nacional de Concepción y la Fundación Universitaria Iberoamericana (FUNIBER)', signedMonth: '04 de Agosto', duration: '5 Años', objective: 'Colaborar en la ejecución de programas académicos con modalidad presencial, semi-presencial o a distancia, y actividades de extensión universitaria', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2011, type: 'nacional', title: 'Acuerdo de Cooperación', parties: 'Universidad Nacional de Concepción y la Itaipú Binacional', signedMonth: '07 de Julio', duration: '1 Año', objective: "Establecer bases y condiciones para el desarrollo del Programa 'Becas de Estudios Universitarios – Carrera Completa'", driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2010, type: 'nacional', title: 'Convenio de Cooperación Interinstitucional', parties: 'Universidad Nacional de Concepción y el Ministerio de Salud Pública y Bienestar Social', signedMonth: '05 de Febrero', duration: '2 Años', objective: 'Regular la relación interinstitucional en materia de actividades académicas de los estudiantes en los programas de Prácticas Supervisadas de Pregrado', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2010, type: 'nacional', title: 'Convenio Marco de Cooperación', parties: 'Universidad Nacional de Concepción y la Asociación de Funcionarios de la Universidad Nacional de Concepción (AFUNC)', signedMonth: '12 de Enero', duration: '2 Años', objective: 'Ceder parte de la UNC en usufructo a la AFUNC para la constitución de su local y autorizar a la AFUNC la invocación de la UNC para gestionar fondos', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2009, type: 'nacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción y la Secretaría Ejecutiva de la Comisión Nacional de Conmemoración del Bicentenario', signedMonth: '24 de Setiembre', duration: '5 Años', objective: 'Colaborar mutuamente en actividades del ámbito de la cultura, educación, difusión y apoyo técnico para la celebración del Bicentenario de la Independencia Patria', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2009, type: 'nacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción y la Universidade Federal da Grande Dourados', signedMonth: '11 de Setiembre', duration: '5 Años', objective: 'Impulsar una colaboración basada en la igualdad, asistencia mutua, cooperación en programas de enseñanza e investigación para mejorar la capacitación de docentes, técnicos y estudiantes', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2009, type: 'nacional', title: 'Convenio Marco de Cooperación', parties: 'Universidad Nacional de Concepción y la Secretaría de la Información y Comunicación para el Desarrollo de la República', signedMonth: '18 de Junio', duration: '5 Años', objective: 'Ayudar al fortalecimiento de ambas Instituciones en educación técnica y superior, investigación, extensión universitaria y actualización de profesionales', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2007, type: 'nacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción y COOMECIPAR', signedMonth: '30 de Octubre', duration: '1 Año', objective: 'Ejecutar proyectos conjuntos, prestación de servicios, realización de Conferencias, Cursos y eventos Culturales e iniciativas de emprendimiento', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2007, type: 'nacional', title: 'Convenio de Cooperación Interinstitucional', parties: 'Universidad Nacional de Itapúa (Facultad de Medicina) y la Universidad Nacional de Concepción', signedMonth: '11 de Junio', objective: 'Apoyar el funcionamiento inicial de la UNC, posibilitando el usufructo de las instalaciones físicas de la Facultad de Medicina de Concepción', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2005, type: 'nacional', title: 'Convenio con el Ministerio de Salud Pública y Bienestar Social', parties: 'Universidad Nacional de Itapúa (Facultad de Medicina) y el Ministerio de Salud Pública y Bienestar Social', signedMonth: 'Enero', duration: 'Indefinido', objective: 'Cooperar mutuamente en actividades científicas, tecnológicas, formación de recursos humanos y prestación de servicios', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  // Internacional
  { year: 2017, type: 'internacional', title: 'Acuerdo de Cooperación Interuniversitaria', parties: 'Universidad Nacional de Concepción — contraparte pendiente de confirmación oficial', objective: 'Acuerdo pendiente de carga completa en el sistema de gestión institucional', active: true },
  { year: 2016, type: 'internacional', title: 'Convenio Marco de Cooperación Académica', parties: 'Universidad Nacional de Concepción y la Universidad Autónoma de San Luis Potosí (México)', signedMonth: '12 de Abril', duration: '5 Años', objective: 'Establecer lazos permanentes de Cooperación Interinstitucional e Intercambio recíproco en actividades de movilidad estudiantil, docencia, investigación y extensión', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2015, type: 'internacional', title: 'Convenio Marco de Cooperación', parties: 'Facultad de Medicina UNC y la Universidad Favaloro (Argentina)', signedMonth: '27 de Julio', duration: '2 Años', objective: 'Cooperar recíprocamente en la programación de acciones tendientes a lograr aportes concretos en las áreas de docencia, investigación, capacitación y actividades de interés común', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2015, type: 'internacional', title: 'Convenio Específico de Colaboración', parties: 'Facultad de Medicina UNC y Facultad de Medicina de la Universidad de Buenos Aires (Argentina)', signedMonth: '11 de Marzo', duration: '3 Años', objective: 'Establecer relaciones de colaboración mutua en actividades de carácter científico-tecnológico, docente, de divulgación y educación para la salud', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2014, type: 'internacional', title: 'Convenio de Intercambio y Cooperación Académica', parties: 'Universidad Nacional de Concepción y la Universidad de Burgos, España', signedMonth: '04 de Diciembre', duration: '3 Años', objective: 'Promover el entendimiento internacional para el intercambio de información académica y de educación, mediante intercambio de estudiantes, docentes y actividades conjuntas de investigación', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2014, type: 'internacional', title: 'Convenio de Cooperación — Renovación', parties: 'Universidad Nacional de Concepción y la Universidade Federal da Grande Dourados (Brasil)', signedMonth: '29 de Abril', duration: '5 Años', objective: 'Impulsar una colaboración basada en igualdad y asistencia mutua, participando en la cooperación de programas de enseñanza e investigación (renovación del convenio de 2009)', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2014, type: 'internacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción y la Universidad Federal de Santa María (Brasil)', signedMonth: '26 de Junio', duration: '5 Años', objective: 'Estimular e implementar programas de cooperación técnico-científica y cultural, incluyendo transferencia de conocimientos e intercambio de docentes, alumnos y técnico-administrativos', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2014, type: 'internacional', title: 'Convenio de Cooperación Interinstitucional', parties: 'Universidad Nacional de Concepción y el Instituto Latinoamericano de Estudios Superiores (ILES – PAMAM S.A.)', signedMonth: '27 de Mayo', duration: '3 Años', objective: 'Establecer y desarrollar mecanismos de mutua colaboración para promover el desarrollo y difusión de la cultura, la investigación científica y tecnológica', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2014, type: 'internacional', title: 'Convenio de Cooperación y Movilidad Internacional', parties: 'Universidad Nacional de Concepción y la Universidad de Deusto, España (Programa Erasmus Mundus Action 2 Lot 14 SUD-UE)', signedMonth: '30 de Abril', duration: '3 Años', objective: 'Mejorar la calidad de la educación superior y promover cooperación entre Europa y América del Sur con becas de movilidad para estudiantes y trabajadores', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2013, type: 'internacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción (Facultad de Odontología) y Gobernaciones Rotarias de los Distritos 4970 y 4980 (Uruguay)', signedMonth: '05 de Marzo', duration: '1 Año', objective: 'Realizar intercambios de capacitaciones en filosofía y técnica PRAT, implementación de estrategias y seguimiento de proyectos APS en salud bucal', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2011, type: 'internacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción y la Universidad Nacional Mayor de San Marcos (Lima, Perú)', signedMonth: '31 de Marzo', duration: '5 Años', objective: 'Establecer una cooperación académico-científico-cultural desarrollando programas conjuntos de investigación e intercambio de docentes, alumnos y resultados científicos', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2011, type: 'internacional', title: 'Convenio de Cooperación', parties: 'Universidad Nacional de Concepción y la Universidad Inca Garcilaso de la Vega (Lima, Perú)', signedMonth: '30 de Marzo', duration: '5 Años', objective: 'Establecer una cooperación académico-científico-cultural desarrollando programas conjuntos de investigación, intercambio de recursos humanos y publicación de trabajos científicos', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2011, type: 'internacional', title: 'Convenio Marco de Cooperación Académica, Cultural, Científica y Tecnológica', parties: 'Universidad Nacional de Concepción y la Universidad Ricardo Palma (Lima, Perú)', signedMonth: '30 de Marzo', duration: '5 Años', objective: 'Realizar proyectos vinculados con la educación, la cultura, la investigación científica y tecnología, el servicio a la sociedad aunando esfuerzos y recursos disponibles', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
  { year: 2010, type: 'internacional', title: 'Acuerdo de Cooperación', parties: 'Universidad Nacional de Concepción (Facultad de Ciencias Agrarias) y la Empresa Brasileña de Pesquisa Agropecuaria (EMBRAPA)', signedMonth: '05 de Mayo', duration: '5 Años', objective: 'Establecer una cooperación académico-científico-cultural en proyectos conjuntos de agricultura y recursos naturales para el desarrollo sustentable agropecuario', driveUrl: 'https://drive.google.com/file/d/REEMPLAZAR_CON_ID_REAL/view', active: true },
]

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('❌  Set CMS_EMAIL and CMS_PASSWORD environment variables')
    process.exit(1)
  }

  // Login
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!loginRes.ok) {
    console.error(`❌  Login failed: ${loginRes.status}`)
    process.exit(1)
  }
  const { token } = await loginRes.json()
  const headers = { 'Content-Type': 'application/json', Authorization: `JWT ${token}` }

  // Fetch existing titles for idempotency
  const existingRes = await fetch(`${CMS_URL}/api/convenios?limit=200`, { headers })
  const existingData = await existingRes.json()
  const existingTitles = new Set((existingData.docs ?? []).map(d => d.title))

  let created = 0, skipped = 0, errors = 0

  for (const record of RECORDS) {
    if (existingTitles.has(record.title)) {
      console.log(`⚠  Skip (exists): ${record.title}`)
      skipped++
      continue
    }
    const res = await fetch(`${CMS_URL}/api/convenios`, {
      method: 'POST',
      headers,
      body: JSON.stringify(record),
    })
    if (res.ok) {
      console.log(`✓  Created [${record.type}] ${record.year} — ${record.title}`)
      created++
    } else {
      const err = await res.text()
      console.error(`✗  Error: ${record.title} — ${err}`)
      errors++
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${errors} errors`)
  process.exit(errors > 0 ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
