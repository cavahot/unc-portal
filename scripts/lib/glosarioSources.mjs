// GLO-GN-01: registro de fuentes OFICIALES que el actualizador del glosario guaraní puede consultar.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §4. Evidencia de cada host: archivos del PO
// (Traduccion_Guarani/fuentes_guarani.md, consultados el 11-10-2026).
//
// Regla: solo hosts EXACTOS de OFFICIAL_HOSTS (misma lista que apps/cms/src/utilities/validators.ts,
// comprobada por prueba). Un corpus de investigación (Jojajovai), Dialnet o Wikipedia NUNCA entran aquí:
// pueden figurar en el CMS como `evidenciaUrl`, pero el actualizador no los descarga.

/** Hosts oficiales aceptados (sin comodines ni subdominios implícitos). */
export const OFFICIAL_HOSTS = Object.freeze([
  'datos.gov.py',
  'www.datos.gov.py',
  'repositorio.conacyt.gov.py',
  'spl.gov.py',
  'www.spl.gov.py',
])

/**
 * true si `url` es https, sin credenciales y con host exacto de la lista oficial.
 * Amenaza que evita: descargar de un host ajeno (o parecido, `www.datos.gov.py.evil.example`) y presentar
 * su contenido como vocabulario oficial. Límite: no garantiza que el host no esté comprometido.
 */
export function isOfficialUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password && OFFICIAL_HOSTS.includes(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Fuentes conocidas. `kind`:
 *  - `ckan`: ficha de dataset; se descubre el recurso con la API `package_show` (solo recursos csv/json en
 *    hosts oficiales). `fallbackResourceUrls`: URL del archivo citada por el PO, por si la API no responde.
 *  - `file`: archivo directo.
 *  - `page`: página o PDF que no se puede analizar sin dependencias nuevas → se informa como «manual».
 * `minIntervalMs`: pausa mínima entre pedidos al host (datos.gov.py pide 10 s en robots.txt, según el PO).
 */
export const GLOSARIO_SOURCES = Object.freeze([
  Object.freeze({
    id: 'spl-vocabulario-es-gn',
    nombre: 'Vocabulario es-gn de la SPL — importación automática (datos.gov.py)',
    institucion: 'Secretaría de Políticas Lingüísticas (SPL), publicado en el Portal de Datos Abiertos',
    url: 'https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD',
    kind: 'ckan',
    apiUrl: 'https://www.datos.gov.py/api/3/action/package_show?id=vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD',
    fallbackResourceUrls: Object.freeze(['https://www.datos.gov.py/sites/default/files/traductor-espanol-guarani.csv']),
    parser: 'spl-csv',
    formato: 'csv',
    licencia: 'Licencia de Uso de la Información Pública del Gobierno Paraguayo (según la ficha del dataset)',
    minIntervalMs: 10_000,
  }),
  Object.freeze({
    id: 'conacyt-diccionario-informatico',
    nombre: 'Diccionario informático bilingüe castellano-guaraní (Yvy Marãe\'ỹ/CONACYT 2017)',
    institucion: 'CONACYT (repositorio institucional)',
    url: 'https://repositorio.conacyt.gov.py/handle/20.500.14066/2622',
    kind: 'page',
    parser: null,
    formato: 'pdf',
    licencia: 'CC BY-NC-SA 4.0 (según el PO)',
    minIntervalMs: 3_000,
  }),
  Object.freeze({
    id: 'spl-portal-diccionarios',
    nombre: 'Portal de diccionarios de la SPL',
    institucion: 'Secretaría de Políticas Lingüísticas (SPL)',
    url: 'https://spl.gov.py/diccionarios',
    kind: 'page',
    parser: null,
    formato: 'html',
    licencia: 'No verificada (el PO no pudo abrir el portal desde la red de la UNC)',
    minIntervalMs: 3_000,
  }),
])

/**
 * Valida el registro completo y lo devuelve; lanza si alguna URL no es oficial.
 * Falla cerrada: un error de edición del registro no puede convertir un host ajeno en «oficial».
 */
export function loadSources(sources = GLOSARIO_SOURCES) {
  const ids = new Set()
  for (const s of sources) {
    if (!s.id || ids.has(s.id)) throw new Error(`Registro de fuentes: id vacío o repetido (${s.id}).`)
    ids.add(s.id)
    for (const url of [s.url, s.apiUrl, ...(s.fallbackResourceUrls ?? [])].filter(Boolean)) {
      if (!isOfficialUrl(url)) throw new Error(`Registro de fuentes: ${s.id} usa un host no oficial o sin https: ${url}`)
    }
    if (!['ckan', 'file', 'page'].includes(s.kind)) throw new Error(`Registro de fuentes: kind inválido en ${s.id}.`)
  }
  return sources
}
