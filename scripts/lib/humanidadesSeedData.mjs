/**
 * FAC-04: datos oficiales de Humanidades para Payload CMS.
 * Fuente S1: página pública de la UNC consultada el 3 de noviembre de 2026.
 * Amenaza que evita: copiar catálogos o aranceles sin procedencia y dejar una segunda fuente local.
 * Límite: se omiten importes vacíos o superiores al máximo permitido por el CMS; no se inventan valores.
 */

export const SOURCES = {
  S1: 'https://www.unc.edu.py/facultad-de-humanidades-y-ciencias-de-la-educacion/',
}

export const FACULTAD_SLUG = 'facultad-de-humanidades-y-ciencias-de-la-educacion'
export const FACULTAD_NOMBRE = 'Facultad de Humanidades y Ciencias de la Educación'

export const FACULTAD_FIELDS = {
  siglas: { value: 'FHyCE', sourceUrl: SOURCES.S1 },
  direccion: { value: 'Campus Universitario: Ruta Py05, Km 210.', sourceUrl: SOURCES.S1 },
  telefono: { value: '(595 331) 243176', sourceUrl: SOURCES.S1 },
  email: { value: 'secgral@fhyce.edu.py', sourceUrl: SOURCES.S1 },
  correosAdicionales: { value: [{ email: 'administracion@fhyce.edu.py' }], sourceUrl: SOURCES.S1 },
  sitioWeb: { value: 'https://www.fhyce.edu.py/', sourceUrl: SOURCES.S1 },
}

const SEDE_CENTRAL = 'Central/Concepción'
const S = (numero, detalle) => ({ numero, ...(detalle ? { detalle } : {}) })
const C = (slug, nombre, tipo, orden, sede, resoluciones) => ({
  slug,
  nombre,
  tipo,
  orden,
  sede,
  sourceUrl: SOURCES.S1,
  resoluciones: resoluciones.map(([numero, detalle]) => S(numero, detalle)),
})

export const CARRERAS = [
  C('licenciatura-en-ciencias-de-la-educacion', 'Licenciatura en Ciencias de la Educación', 'grado', 1, SEDE_CENTRAL, [['156/15']]),
  C('licenciatura-en-psicopedagogia', 'Licenciatura en Psicopedagogía', 'grado', 2, SEDE_CENTRAL, [['162/15']]),
  C('licenciatura-en-interculturalidad', 'Licenciatura en Interculturalidad', 'grado', 3, SEDE_CENTRAL, [['263/16']]),
  C('licenciatura-en-ciencias-de-la-educacion-enfoque-por-competencias', 'Licenciatura en Ciencias de la Educación enfoque por Competencias', 'grado', 4, SEDE_CENTRAL, [['521/16']]),
  C('licenciatura-en-trabajo-social-central', 'Licenciatura en Trabajo Social', 'grado', 5, SEDE_CENTRAL, [['560/16']]),
  C('licenciatura-en-ciencias-de-la-comunicacion-social', 'Licenciatura en Ciencias de la Comunicación Social', 'grado', 6, 'Concepción', [['710/17']]),
  C('licenciatura-en-educacion-escolar-basica-concepcion', 'Licenciatura en Educación Escolar Básica', 'grado', 7, 'Concepción', [['97/21'], ['89/24', 'Rectificación CONES N° 89/24']]),
  C('psicologia', 'Psicología', 'grado', 8, 'Concepción', [['137/21']]),
  C('licenciatura-en-educacion-escolar-basica-fuerte-olimpo', 'Licenciatura en Educación Escolar Básica', 'grado', 9, 'Fuerte Olimpo', [['371/21']]),
  C('licenciatura-en-trabajo-social-yby-yau', 'Licenciatura en Trabajo Social', 'grado', 10, 'Yby Yau', [['373/21']]),
  C('licenciatura-en-educacion-escolar-basica-yby-yau', 'Licenciatura en Educación Escolar Básica', 'grado', 11, 'Yby Yau', [['374/21']]),
  C('licenciatura-en-ciencias-de-la-educacion-enfasis-ciencias-sociales', 'Licenciatura en Ciencias de la Educación con Énfasis en Ciencias Sociales', 'grado', 12, 'Central – Concepción', [['428/21']]),
  C('licenciatura-en-ciencias-de-la-educacion-enfasis-lengua-literatura', 'Licenciatura en Ciencias de la Educación con Énfasis en Lengua y Literatura Castellano Guaraní', 'grado', 13, 'Central – Concepción', [['429/21']]),
  C('licenciatura-en-educacion-lengua-literatura-castellana', 'Licenciatura en Educación de la Lengua y Literatura Castellana', 'grado', 14, 'Central – Concepción', [['36/2024']]),

  C('especializacion-en-investigacion-cientifica', 'Especialización en Investigación Científica', 'posgrado', 1, SEDE_CENTRAL, [['284/16']]),
  C('especializacion-en-evaluacion-educativa-286', 'Especialización en Evaluación Educativa', 'posgrado', 2, SEDE_CENTRAL, [['286/16']]),
  C('maestria-en-investigacion-cientifica', 'Maestría en Investigación Científica', 'posgrado', 3, SEDE_CENTRAL, [['645/16']]),
  C('maestria-en-derecho-penal', 'Maestría en Derecho Penal', 'posgrado', 4, SEDE_CENTRAL, [['707/16']]),
  C('maestria-en-educacion-enfasis-evaluacion', 'Maestría en Educación con énfasis en Evaluación', 'posgrado', 5, SEDE_CENTRAL, [['708/16']]),
  C('especializacion-en-derecho-penal', 'Especialización en Derecho Penal', 'posgrado', 6, SEDE_CENTRAL, [['710/16']]),
  C('especializacion-en-evaluacion-educativa-711', 'Especialización en Evaluación Educativa', 'posgrado', 7, SEDE_CENTRAL, [['711/16']]),
  C('maestria-en-educacion-docencia-universitaria', 'Maestría en Educación con Orientación en Docencia Universitaria', 'posgrado', 8, SEDE_CENTRAL, [['803/16']]),
  C('especializacion-en-educacion-escolar-basica', 'Especialización en Educación Escolar Básica', 'posgrado', 9, 'Concepción', [['96/21'], ['90/24', 'Rectificación CONES N° 90/24']]),
  C('especializacion-en-medicacion-de-conflictos', 'Especialización en Medicación de Conflictos', 'posgrado', 10, 'Central – Concepción', [['443/22']]),
  C('capacitacion-en-investigacion-cientifica', 'Capacitación en Investigación Científica', 'posgrado', 11, 'Central – Concepción', [['444/22']]),
  C('maestria-en-educacion-indigena-intercultural', 'Maestría en Educación Indígena e Intercultural', 'posgrado', 12, 'Central – Concepción', [['96/23']]),
]

