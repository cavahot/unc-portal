/**
 * MIG-IMG fase 1: validación de los bytes reales de un archivo subido a `media`.
 *
 * Qué hace: comprueba nombre, tamaño, firma («magic bytes») y coherencia entre el MIME declarado, la
 * extensión y el tipo detectado; para imágenes además lee los metadatos con sharp (rechaza firmas
 * válidas sin imagen decodificable). Devuelve el tipo detectado o el motivo del rechazo.
 *
 * Por qué existe: los archivos ahora se sirven desde el MISMO origen que el panel de administración.
 * Payload solo emite un aviso si el tipo no es detectable y acepta por extensión
 * (node_modules/payload/dist/uploads/checkFileRestrictions.js:297-321) y guarda el MIME declarado por
 * el cliente (generateFileData.js:173-178): un HTML o un script renombrado `.jpg`, un nombre con `../`
 * o una doble extensión como `a.php.jpg` pasarían. Se rechazan aquí, antes de escribir nada en disco.
 *
 * Límites: no detecta contenido malicioso dentro de una imagen válida (políglotas con imagen real) ni
 * revisa el contenido interno de PDF/DOC/DOCX (solo la firma; `PK` también es el de cualquier .zip).
 * La defensa final es servir los archivos con `X-Content-Type-Options: nosniff`. SVG no se admite.
 * Tarea: MIG-IMG (opción A). Evidencia: RDD-MIG-IMG-45 a 49.
 */
import sharp from 'sharp'

export type UploadCheck =
  | { ok: true; mimeType: string }
  | { ok: false; reason: string }

export interface UploadCheckInput {
  filename: string
  mimetype: string
  data: Buffer | Uint8Array
  /** Tope en bytes (MEDIA_MAX_BYTES): repite el de multipart porque la Local API no pasa por él. */
  maxBytes: number
}

/** Tipos admitidos: extensiones válidas y si el contenido es una imagen decodificable. */
const TYPES: Record<string, { exts: string[]; image: boolean }> = {
  'image/jpeg': { exts: ['jpg', 'jpeg'], image: true },
  'image/png': { exts: ['png'], image: true },
  'image/webp': { exts: ['webp'], image: true },
  'image/gif': { exts: ['gif'], image: true },
  'image/avif': { exts: ['avif'], image: true },
  'application/pdf': { exts: ['pdf'], image: false },
  'application/msword': { exts: ['doc'], image: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { exts: ['docx'], image: false },
}

/** Extensiones que, como parte intermedia del nombre, indican un intento de doble extensión ejecutable. */
const DANGEROUS_MIDDLE_EXTS = new Set([
  'php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'html', 'htm', 'xhtml', 'svg', 'xml', 'js', 'mjs', 'cjs',
  'jsp', 'asp', 'aspx', 'cgi', 'pl', 'py', 'rb', 'sh', 'bash', 'bat', 'cmd', 'exe', 'dll', 'jar', 'com', 'ps1',
])

/** Detecta el tipo por la firma. null = no reconocido. */
function detectMime(data: Uint8Array): string | null {
  const b = data
  const startsWith = (...bytes: number[]) => bytes.every((v, i) => b[i] === v)
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (startsWith(0x47, 0x49, 0x46, 0x38) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'image/gif'
  // RIFF....WEBP
  if (startsWith(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  // ISO-BMFF: ....ftyp + marca avif/avis
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11])
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
  }
  if (startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf'
  if (startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return 'application/msword'
  if (startsWith(0x50, 0x4b, 0x03, 0x04)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return null
}

/**
 * Valida el nombre: sin separadores, `..`, NUL ni controles; con extensión final y sin doble
 * extensión peligrosa. Devuelve la extensión (minúsculas) o el motivo del rechazo.
 */
function checkFilename(filename: string): { ok: true; ext: string } | { ok: false; reason: string } {
  if (typeof filename !== 'string' || filename.trim() === '') return { ok: false, reason: 'El archivo no tiene nombre.' }
  // Recorrido por código de carácter (en vez de regex) para detectar NUL y controles sin silenciar el linter.
  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return { ok: false, reason: 'El nombre del archivo contiene caracteres no válidos.' }
  }
  if (/[\\/]/.test(filename)) return { ok: false, reason: 'El nombre del archivo no puede contener rutas.' }
  if (filename.includes('..')) return { ok: false, reason: 'El nombre del archivo no es válido.' }
  const parts = filename.split('.')
  if (parts.length < 2 || parts[0] === '') return { ok: false, reason: 'El archivo debe tener nombre y extensión.' }
  const ext = parts[parts.length - 1].toLowerCase()
  if (ext === '') return { ok: false, reason: 'El archivo debe tener extensión.' }
  const middle = parts.slice(1, -1).map((p) => p.toLowerCase())
  if (middle.some((p) => DANGEROUS_MIDDLE_EXTS.has(p))) {
    return { ok: false, reason: 'El nombre del archivo tiene una doble extensión no permitida.' }
  }
  return { ok: true, ext }
}

/**
 * Valida un archivo subido. Nunca lanza por contenido inválido: devuelve `{ ok: false, reason }` con un
 * texto genérico (sin eco del contenido ni de rutas) que el hook convierte en un 400.
 */
export async function validateUploadFile(input: UploadCheckInput): Promise<UploadCheck> {
  const { filename, mimetype, data, maxBytes } = input
  const name = checkFilename(filename)
  if (!name.ok) return name
  if (!data || data.length === 0) return { ok: false, reason: 'El archivo está vacío.' }
  if (data.length > maxBytes) return { ok: false, reason: 'El archivo supera el tamaño máximo permitido.' }

  const declared = typeof mimetype === 'string' ? mimetype.trim().toLowerCase() : ''
  const spec = TYPES[declared]
  if (!spec) return { ok: false, reason: 'Tipo de archivo no permitido.' }

  const detected = detectMime(data)
  if (detected !== declared) return { ok: false, reason: 'El contenido del archivo no coincide con su tipo declarado.' }
  if (!spec.exts.includes(name.ext)) return { ok: false, reason: 'La extensión del archivo no coincide con su contenido.' }

  if (spec.image) {
    try {
      const meta = await sharp(Buffer.from(data)).metadata()
      if (!meta.width || !meta.height) return { ok: false, reason: 'La imagen no se pudo leer.' }
    } catch {
      return { ok: false, reason: 'La imagen está dañada o no se pudo leer.' }
    }
  }
  return { ok: true, mimeType: detected }
}
