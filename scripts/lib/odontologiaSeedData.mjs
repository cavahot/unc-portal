/**
 * FAC-01: datos VERIFICADOS de la Facultad de Odontología para la siembra (spec docs/specs/portal/FACULTADES.md §5).
 * Regla: cada hecho tiene `sourceUrl` (una de SOURCES). Lo que ninguna fuente publica (duración, título, perfil,
 * modalidad, misión, horario) NO está aquí: queda vacío en el CMS y la página oculta ese dato.
 * Consultado el 25-10-26 con User-Agent `unc-portal-migration/1.0 (inventario autorizado)`.
 */

export const SOURCES = {
  S1: 'https://www.unc.edu.py/facultad-de-odontologia/',
  S2: 'https://www.founc.edu.py/',
  S3: 'https://www.founc.edu.py/sobre-founc/',
  S4: 'https://www.founc.edu.py/certificados-y-acreditaciones/',
}

export const FACULTAD_SLUG = 'facultad-de-odontologia'

/** Campos de `facultades`; cada uno con su fuente. Solo se escriben si el campo del CMS está vacío. */
export const FACULTAD_FIELDS = {
  siglas: { value: 'FOUNC', sourceUrl: SOURCES.S2 },
  // Frase factual armada solo con hechos de S1 y S3 (no es un lema institucional).
  descripcion: {
    value: 'Unidad académica de la Universidad Nacional de Concepción con carreras de grado y especializaciones en el área odontológica, en el Campus Universitario de Concepción.',
    sourceUrl: SOURCES.S1,
  },
  historia: {
    value: [
      'Su origen es la Facultad de Ciencias de la Salud (carrera de Odontología), una de las tres unidades académicas con las que comenzó la Universidad Nacional de Concepción, creada por la Ley N.º 3201 del 4 de mayo de 2007.',
      'Por Resolución del Rectorado N.º 007/2007, del 1 de junio de 2007, se nombró a la Dra. Sara Ermelinda Acosta Giménez directora académica y comenzó el curso extensivo probatorio de ingreso, con 43 alumnos matriculados. En julio de 2010 se constituyó el Consejo Directivo definitivo, con la Dra. Acosta Giménez como decana.',
      'En agosto de 2011, tras el fallecimiento de la Dra. Acosta Giménez, el Rectorado nombró decano de la Facultad de Odontología al Dr. Arnaldo Miguel Ferreira Cabañas (Resolución N.º 177/2011).',
    ].join('\n\n'),
    sourceUrl: SOURCES.S3,
  },
  direccion: { value: 'Campus Universitario: Ruta Py05, Km 210.', sourceUrl: SOURCES.S1 },
  telefono: { value: '(595 331) 241680', sourceUrl: SOURCES.S1 },
  email: { value: 'decanatofo@unc.edu.py', sourceUrl: SOURCES.S1 },
  correosAdicionales: { value: [{ email: 'secretariagralfo@unc.edu.py' }], sourceUrl: SOURCES.S1 },
  // S1 enlaza http://www.founc.edu.py; el servidor redirige a https (comprobado con curl el 25-10-26).
  sitioWeb: { value: 'https://www.founc.edu.py/', sourceUrl: SOURCES.S1 },
  redes: {
    value: [
      { red: 'facebook', url: 'https://www.facebook.com/founc.py' },
      { red: 'instagram', url: 'https://www.instagram.com/fo_unc/' },
      { red: 'x', url: 'https://x.com/fo_unc' },
    ],
    sourceUrl: SOURCES.S2,
  },
}

const SEDE = 'Central/Concepción'

/**
 * Carreras: nombre, sede y resoluciones CONES (con su enlace a Drive) tal como S1. La fila «Odontología 497/21» de S1
 * es la misma carrera (S4: «CONES ACTUALIZACION ODONTOLOGIA»), por eso va como segunda resolución, no como otra carrera.
 * `slug` fijo para que la siembra sea idempotente.
 */
