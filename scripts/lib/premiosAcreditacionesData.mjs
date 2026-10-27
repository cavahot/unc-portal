// PRA-01 (fase CMS): datos de siembra de reconocimientos, acreditaciones y facultades.
// Módulo PURO (sin red ni disco) para poder probar sus reglas: cada fila lleva fuente, nada se inventa y
// todo nace inactivo y sin verificar. Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §6 y §11.
// Evidencia: docs/research/evidence-register-premios.md (RDD-PRA-22..38).
//
// Reglas de esta tabla (decisión del PO, 2026-10-23):
//   - `resolucion`, `vigenciaDesde` y `vigenciaHasta` quedan VACÍAS: ninguna fuente consultada los da.
//   - `facultadSlug` solo se asigna si la fuente nombra la facultad; el campo `facultadSoporte` dice cuál.
//     Esos dos campos son metadatos del seed: el guion NO los envía al CMS (ver `toCmsPayload*`).
//   - `active` y `verificado` siempre `false`: el PO los activa en el panel tras confirmar cada dato.

export const URL_PNC_2016 = 'https://www.conacyt.gov.py/entrea_del_premio_nacional_a_la_calidad'
export const URL_PNC_2025 = 'https://www.conacyt.gov.py/conacyt-entrego-premio-nacional-calidad-excelencia-gestion-2025'
export const URL_PRENSA_2025 = 'https://www.radionacional.gov.py/2026/04/27/conacyt-impulsa-el-premio-nacional-a-la-calidad-y-reconoce-a-organizaciones-destacadas-en-gestion/'
export const URL_BOLETIN_ANEAES_2020 = 'https://informacionpublica.paraguay.gov.py/public/2162896-BoletnEstadstico-ANEAES2020pdf-BoletnEstadstico-ANEAES2020.pdf'
export const URL_ANEAES_ENTREGA_2025 = 'https://www.aneaes.gov.py/wp-content/uploads/2025/12/Presentacion_entrega-de-acreditaciones_2025-1_final.pdf_finall.pdf'
export const URL_RDN_ODONTOLOGIA_2025 = 'https://www.rdn.com.py/2025/11/04/carreras-de-odontologia-casi-50-sin-acreditacion-de-aneaes/'
export const URL_CONACYT_LOGO_PAGINA = 'https://www.conacyt.gov.py/taxonomy/term/35'
export const URL_CONACYT_LOGO_ARCHIVO = 'https://www.conacyt.gov.py/sites/default/files/upload_editores/u38/00%20logo%20apc%20premio-02_0.jpg'

/** Ruta pública (relativa a /public) donde el seed espera el logo del premio. */
export const LOGO_PREMIO_PATH = '/images/reconocimientos/premio-calidad-conacyt.jpg'

/**
 * Reconocimientos. Clave natural: `nombre`.
 * La edición 2025 queda con distinción «por-confirmar»: CONACYT dice «galardonada, categoría Sector
 * Público» sin precisar el nombre exacto de la distinción (RDD-PRA-25); la prensa dice «reconocimiento
 * principal» (RDD-PRA-26, fuente secundaria) y NO se toma como dato.
 */
export const RECONOCIMIENTOS = [
  {
    nombre: 'Premio Nacional a la Calidad y Excelencia en la Gestión',
    entidad: 'CONACYT',
    logoPath: LOGO_PREMIO_PATH,
    logoAlt: 'Logo del Premio Nacional a la Calidad y Excelencia en la Gestión',
    nota:
      `Logo: archivo «00 logo apc premio-02_0.jpg» publicado por CONACYT en ${URL_CONACYT_LOGO_PAGINA} ` +
      `(archivo: ${URL_CONACYT_LOGO_ARCHIVO}). El Product Owner indicó el 2026-10-23 que es el logo correcto y confirmó su uso. ` +
      'Pendiente: autorización o manual de marca de CONACYT, si el PO la obtiene. ' +
      'Ediciones 2017 y 2018: la UNC no figura en las listas de CONACYT. Ediciones 2019-2024: sin datos, por confirmar.',
    ediciones: [
      {
        anio: 2016,
        distincion: 'mencion-especial',
        categoria: 'Pública Grande',
        fuenteUrl: URL_PNC_2016,
        nota:
          'Mención Especial (no fue el premio máximo de la categoría). Fuente oficial: CONACYT, 26-10-2016 (RDD-PRA-22).',
        verificado: false,
      },
      {
        anio: 2025,
        distincion: 'por-confirmar',
        categoria: 'Sector Público',
        fuenteUrl: URL_PNC_2025,
        nota:
          'CONACYT (27-04-2026) dice que la UNC fue galardonada en la categoría Sector Público; no precisa el nombre exacto de la distinción. ' +
          `La prensa la describe como «reconocimiento principal» (${URL_PRENSA_2025}, fuente secundaria). ` +
          'Por confirmar con el diploma o la resolución de CONACYT.',
        verificado: false,
      },
    ],
    orden: 1,
    active: false,
    verificado: false,
  },
]

