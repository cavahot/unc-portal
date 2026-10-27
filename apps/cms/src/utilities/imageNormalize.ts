/**
 * MIG-IMG fase 2a: normalización de imágenes subidas a `media`, ANTES de que Payload las escriba en disco.
 *
 * Qué hace: decodifica la imagen COMPLETA (no solo la cabecera), aplica la orientación EXIF, limita el
 * lado largo a 2560 px sin agrandar, convierte a sRGB, elimina todos los metadatos (EXIF, GPS, XMP, IPTC,
 * ICC) y vuelve a codificar en el MISMO formato (JPEG mozjpeg 82 progresivo; PNG sin pérdida con
 * compresión máxima y alfa; WebP 82; AVIF 60). GIF solo se valida (decodificación completa) y se devuelve
 * sin tocar. Devuelve los bytes nuevos, el MIME (igual al de entrada) y las dimensiones finales.
 *
 * Por qué existe: (1) privacidad: las fotos de teléfono traen GPS y datos del aparato que se publicarían
 * tal cual; (2) rendimiento y disco: fotos de 4-12 MB y 6000 px; (3) seguridad: la guardia de fase 1 usa
 * `sharp.metadata()`, que solo lee la cabecera, así que un JPEG con cabecera válida y cuerpo corrupto (o
 * truncado) pasaba; aquí se decodifica todo con `failOn: 'warning'`, el nivel que sharp recomienda para
 * entradas no confiables (node_modules/sharp/dist/index.d.mts:987-990); (4) volver a codificar descarta los
 * bytes añadidos detrás de la imagen (políglotas) y los comentarios del archivo.
 *
 * Por qué no las opciones de Payload: `upload.resizeOptions`/`formatOptions` son únicas para toda la
 * colección (un solo formato de salida; convertiría PNG con alfa a JPEG o al revés) y no permiten fijar la
 * codificación por formato (node_modules/payload/dist/uploads/generateFileData.js:121-144). Sin
 * `withMetadata`, Payload ya quita metadatos al reprocesar (optionallyAppendMetadata.js:1-14), pero para
 * JPEG/PNG sin ajustes NO reprocesa y guarda los bytes del cliente tal cual (generateFileData.js:128,174-182).
 *
 * Límites: no detecta contenido malicioso dentro de píxeles válidos; una imagen ya comprimida con calidad
 * menor que 82 puede crecer algo de tamaño al recodificarse; WebP/AVIF/GIF los vuelve a pasar por sharp
 * Payload con sus valores por defecto (generateFileData.js:107-111,125-133), una segunda pasada con
 * pérdida leve en WebP/AVIF. `limitInputPixels` acota la memoria ante «bombas de descompresión».
 * Tarea: MIG-IMG fase 2a. Evidencia: RDD-MIG-IMG-50 a 56.
 */
import sharp, { type Sharp, type SharpOptions } from 'sharp'

/** Lado largo máximo de una imagen almacenada (px). Decisión del PO (fase 2a). */
export const MAX_LONG_SIDE = 2560

/**
 * Píxeles máximos de entrada (ancho × alto): 120 MP cubre cámaras de teléfono de 108 MP. Por encima,
 * sharp rechaza antes de decodificar (protege la memoria del servidor frente a imágenes gigantes).
 */
export const MAX_INPUT_PIXELS = 120_000_000

export type NormalizeInput = { data: Buffer | Uint8Array; mimeType: string }

export type NormalizeResult =
  | { ok: true; data: Buffer; mimeType: string; width: number; height: number; changed: boolean }
  | { ok: false; reason: string }

/** Formatos que se recodifican; GIF se valida pero no se toca (animaciones y paletas). */
const REENCODED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

const CORRUPT = 'La imagen está dañada o incompleta. Vuelva a exportarla (por ejemplo, ábrala y guárdela de nuevo) e inténtelo otra vez.'

/** Aplica la codificación final según el formato de entrada (el MIME no cambia). */
function encode(pipeline: Sharp, mimeType: string): Sharp {
  switch (mimeType) {
    case 'image/jpeg':
      // mozjpeg: mejor compresión al mismo nivel de calidad; progresivo: se ve antes en conexiones lentas.
      return pipeline.jpeg({ quality: 82, mozjpeg: true, progressive: true })
    case 'image/png':
      // Sin pérdida: logos y capturas con texto o transparencia; solo se gana por compresión.
      return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    case 'image/webp':
      return pipeline.webp({ quality: 82, alphaQuality: 100 })
    default:
      return pipeline.avif({ quality: 60 })
  }
}

/**
 * Normaliza una imagen. Nunca lanza: devuelve `{ ok: false, reason }` con un texto en español para el
 * editor (sin el mensaje interno de libvips, que no le sirve y podría filtrar detalles).
 */
export async function normalizeImage(input: NormalizeInput): Promise<NormalizeResult> {
  const mimeType = input.mimeType
  const buffer = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data)
  const options: SharpOptions = { failOn: 'warning', limitInputPixels: MAX_INPUT_PIXELS }

  if (mimeType === 'image/gif') {
    try {
      // Decodificación completa de todos los cuadros con salida mínima: valida sin gastar memoria.
      await sharp(buffer, { ...options, animated: true }).resize(16, 16, { fit: 'inside' }).raw().toBuffer()
      const meta = await sharp(buffer, { animated: true }).metadata()
      const height = meta.pages && meta.pageHeight ? meta.pageHeight : meta.height
      return { ok: true, data: buffer, mimeType, width: meta.width ?? 0, height: height ?? 0, changed: false }
    } catch {
      return { ok: false, reason: CORRUPT }
    }
  }

  if (!REENCODED.has(mimeType)) return { ok: false, reason: 'Este tipo de archivo no se procesa como imagen.' }

  try {
    // `animated` conserva las animaciones de WebP/AVIF; en JPEG/PNG no aplica.
    const animated = mimeType === 'image/webp' || mimeType === 'image/avif'
    let pipeline = sharp(buffer, { ...options, animated })
      .autoOrient() // aplica y retira la etiqueta Orientation antes de medir y redimensionar
      .resize({ width: MAX_LONG_SIDE, height: MAX_LONG_SIDE, fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
    // Sin withMetadata/keep*: sharp elimina EXIF/GPS/XMP/IPTC/ICC y entrega sRGB (node_modules/sharp/dist/index.d.mts:745).
    pipeline = encode(pipeline, mimeType)
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
    const pages = (info as { pages?: number; pageHeight?: number }).pages
    const pageHeight = (info as { pageHeight?: number }).pageHeight
    return {
      ok: true,
      data,
      mimeType,
      width: info.width,
      height: pages && pages > 1 && pageHeight ? pageHeight : info.height,
      changed: true,
    }
  } catch {
    return { ok: false, reason: CORRUPT }
  }
}