export const CARRERAS = [
  {
    slug: 'odontologia', nombre: 'Odontología', tipo: 'grado', orden: 1, sede: SEDE, sourceUrl: SOURCES.S1,
    resoluciones: [
      { numero: '165/15', enlace: 'https://drive.google.com/file/d/0B5YtqOEn25_NY3VXRGJsNHlyZ1E/view?usp=sharing&resourcekey=0-0nGfV-CCUCdutrL7L2wUvg' },
      { numero: '497/21', enlace: 'https://drive.google.com/file/d/1Q7CAbDGSVAppM-Jfobb20hDSgB8oHjGP/view?usp=sharing', detalle: 'Actualización' },
    ],
  },
  {
    slug: 'licenciatura-en-protesis-dental', nombre: 'Licenciatura en Prótesis Dental', tipo: 'grado', orden: 2, sede: SEDE, sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '709/16', enlace: 'https://drive.google.com/open?id=0B5YtqOEn25_NTzBFTlJzZjVWY2M' }],
  },
  ...[
    ['especializacion-en-rehabilitacion-oral', 'Especialización en Rehabilitación Oral', '18/16', 'https://drive.google.com/file/d/0B5YtqOEn25_NS0lmTTE1NHVJNnc/view?usp=sharing&resourcekey=0-21XyqYLls58ZBzW8uBb1uA'],
    ['especializacion-en-ortodoncia-correctiva-y-ortopedia-facial', 'Especialización en Ortodoncia Correctiva y Ortopedia Facial', '19/16', 'https://drive.google.com/open?id=0B5YtqOEn25_NSlNwNTdvTGg2dUk'],
    ['especializacion-en-implantologia-oral', 'Especialización en Implantología Oral', '20/16', 'https://drive.google.com/open?id=0B5YtqOEn25_NdFJ0SGs5QmtGTVk'],
    ['especializacion-en-endodoncia', 'Especialización en Endodoncia', '21/16', 'https://drive.google.com/open?id=0B5YtqOEn25_Nd1h6UzJ2emJ2T3c'],
    ['especializacion-en-ortopedia-funcional-de-los-maxilares', 'Especialización en Ortopedia Funcional de los Maxilares', '34/16', 'https://drive.google.com/file/d/0B5YtqOEn25_NbmpYVWt6NmJncUk/view?usp=sharing&resourcekey=0-JiqjmmD_uI0SJ8DH9kKM8g'],
    ['especializacion-en-estetica-y-cosmetica-dental', 'Especialización en Estética y Cosmética Dental', '35/16', 'https://drive.google.com/open?id=0B5YtqOEn25_NSUg3UkFVNFlhb00'],
  ].map(([slug, nombre, numero, enlace], i) => ({
    slug, nombre, tipo: 'posgrado', orden: i + 1, sede: SEDE, sourceUrl: SOURCES.S1, resoluciones: [{ numero, enlace }],
  })),
]

/** Aranceles de S1, con el concepto escrito como en la fuente. Montos en guaraníes enteros. */
const A = (grupo, rows) => rows.map(([concepto, monto], i) => ({ grupo, concepto, monto, orden: i + 1, sourceUrl: SOURCES.S1 }))
export const ARANCELES = [
  ...A('multas', [
    ['Multas', 10000],
    ['Multa por retraso de devolución de libros por día', 5000],
  ]),
  ...A('venta', [
    ['Venta de programas de estudios por materia foliados y rubricados', 50000],
    ['Constancias Varias', 50000],
    ['Carpeta p/concurso', 150000],
    ['Credencial de estudiante-funcionario-docente', 100000],
    ['Certificados de estudios parcial y completo', 50000],
    ['Formulario de inscripción a pasantía', 300000],
    ['Formulario de inscripción', 300000],
  ]),
  ...A('servicios', [
    ['Matrícula Curso Taller', 500000],
    ['Matrícula Curso Prótesis Dental', 300000],
    ['Matrícula Curso Odontología', 500000],
    ['Cuota Curso Taller', 300000],
    ['Cuotas Curso Prótesis Dental', 150000],
    ['Cuotas Curso Odontología', 250000],
    ['Cuotas Recursante Prótesis', 75000],
    ['Cuotas Recursante Odontología', 125000],
    ['Cuotas Posgrado', 1000000],
    ['Derecho Examen 1° Oportunidad', 50000],
    ['Derecho Examen 2° Oportunidad', 60000],
    ['Derecho Examen 3° Oportunidad', 70000],
    ['Derecho de Examen Recuperatorio', 50000],
    ['Matrícula Posgrado', 500000],
    ['Derecho a Defensa TCC', 300000],
    ['Solicitud cambio de carrera', 300000],
    ['Reincorporación a cursos de grado', 500000],
  ]),
  ...A('medicos', [
    ['Usufructo de Clínica', 450000],
    ['Usufructo de Laboratorio y/o preclínica', 450000],
  ]),
]