/**
 * Facultades. Clave natural: `slug` (el que genera el CMS desde el nombre, igual que los seed-*.mjs).
 * `siglas` solo donde hay evidencia en el repositorio (dominios institucionales y la spec); el resto
 * queda en `null` = «por confirmar». `logoPath` apunta a archivos ya versionados (RDD-PRA-03).
 */
export const FACULTADES = [
  { slug: 'facultad-de-ciencias-agrarias', nombre: 'Facultad de Ciencias Agrarias', siglas: null, logoPath: '/images/facultades/agrarias.png' },
  { slug: 'facultad-de-ciencias-economicas-y-administrativas', nombre: 'Facultad de Ciencias Económicas y Administrativas', siglas: 'FCEA', logoPath: '/images/facultades/economicas.png' },
  { slug: 'facultad-de-ciencias-exactas-y-tecnologicas', nombre: 'Facultad de Ciencias Exactas y Tecnológicas', siglas: 'FACET', logoPath: '/images/facultades/exactas.png' },
  { slug: 'facultad-de-humanidades-y-ciencias-de-la-educacion', nombre: 'Facultad de Humanidades y Ciencias de la Educación', siglas: 'FHyCE', logoPath: '/images/facultades/humanidades.png' },
  { slug: 'facultad-de-medicina', nombre: 'Facultad de Medicina', siglas: null, logoPath: '/images/facultades/medicina.png' },
  { slug: 'facultad-de-odontologia', nombre: 'Facultad de Odontología', siglas: null, logoPath: '/images/facultades/odontologia.png' },
]

const SOPORTE_BOLETIN = 'Boletín ANEAES 2020, Tabla 5 (Modelo Nacional)'

/**
 * Acreditaciones. Una fila por carrera/programa; clave natural: `programa` + `sede`.
 * Las que aparecen en 2020 y en 2025 se deduplican: `fuenteUrl` es la más reciente y `nota` cita las demás.
 * `modelo` solo cuando la única fuente (Boletín 2020, Tabla 5 de grado) lo da; si hay una fuente posterior sin modelo, o es un postgrado, queda vacío.
 */
