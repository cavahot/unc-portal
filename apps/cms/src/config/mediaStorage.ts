/**
 * MIG-IMG fase 1: decisión explícita y con falla cerrada del almacenamiento de `media`.
 *
 * Qué hace: lee `MEDIA_STORAGE` (`local` | `s3`), `MEDIA_DIR` y `MEDIA_MAX_BYTES` y devuelve la
 * configuración ya validada, o lanza un Error claro al arrancar. Es una función pura (recibe el
 * entorno) para poder probarla sin Payload.
 *
 * Por qué existe: antes el plugin S3 se activaba solo por la presencia de dos variables
 * (`S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`). Con el MinIO caído, toda subida fallaba con
 * ECONNREFUSED («Failed to save 1 files») y un `.env` heredado cambiaba el destino de los archivos
 * sin que nadie lo decidiera. Ahora S3 exige `MEDIA_STORAGE=s3` explícito; por defecto es disco local.
 *
 * Amenazas que evita: (1) activar S3 por accidente o dejar a medio configurar un destino remoto;
 * (2) guardar archivos en la capa efímera del contenedor (en producción `MEDIA_DIR` debe ser absoluto,
 * apuntando al volumen persistente); (3) rutas con `..`/NUL que escapen del directorio previsto;
 * (4) un tope de subida inválido que desactive el límite. Los mensajes NUNCA incluyen valores de
 * secretos ni el valor inválido recibido, solo el nombre de la variable.
 *
 * Límites: valida la forma, no que el directorio exista, sea escribible o esté montado en un volumen
 * (eso depende de Docker; ver docs/specs/migration/MIG-IMG-imagenes-de-noticias.md §16).
 * Tarea: MIG-IMG (opción A). Evidencia: RDD-MIG-IMG-38 a 44.
 */
import path from 'node:path'

type Env = { [key: string]: string | undefined }

/** Tope por defecto de un archivo subido: 10 MiB (imágenes del lote ≤ 1 MiB; PDF/DOC caben). */
export const DEFAULT_MEDIA_MAX_BYTES = 10 * 1024 * 1024
/**
 * Techo aceptado para MEDIA_MAX_BYTES: 11 MiB. NO es arbitrario: el proxy de Next recorta el cuerpo de
 * cualquier petición a `experimental.proxyClientMaxBodySize` (10 MB por defecto; apps/cms/next.config.mjs
 * lo sube a 12mb). Un tope de archivo mayor que ese límite haría que el multipart llegue incompleto a
 * Payload («Unexpected end of form», 500) en vez de un 413 limpio. Para admitir archivos mayores hay que
 * subir AMBOS valores (y el client_max_body_size de nginx); lo vigila tests/unit/mig-img-media-storage.spec.ts.
 */
export const MEDIA_MAX_BYTES_CEILING = 11 * 1024 * 1024

export type MediaStorageConfig =
  | { mode: 'local'; staticDir: string }
  | { mode: 's3' }

