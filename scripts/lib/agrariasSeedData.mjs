/**
 * FAC-02: datos VERIFICADOS de la Facultad de Ciencias Agrarias (FCA) para la siembra (spec docs/specs/portal/FACULTAD-AGRARIAS-DATOS.md).
 * Regla del dueño: cada hecho tiene `sourceUrl` (una de SOURCES). Lo que ninguna fuente oficial publica
 * (modalidad, misión, horario, acreditación con vigencia, significado de los asteriscos de aranceles) NO está aquí
 * y figura como brecha en la spec. La página y los mensajes anteriores NO son fuente (copiaban aranceles de Odontología).
 * Consultado el 28-10-26: S1 y S4 contrastadas con el volcado WordPress local (páginas `facultad-de-ciencias-agrarias`
 * y `tramites`); S1, S2 y S3 por lectura en vivo. Las respuestas de lectura en vivo se resumieron con un modelo auxiliar:
 * por eso la historia solo trae hechos que además confirma otra fuente oficial de la UNC.
 */

export const SOURCES = {
  S1: 'https://www.unc.edu.py/facultad-de-ciencias-agrarias/',
  S2: 'https://www.fca-unc.edu.py/',
  S3: 'https://www.fca-unc.edu.py/pages/historia/',
  // Solo leída del volcado WP local (no re-consultada en vivo): duración y título de cada programa.
  S4: 'https://www.unc.edu.py/tramites/',
}

export const FACULTAD_SLUG = 'facultad-de-ciencias-agrarias'

/** Campos de `facultades`; cada uno con su fuente. Solo se escriben si el campo del CMS está vacío. */
export const FACULTAD_FIELDS = {
  siglas: { value: 'FCA', sourceUrl: SOURCES.S2 },
  // Frase factual armada solo con hechos de S1 (carreras, sedes) y S3 (Ingeniería Agronómica); no es un lema.
  descripcion: {
    value: 'Unidad académica de la Universidad Nacional de Concepción con carreras de grado en ciencias agrarias y administración agropecuaria, y programas de posgrado.',
    sourceUrl: SOURCES.S1,
  },
  // Resumen propio de S3; el dato de la Ley 3201 coincide con la historia de Odontología (founc.edu.py/sobre-founc/).
  historia: {
    value: [
      'La Facultad de Ciencias Agrarias es una de las tres unidades académicas con las que comenzó la Universidad Nacional de Concepción, creada por la Ley N.º 3201 del 4 de mayo de 2007. Las otras dos fueron la Facultad de Ciencias de la Salud y la Facultad de Ciencias Económicas y Administrativas.',
      'Su primera carrera fue Ingeniería Agronómica.',
    ].join('\n\n'),
    sourceUrl: SOURCES.S3,
  },
  direccion: { value: 'Campus Universitario: Ruta Py05, Km 210.', sourceUrl: SOURCES.S1 },
  telefono: { value: '(595 331) 241813', sourceUrl: SOURCES.S1 },
  email: { value: 'fca-unc@fca-unc.edu.py', sourceUrl: SOURCES.S1 },
  correosAdicionales: { value: [{ email: 'secgralfcaunc@gmail.com' }], sourceUrl: SOURCES.S1 },
  // S1 enlaza http://www.fca-unc.edu.py; la lectura https respondió el 28-10-26.
  sitioWeb: { value: 'https://www.fca-unc.edu.py/', sourceUrl: SOURCES.S1 },
  redes: {
    value: [{ red: 'facebook', url: 'https://www.facebook.com/cienciasagrarias.unc.5' }],
    sourceUrl: SOURCES.S2,
  },
}

const CENTRAL = 'Central/Concepción'
const LIC_AGROP = 'Licenciado/a en Administración Agropecuaria'

