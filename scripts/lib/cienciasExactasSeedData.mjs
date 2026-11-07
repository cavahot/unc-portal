// FAC-06: datos de Ciencias Exactas extraídos de la fuente institucional de la UNC.
// Qué hace: separa procedencia, carreras, aranceles y omisiones antes de escribir en Payload.
// Amenaza: evita mantener una segunda fuente local y evita convertir ausencias oficiales en valores inventados.
// Límite: la fuente debe revisarse editorialmente antes de publicar cambios sensibles; no sustituye la aprobación SEC-027.
export const SOURCES = {
  S1: 'https://www.unc.edu.py/facultad-de-ciencias-exactas-y-tecnologicas/',
}

export const FACULTAD_SLUG = 'facultad-de-ciencias-exactas-y-tecnologicas'
export const FACULTAD_NOMBRE = 'Facultad de Ciencias Exactas y Tecnológicas'

export const FACULTAD_FIELDS = {
  siglas: { value: 'FACET', sourceUrl: SOURCES.S1 },
  descripcion: { value: 'Facultad orientada a la formación científica y tecnológica para el desarrollo sostenible del Paraguay.', sourceUrl: SOURCES.S1 },
  direccion: { value: 'Campus Universitario: Ruta PY05, km 210, Concepción.', sourceUrl: SOURCES.S1 },
  telefono: { value: '(595 331) 243361', sourceUrl: SOURCES.S1 },
  email: { value: 'academicofacet@unc.edu.py', sourceUrl: SOURCES.S1 },
  logoPath: { value: '/images/facultades/exactas.png', sourceUrl: SOURCES.S1 },
}

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
  C('licenciatura-en-matematica-y-fisica', 'Licenciatura en Matemática y Física', 'grado', 1, 'Central/Concepción', [['555/16']]),
  C('licenciatura-en-matematicas-aplicadas', 'Licenciatura en Matemáticas Aplicadas', 'grado', 2, 'Central/Concepción', [['558/16']]),
  C('ingenieria-civil', 'Ingeniería Civil', 'grado', 3, 'Central/Concepción', [['559/16']]),
  C('maestria-en-didactica-de-las-ciencias', 'Maestría en Didáctica de las Ciencias', 'posgrado', 1, 'Central/Concepción', [['464/23']]),
  C('especializacion-en-ingenieria-vial', 'Especialización en Ingeniería Vial', 'posgrado', 2, 'Central/Concepción', [['409/23']]),
]

const A = (grupo, rows) => rows.map(([concepto, monto], index) => ({
  grupo,
  concepto,
  monto,
  orden: index + 1,
  sourceUrl: SOURCES.S1,
}))

export const ARANCELES = [
  ...A('multas', [
    ['Multas', 10000],
    ['Multa por retraso de devolución de libros (por día)', 5000],
  ]),
  ...A('venta', [
    ['Programas de estudios por materia (foliados y rubricados)', 50000],
    ['Constancias Varias', 50000],
    ['Carpeta para concurso', 150000],
    ['Credencial de estudiante/funcionario/docente', 100000],
    ['Certificados de estudios parcial y completo', 50000],
    ['Formulario de inscripción', 300000],
  ]),
  ...A('servicios', [
    ['Matrícula Grado', 400000],
    ['Cuota mensual Grado', 100000],
    ['Cuota Recursante', 50000],
    ['Matrícula Posgrado', 500000],
    ['Cuotas Maestría', 700000],
    ['Matrícula Especialización', 500000],
    ['Cuotas Especialización', 500000],
    ['Derecho Examen 1° Oportunidad', 50000],
    ['Derecho Examen 2° Oportunidad', 60000],
    ['Derecho Examen 3° Oportunidad', 70000],
    ['Defensa de Tesis / TFG', 500000],
    ['Solicitud cambio de carrera', 300000],
    ['Reincorporación', 500000],
  ]),
  ...A('medicos', [['Uso de Laboratorio y Equipos', 450000]]),
]

export const OMITIDOS = [
  {
    concepto: 'Aranceles Educativos',
    motivo: 'La fuente oficial no publica un monto verificable para este concepto; no se inventa ningún valor.',
    sourceUrl: SOURCES.S1,
  },
]

const seedData = { SOURCES, FACULTAD_SLUG, FACULTAD_NOMBRE, FACULTAD_FIELDS, CARRERAS, ARANCELES, OMITIDOS }
export default seedData