export const ACREDITACIONES = [
  {
    programa: 'Ciencias de la Educación',
    nivel: 'grado',
    sede: 'Concepción',
    facultadSlug: 'facultad-de-humanidades-y-ciencias-de-la-educacion',
    facultadSoporte: `${SOPORTE_BOLETIN}, n.º 11: Humanidades y Ciencias de la Educación`,
    organismo: 'aneaes',
    modelo: 'modelo-nacional',
    fuenteUrl: URL_BOLETIN_ANEAES_2020,
    nota:
      'Vigente en el período 2015-2019 según el Boletín Estadístico ANEAES 2020 (RDD-PRA-31). Vigencia actual, resolución y fechas por confirmar con la Dirección de Aseguramiento de la Calidad.',
    orden: 1,
  },
  {
    programa: 'Odontología',
    nivel: 'grado',
    sede: 'Concepción',
    facultadSlug: 'facultad-de-odontologia',
    facultadSoporte: `${SOPORTE_BOLETIN}, n.º 15: Odontología`,
    organismo: 'aneaes',
    fuenteUrl: URL_BOLETIN_ANEAES_2020,
    nota:
      'Boletín 2020: vigente 2015-2019 por Modelo Nacional (n.º 15). Además, la prensa (RDN, 04-11-2025, cita un informe ANEAES) la lista entre las carreras acreditadas, sin año propio: ' +
      `${URL_RDN_ODONTOLOGIA_2025}. Modelo, resolución y vigencia actuales por confirmar.`,
    orden: 2,
  },
  {
    programa: 'Medicina',
    nivel: 'grado',
    sede: 'Concepción',
    facultadSlug: null,
    facultadSoporte: null,
    organismo: 'aneaes',
    modelo: 'modelo-nacional',
    fuenteUrl: URL_BOLETIN_ANEAES_2020,
    nota:
      'Boletín 2020, n.º 26: vigente 2015-2019. El boletín rotula la facultad como «Ciencias de la Salud» (sic), que no coincide con ninguna facultad del CMS; facultad por confirmar (probablemente Facultad de Medicina). Vigencia actual, resolución y fechas por confirmar.',
    orden: 3,
  },
  {
    programa: 'Contaduría Pública',
    nivel: 'grado',
    sede: 'Filial Horqueta',
    facultadSlug: 'facultad-de-ciencias-economicas-y-administrativas',
    facultadSoporte: `${SOPORTE_BOLETIN}, n.º 103: Ciencias Económicas y Administrativas`,
    organismo: 'aneaes',
    fuenteUrl: URL_ANEAES_ENTREGA_2025,
    nota:
      `Certificado entregado en el acto ANEAES del 19-12-2025 (${URL_ANEAES_ENTREGA_2025}); la presentación no indica modelo, resolución ni vigencia. ` +
      `También figuraba vigente 2015-2019 en el Boletín 2020, n.º 103 (${URL_BOLETIN_ANEAES_2020}). Modelo actual, resolución y vigencia por confirmar.`,
    orden: 4,
  },
  {
    programa: 'Licenciatura en Administración Agropecuaria',
    nivel: 'grado',
    sede: 'Filial Horqueta',
    facultadSlug: 'facultad-de-ciencias-agrarias',
    facultadSoporte: `${SOPORTE_BOLETIN}, n.º 190: Ciencias Agrarias`,
    organismo: 'aneaes',
    fuenteUrl: URL_ANEAES_ENTREGA_2025,
    nota:
      `Certificado entregado en el acto ANEAES del 19-12-2025 (${URL_ANEAES_ENTREGA_2025}); la presentación no indica modelo, resolución ni vigencia. ` +
      `También figuraba vigente 2015-2019 como «Administración Agropecuaria» en el Boletín 2020, n.º 190 (${URL_BOLETIN_ANEAES_2020}). Modelo actual, resolución y vigencia por confirmar.`,
    orden: 5,
  },
  {
    programa: 'Maestría en Didáctica de las Ciencias Matemática, Física y Química',
    nivel: 'posgrado',
    sede: 'Concepción',
    facultadSlug: null,
    facultadSoporte: null,
    organismo: 'aneaes',
    fuenteUrl: URL_BOLETIN_ANEAES_2020,
    nota:
      'Boletín 2020, p. 37: postgrado vigente 2015-2019 (Tabla 6 de postgrados; el registro de evidencia no confirma el modelo). El boletín no indica la facultad. Modelo, facultad, vigencia actual y resolución por confirmar.',
    orden: 6,
  },
  {
    programa: 'Especialización en Medicina Familiar y Comunitaria',
    nivel: 'posgrado',
    sede: 'Hospital Regional de Concepción (unidad formadora)',
    facultadSlug: null,
    facultadSoporte: null,
    organismo: 'aneaes',
    fuenteUrl: URL_ANEAES_ENTREGA_2025,
    nota:
      `Certificado entregado en el acto ANEAES del 19-12-2025 (${URL_ANEAES_ENTREGA_2025}); la presentación no indica facultad, modelo, resolución ni vigencia. ` +
      'Facultad por confirmar (¿Medicina?). Modelo, resolución y vigencia por confirmar.',
    orden: 7,
  },
]

/** Campos de metadatos del seed que NUNCA se envían al CMS. */
const SEED_ONLY_FIELDS = ['facultadSlug', 'facultadSoporte']

/** Quita los valores vacíos para no enviar `null`/`undefined` a Payload. */
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''))
}

/**
 * Convierte un reconocimiento en el cuerpo para la API REST del CMS.
 * Garantía de seguridad: fuerza `active: false` y `verificado: false` (en el premio y en cada edición)
 * aunque el dato de origen cambie por error; el PO los activa en el panel.
 */
export function toCmsPayloadReconocimiento(item, { includeLogo = true } = {}) {
  const { logoPath, ediciones, ...rest } = item
  return compact({
    ...rest,
    ...(includeLogo ? { logoPath } : {}),
    ediciones: ediciones.map((e) => compact({ ...e, verificado: false })),
    active: false,
    verificado: false,
  })
}

/**
 * Convierte una acreditación en el cuerpo para la API REST del CMS. `facultadId` lo resuelve el guion
 * por slug (solo si `facultadSlug` está definido). Fuerza `active: false` y `verificado: false`.
 */
export function toCmsPayloadAcreditacion(item, facultadId) {
  const body = { ...item }
  for (const k of SEED_ONLY_FIELDS) delete body[k]
  return compact({
    ...body,
    ...(item.facultadSlug && facultadId ? { facultad: facultadId } : {}),
    active: false,
    verificado: false,
  })
}