/** Enlaces a las resoluciones: tal como los publica S1 (Google Drive). */
const DRIVE = {
  r556: 'https://drive.google.com/open?id=0B5YtqOEn25_Na2NHLW13MnJpMzQ',
  r557: 'https://drive.google.com/file/d/0B5YtqOEn25_NWjNJcW8xWEMxdzA/view?usp=sharing&resourcekey=0-JbG0ex_j3d5rcmTXaFd9aQ',
  r563: 'https://drive.google.com/open?id=0B5YtqOEn25_NVHN4WXo3bExiNlU',
  r372: 'https://drive.google.com/file/d/1Tm2PiPdwJ42zgnIaoSaYFqo-3zyr999q/view?usp=sharing',
  r375: 'https://drive.google.com/file/d/1FvJhnMrxuioLJVeXwq82nBH87NKRyiEU/view?usp=sharing',
  r562: 'https://drive.google.com/open?id=0B5YtqOEn25_NeFZmMTFOTnFjRXM',
  r992: 'https://drive.google.com/open?id=1vEZP0qdpq1CDXWHD1MoWun4bzgWCO8WX',
  r553: 'https://drive.google.com/file/d/159BBUnsDFlM2YJWu7aaBIBglct7FpxFj/view?usp=share_link',
}

/**
 * Carreras: nombre, sede y Res. CONES (con enlace) de S1; `duracion` (años) y `titulo` de S4 (página `tramites` del
 * volcado WP, no leída en vivo). La procedencia de S4 NO se guarda por fila: el CMS descarta las claves que su colección
 * no define (una clave extra hace que la siembra nunca converja); está documentada en la spec FAC-02 y el registro RDD.
 * Las filas de Fuerte Olimpo y Yby Yau dicen «Administración Agropecuarios» en S1 (error de tipeo evidente: S1 y S4
 * usan «Agropecuaria» en las demás); la duración y el título de S4 se aplican al programa sin distinguir sede (por confirmar).
 * La Especialización dura 9 meses (S4): el campo `duracion` del CMS exige 1-12 años, por eso va vacío.
 * `slug` fijo para que la siembra sea idempotente.
 */
export const CARRERAS = [
  {
    slug: 'ingenieria-agronomica', nombre: 'Ingeniería Agronómica', tipo: 'grado', orden: 1, sede: CENTRAL,
    duracion: 5, titulo: 'Ingeniero Agrónomo', sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '556/16', enlace: DRIVE.r556 }],
  },
  {
    slug: 'licenciatura-en-administracion-agropecuaria-horqueta', nombre: 'Licenciatura en Administración Agropecuaria', tipo: 'grado', orden: 2, sede: 'Horqueta',
    duracion: 4, titulo: LIC_AGROP, sourceUrl: SOURCES.S1,
    // Un solo enlace de S1 cubre las dos resoluciones (557/16 y su rectificación CONES N.º 248/21).
    resoluciones: [
      { numero: '557/16', enlace: DRIVE.r557 },
      { numero: '248/21', enlace: DRIVE.r557, detalle: 'Rectificación' },
    ],
  },
  {
    slug: 'licenciatura-en-administracion-de-agronegocios', nombre: 'Licenciatura en Administración de Agronegocios', tipo: 'grado', orden: 3, sede: CENTRAL,
    duracion: 4, titulo: 'Licenciado/a en Administración de Agronegocios', sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '563/16', enlace: DRIVE.r563 }],
  },
  {
    slug: 'licenciatura-en-administracion-agropecuaria-fuerte-olimpo', nombre: 'Licenciatura en Administración Agropecuaria', tipo: 'grado', orden: 4, sede: 'Fuerte Olimpo',
    duracion: 4, titulo: LIC_AGROP, sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '372/21', enlace: DRIVE.r372 }],
  },
  {
    slug: 'licenciatura-en-administracion-agropecuaria-yby-yau', nombre: 'Licenciatura en Administración Agropecuaria', tipo: 'grado', orden: 5, sede: 'Yby Yau',
    duracion: 4, titulo: LIC_AGROP, sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '375/21', enlace: DRIVE.r375 }],
  },
  {
    slug: 'maestria-en-produccion-vegetal', nombre: 'Maestría en Producción Vegetal', tipo: 'posgrado', orden: 1, sede: CENTRAL,
    duracion: 2, titulo: 'Magister Scientiae en Producción Vegetal', sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '562/16', enlace: DRIVE.r562 }],
  },
  {
    slug: 'maestria-en-zootecnia', nombre: 'Maestría en Zootecnia', tipo: 'posgrado', orden: 2, sede: 'Concepción',
    duracion: 2, titulo: 'Magister Scientiae en Zootecnia', sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '992/19', enlace: DRIVE.r992 }],
  },
  {
    slug: 'especializacion-en-fertilidad-del-suelo-y-nutricion-de-plantas', nombre: 'Especialización en Fertilidad del Suelo y Nutrición de Plantas', tipo: 'posgrado', orden: 3, sede: CENTRAL,
    titulo: 'Especialista en Fertilidad del Suelo y Nutrición de Plantas', sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '553/22', enlace: DRIVE.r553 }],
  },
]