/** true si el valor es una cadena con contenido (tras `trim`). */
function present(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Valida y normaliza `MEDIA_DIR`. En producción exige ruta absoluta (el volumen persistente);
 * en desarrollo acepta una ruta relativa (por defecto `media`, relativa al cwd del CMS, como antes).
 * Rechaza vacío, NUL, segmentos `..` y la raíz del sistema de archivos.
 */
function resolveStaticDir(env: Env): string {
  const isProduction = env.NODE_ENV === 'production'
  const isBuild = env.NEXT_PHASE === 'phase-production-build'
  const raw = env.MEDIA_DIR

  // `next build` evalúa payload.config.ts sin variables de entorno (el Dockerfile construye sin
  // secretos ni rutas); no se exige MEDIA_DIR allí. El arranque real vuelve a validar.
  if (!present(raw)) {
    if (isProduction && !isBuild) {
      throw new Error(
        'MEDIA_DIR es obligatorio en producción con MEDIA_STORAGE=local: debe ser la ruta absoluta del ' +
          'volumen persistente de archivos (p. ej. /app/media).',
      )
    }
    return 'media'
  }

  const value = raw.trim()
  if (value.includes('\u0000')) {
    throw new Error('MEDIA_DIR contiene caracteres no válidos.')
  }
  if (value.split(/[\\/]+/).includes('..')) {
    throw new Error('MEDIA_DIR no puede contener segmentos «..».')
  }
  const absolute = path.isAbsolute(value)
  if (!absolute && isProduction && !isBuild) {
    throw new Error('MEDIA_DIR debe ser una ruta absoluta en producción (el volumen persistente, p. ej. /app/media).')
  }
  if (absolute) {
    const resolved = path.resolve(value)
    // Una raíz (`/` o `C:\`) como directorio de archivos expondría/escribiría todo el sistema.
    if (path.parse(resolved).root === resolved) {
      throw new Error('MEDIA_DIR no puede ser la raíz del sistema de archivos.')
    }
    return resolved
  }
  return value
}

/**
 * Resuelve el destino de `media`. Por defecto `local`. `s3` solo si `MEDIA_STORAGE=s3` y están
 * `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` y `S3_ENDPOINT`; si no, lanza.
 * Compatibilidad: un despliegue que usaba S3 solo por tener las claves debe fijar MEDIA_STORAGE=s3.
 */
export function resolveMediaStorage(env: Env = process.env): MediaStorageConfig {
  const requested = present(env.MEDIA_STORAGE) ? env.MEDIA_STORAGE.trim().toLowerCase() : 'local'
  if (requested === 's3') {
    const required = ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_ENDPOINT'] as const
    const missing = required.filter((name) => !present(env[name]))
    if (missing.length > 0) {
      throw new Error(`MEDIA_STORAGE=s3 requiere definir: ${missing.join(', ')}.`)
    }
    return { mode: 's3' }
  }
  if (requested === 'local') {
    return { mode: 'local', staticDir: resolveStaticDir(env) }
  }
  // No se imprime el valor recibido: podría ser un secreto pegado en la variable equivocada.
  throw new Error("MEDIA_STORAGE debe ser 'local' o 's3'.")
}

/**
 * Tope por archivo (bytes). Entero positivo hasta MEDIA_MAX_BYTES_CEILING (11 MiB); cualquier otro valor lanza en lugar de
 * desactivar el límite en silencio (un `NaN` en `limits.fileSize` equivale a «sin límite»).
 */
export function resolveMaxBytes(env: Env = process.env): number {
  if (!present(env.MEDIA_MAX_BYTES)) return DEFAULT_MEDIA_MAX_BYTES
  const raw = env.MEDIA_MAX_BYTES.trim()
  const value = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > MEDIA_MAX_BYTES_CEILING) {
    throw new Error(`MEDIA_MAX_BYTES debe ser un entero de bytes entre 1 y ${MEDIA_MAX_BYTES_CEILING} (límite del proxy de Next, ver mediaStorage.ts).`)
  }
  return value
}

/**
 * Opciones `upload` globales de Payload para las subidas multipart (REST y panel).
 *
 * Por qué `abortOnLimit: true`: sin él, busboy corta el flujo al llegar al tope y Payload guarda el
 * archivo TRUNCADO sin error (node_modules/payload/dist/uploads/fetchAPI-multipart/processMultipart.js:67-83;
 * el valor por defecto es `abortOnLimit: false`, fetchAPI-multipart/index.js:5-19). Con él responde 413 y
 * limpia. Las opciones se mezclan en `addDataAndFileToRequest.js:30-35`.
 * Límite: solo afecta a multipart; la Local API no pasa por aquí (el hook de bytes repite el tope).
 */
export function buildUploadOptions(env: Env = process.env) {
  return {
    limits: { fileSize: resolveMaxBytes(env) },
    abortOnLimit: true,
    responseOnLimit: 'El archivo supera el tamaño máximo permitido.',
  } as const
}
