// FAC-05: datos oficiales de Medicina extraídos de la página institucional de la UNC.
// Qué hace: separa hechos verificables, procedencia y filas omitidas antes de tocar Payload.
// Amenaza: evita inventar aranceles, siglas, historia o autoridades que la fuente consultada no publica.
// Límite: la página oficial no publica aranceles de Medicina; el CMS queda sin aranceles hasta una fuente oficial validada.
export const SOURCES = {
  S1: 'https://www.unc.edu.py/facultad-de-medicina/',
}

export const FACULTAD_SLUG = 'facultad-de-medicina'
export const FACULTAD_NOMBRE = 'Facultad de Medicina'

export const FACULTAD_FIELDS = {
  descripcion: {
    value: 'Unidad académica de la Universidad Nacional de Concepción que ofrece la carrera de Medicina y programas de posgrado en el área de la salud.',
    sourceUrl: SOURCES.S1,
  },
  direccion: {
    value: 'Campus Universitario: Ruta PY05, km 210. Predio Hospital Regional: Prof. Guillermo Cabral y Dr. Marcial Royg Bernal.',
    sourceUrl: SOURCES.S1,
  },
  telefono: { value: '(595 331) 242591; 241022; 241680', sourceUrl: SOURCES.S1 },
  email: { value: 'fm-secretariageneral@unc.edu.py', sourceUrl: SOURCES.S1 },
  sitioWeb: { value: 'https://www.founc.edu.py/', sourceUrl: SOURCES.S1 },
  logoPath: { value: '/images/facultades/medicina.png', sourceUrl: SOURCES.S1 },
}

export const CARRERAS = [
  {
    slug: 'medicina',
    nombre: 'Medicina',
    tipo: 'grado',
    orden: 1,
    sede: 'Central/Concepción',
    sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '160/16' }],
  },
  {
    slug: 'especializacion-en-salud-publica',
    nombre: 'Especialización en Salud Pública',
    tipo: 'posgrado',
    orden: 1,
    sede: 'Central/Concepción',
    sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '72/16' }],
  },
  {
    slug: 'especializacion-en-medicina-familiar-y-comunitaria',
    nombre: 'Especialización en Medicina Familiar y Comunitaria',
    tipo: 'posgrado',
    orden: 2,
    sede: 'Concepción',
    sourceUrl: SOURCES.S1,
    resoluciones: [{ numero: '157/18' }, { numero: '554/23', detalle: 'Rectificación CONES N.° 554/23' }],
  },
]

export const ARANCELES = []

export const OMITIDOS = [
  {
    concepto: 'Aranceles facultad',
    motivo: 'La página oficial consultada no publica una tabla de aranceles para Medicina; no se inventa ningún monto.',
    sourceUrl: SOURCES.S1,
  },
]

const seedData = { SOURCES, FACULTAD_SLUG, FACULTAD_NOMBRE, FACULTAD_FIELDS, CARRERAS, ARANCELES, OMITIDOS }
export default seedData
