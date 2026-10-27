/**
 * MIG-IMG fase 2a: procedencia de los archivos de `media` (`sha256` y `sourcePath`).
 *
 * Qué hace: calcula el sha256 (hex) de los bytes ORIGINALES subidos y valida la ruta de origen opcional
 * que envía el cargador masivo (p. ej. `2024/05/foto.jpg`).
 *
 * Por qué el hash del ORIGINAL y no del archivo normalizado: el cargador puede calcularlo sobre el archivo
 * local ANTES de subirlo y preguntar «¿ya existe?» sin depender de la versión de sharp ni de los
 * parámetros de codificación (que cambiarían el hash normalizado y romperían la idempotencia). El hash del
 * resultado no se guarda: no lo necesita nadie hoy (mantenerlo simple).
 *
 * Amenazas que evita `validateSourcePath`: rutas absolutas, `..`, barras invertidas, URL y caracteres de
 * control guardados como «procedencia» y reutilizados luego por scripts para abrir archivos fuera de la
 * carpeta prevista. Límite: valida la forma; no comprueba que la ruta exista ni que corresponda al archivo.
 * Tarea: MIG-IMG fase 2a. Evidencia: RDD-MIG-IMG-57.
 */
import { createHash } from 'node:crypto'

/** Longitud máxima de `sourcePath` (caracteres). */
export const SOURCE_PATH_MAX = 512

const SOURCE_PATH_MESSAGE =
  'La ruta de origen debe ser relativa (por ejemplo, 2024/05/foto.jpg), con barras «/», sin «..», «.», ' +
  `barras invertidas, unidades de disco, URL ni caracteres de control, y de hasta ${SOURCE_PATH_MAX} caracteres.`

/** sha256 en hexadecimal (64 caracteres) de los bytes recibidos. */
export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/** true si el texto es un sha256 hexadecimal en minúsculas. */
export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

/**
 * Valida `sourcePath`. Vacío/nulo = válido (subidas manuales desde el panel). Devuelve `true` o un mensaje
 * en español que NO repite el valor recibido (podría contener datos de una ruta personal).
 */
export function validateSourcePath(value: unknown): true | string {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return SOURCE_PATH_MESSAGE
  const path = value.trim()
  if (path === '') return true
  if (path.length > SOURCE_PATH_MAX) return SOURCE_PATH_MESSAGE
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return SOURCE_PATH_MESSAGE
  }
  if (path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.includes('://')) {
    return SOURCE_PATH_MESSAGE
  }
  const segments = path.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return SOURCE_PATH_MESSAGE
  return true
}

/** Normaliza `sourcePath` para guardar: recorta espacios; vacío → null. */
export function normalizeSourcePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.trim()
  return path === '' ? null : path
}