/**
 * Aranceles de S1, concepto como en la fuente. Montos en guaraníes enteros. Los grupos del CMS son 4 (multas, venta,
 * servicios, medicos); S1 tiene 6 encabezados: los que no calzan se agrupan en el más cercano y conservan el
 * encabezado original en `nota`. Se OMITEN 3 filas con asterisco (matrícula de grado (*) y (**), derecho de examen
 * de ingreso (*)): S1 no explica qué significan (ver brechas en la spec).
 */
const A = (grupo, rows, nota) => rows.map(([concepto, monto], i) => ({
  grupo, concepto, monto, orden: i + 1, sourceUrl: SOURCES.S1, ...(nota ? { nota } : {}),
}))
export const ARANCELES = [
  ...A('multas', [['Multa por retraso de cuotas, maestría', 20000]]),
  ...A('venta', [
    ['Carpeta para Concurso', 150000],
    ['Certificados de Estudios parcial y completo, grado', 40000],
    ['Certificados de Estudios parcial y completo, maestría', 40000],
    ['Constancias Varias', 40000],
    ['Programa de estudio', 25000],
    ['Credencial de estudiante-funcionario-docente', 100000],
    ['Certificación Cursos de Capacitación, profesionales', 40000],
    ['Certificación Cursos de Capacitación, alumnos', 20000],
    ['Formulario de presentación de trabajo final de grado', 100000],
    ['Formulario para solicitudes varias', 10000],
    ['Reglamento Académico', 40000],
  ]),
  ...A('venta', [['Venta de Plantines', 3000]], 'Venta de Bienes Forestales').map((a) => ({ ...a, orden: 12 })),
  ...A('servicios', [
    ['Matrícula CPI', 150000],
    ['Matrícula Maestría', 500000],
    ['Cuota CPI', 200000],
    ['Cuotas de grado, mensual', 100000],
    ['Recuperación de materia, grado', 100000],
    ['Derecho de examen 1º oportunidad, grado', 20000],
    ['Derecho de examen 2º oportunidad, grado', 25000],
    ['Derecho de examen 3º oportunidad, grado', 30000],
    ['Derecho Examen Ordinario, Maestría', 50000],
    ['Derecho a defensa de tesis, Maestría', 1000000],
    ['Convalidación por asignatura, grado', 200000],
    ['Solicitud Cambio de Carrera, grado', 100000],
    ['Derecho a defensa de tesis de grado', 300000],
    ['Derecho Examen Extraordinario, Maestría', 100000],
    ['Matrícula Especialización', 400000],
    ['Cuota Maestría', 550000],
  ], 'Aranceles Educativos'),
  ...A('servicios', [['Análisis Laboratoriales', 80000]], 'Servicios por Análisis Laboratoriales').map((a) => ({ ...a, orden: 17 })),
  ...A('servicios', [['Alquiler de Salón p/ Cantina', 2000000]], 'Alquileres Varios').map((a) => ({ ...a, orden: 18 })),
]