const A = (grupo, rows) => rows.map(([concepto, monto], i) => ({ grupo, concepto, monto, orden: i + 1, sourceUrl: SOURCES.S1 }))

export const ARANCELES = [
  ...A('multas', [
    ['Multa por retraso de matrícula', 10000],
    ['Multa por retraso de cuotas', 10000],
  ]),
  ...A('venta', [
    ['Venta de Programas de Estudio foliados y rubricados por materia', 50000],
    ['Venta de Programas de Estudios C.P.I.', 20000],
    ['Constancias Varias', 50000],
    ['Carpeta para concurso', 150000],
    ['Credencial de estudiante-funcionario-docente', 100000],
    ['Certificados de Estudios parcial y completo', 49000],
  ]),
  ...A('servicios', [
    ['Matrícula-curso', 200000],
    ['Matrícula-Postgrado', 350000],
    ['Cuota-curso', 100000],
    ['Cuota-recursante', 20000],
    ['Cuota-Postgrado', 300000],
    ['Derecho a Examen 1º Oportunidad', 20000],
    ['Derecho a Examen 2º Oportunidad', 25000],
    ['Derecho a Examen 3º Oportunidad', 30000],
    ['Derecho a Presentación de Tesis de Postgrado', 1000000],
    ['Cuota especial (ballet y otros)', 50000],
    ['Solicitud de cambio de carrera', 100000],
    ['Matrícula curso de capacitación', 200000],
    ['Derecho a presentación de tesis de grado', 250000],
    ['Derecho a Examen de Ingreso', 200000],
    ['Derecho a Examen Extraordinario Postgrado', 50000],
    ['Derecho de Tutoría Post-Grado', 400000],
    ['Matrícula Post-Grado Ita Guasú', 100000],
    ['Derecho a Exámenes del Programa MEII', 350000],
  ]),
]

export const OMITIDOS = [
  {
    concepto: 'Aranceles Educativos',
    motivo: 'La fuente oficial no publica un monto; el CMS exige un número y no se inventa el valor.',
    sourceUrl: SOURCES.S1,
  },
  {
    concepto: 'Servicios educativos',
    monto: 312866467,
    motivo: 'Supera el tope de Gs. 100.000.000 definido por el CMS; requiere validación institucional antes de cargarlo.',
    sourceUrl: SOURCES.S1,
  },
]
