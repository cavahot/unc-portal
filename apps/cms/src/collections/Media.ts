import type { CollectionConfig, FieldAccess } from 'payload'
import sharp from 'sharp'
import { canWriteMedia, canDeleteMedia } from '../access/roles'
import { resolveMaxBytes, resolveMediaStorage } from '../config/mediaStorage'
import { enforceMediaProvenance, prepareMediaUpload } from '../hooks/media/uploadPipeline'
import { MAX_LONG_SIDE } from '../utilities/imageNormalize'
import { applyMediaFileHeaders } from '../utilities/mediaHeaders'
import { SOURCE_PATH_MAX, validateSourcePath } from '../utilities/mediaProvenance'

// MIG-IMG fase 1: destino de los archivos decidido de forma explícita (MEDIA_STORAGE). Con 's3' el
// plugin gestiona el almacenamiento y `staticDir` no se usa; con 'local' es el volumen persistente.
const storage = resolveMediaStorage(process.env)

/** Tope de subida en MiB para el texto de ayuda del panel (mismo valor que aplica el servidor). */
const maxMiB = Math.round((resolveMaxBytes(process.env) / (1024 * 1024)) * 10) / 10

/** Longitud máxima del texto alternativo: suficiente para describir una foto sin volverse un párrafo. */
const ALT_MAX = 300

/**
 * MIG-IMG fase 2a: valida `alt` (texto alternativo). Qué hace: exige texto real (no solo espacios), hasta
 * 300 caracteres y sin `<`/`>`. Por qué: es lo que leen los lectores de pantalla y lo que se inserta en los
 * atributos `alt` del portal; se RECHAZA el marcado en lugar de escaparlo para que el editor vea el problema.
 * Límite: no evalúa si la descripción es buena (eso es criterio editorial).
 */
export function validateAlt(value: unknown): true | string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return 'Escriba una descripción de la imagen (texto alternativo).'
  if (text.length > ALT_MAX) return `La descripción no puede superar ${ALT_MAX} caracteres.`
  if (/[<>]/.test(text)) return 'La descripción no puede contener los caracteres < ni >.'
  return true
}

/**
 * SEC-REVIEW: lectura por campo de la procedencia (sha256, sourcePath). Qué hace: solo roles con escritura de medios
 * ven estos campos. Amenaza que evita: la colección es pública (`read: () => true`) y REST/GraphQL anónimos
 * revelarían la huella del original y rutas internas del lote de origen. Límite: el archivo y `alt` siguen públicos;
 * un rol con escritura de medios sí ve ambos campos.
 */
const canReadProvenance: FieldAccess = (args) => canWriteMedia(args as never) === true

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo de medios', plural: 'Medios' },
  admin: {
    // MIG-IMG fase 2a: lo que el editor debe saber ANTES de subir (formatos, tope y lo que hace el servidor).
    description:
      `Formatos: JPEG, PNG, WebP, AVIF y GIF (imágenes); PDF, DOC y DOCX (documentos). Tamaño máximo: ${maxMiB} MiB ` +
      `por archivo. Las fotos se reducen automáticamente a ${MAX_LONG_SIDE} px en su lado más largo, se enderezan ` +
      'según la orientación de la cámara y se eliminan sus metadatos (EXIF, ubicación GPS, datos del teléfono). ' +
      'Si la misma imagen ya existe, el sistema lo indica con su ID para que la reutilice.',
  },
  access: {
    read: () => true,
    create: canWriteMedia,
    update: canWriteMedia,
    delete: canDeleteMedia,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texto alternativo',
      required: true,
      maxLength: ALT_MAX,
      validate: validateAlt,
      admin: {
        description:
          'Describe la imagen para personas que usan lector de pantalla (qué se ve y por qué importa). ' +
          'Ejemplo: «Estudiantes de Enfermería en el laboratorio de simulación». Máximo 300 caracteres.',
      },
    },
    {
      name: 'blurDataURL',
      type: 'text',
      label: 'Vista previa difuminada',
      admin: {
        readOnly: true,
        description: 'Placeholder de blur generado automáticamente para Next.js Image.',
        condition: (_, siblingData) => Boolean(siblingData?.url),
      },
    },
    {
      // MIG-IMG fase 2a: huella del archivo ORIGINAL subido (ver utilities/mediaProvenance.ts). La fija el
      // hook `enforceMediaProvenance`; cualquier valor enviado por un cliente se descarta. Único: impide
      // dos filas con los mismos bytes (Postgres admite varios NULL en un índice único: filas anteriores).
      name: 'sha256',
      type: 'text',
      label: 'Huella SHA-256 del original',
      unique: true,
      index: true,
      access: { read: canReadProvenance },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Calculada por el servidor al subir. Sirve para detectar subidas repetidas.',
      },
    },
    {
      // MIG-IMG fase 2a: ruta relativa del archivo en el lote de origen (cargador masivo). Opcional.
      name: 'sourcePath',
      type: 'text',
      label: 'Ruta de origen',
      maxLength: SOURCE_PATH_MAX,
      access: { read: canReadProvenance },
      validate: (value: unknown) => validateSourcePath(value),
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Solo para cargas masivas (por ejemplo, 2024/05/foto.jpg). Vacío en subidas desde el panel.',
      },
    },
  ],
  upload: {
    // MIG-IMG fase 1: directorio de archivos (volumen persistente en producción). Solo en modo local.
    ...(storage.mode === 'local' ? { staticDir: storage.staticDir } : {}),
    // MIG-IMG fase 1: sin el tipo SVG (el MIME de imagen vectorial). Un SVG puede llevar script y se serviría desde el mismo
    // origen que el panel (XSS almacenado). Reactivarlo exige sanitizar y servir con `sandbox` (decisión del PO).
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    // MIG-IMG fase 2a: nosniff + CSP sandbox al servir /api/media/file/* (utilities/mediaHeaders.ts).
    // A propósito SIN imageSizes, resizeOptions, formatOptions ni prefix: la normalización la hace
    // `prepareMediaUpload` por formato, y `prefix`/tamaños derivados cambiarían el esquema al pasar a S3 (§4.1).
    modifyResponseHeaders: applyMediaFileHeaders,
  },
  hooks: {
    // MIG-IMG: acceso temprano, guardia de bytes, sha256 + 409 por duplicado y normalización de imágenes,
    // todo ANTES de que Payload mida y escriba el archivo (ver hooks/media/uploadPipeline.ts).
    beforeOperation: [prepareMediaUpload],
    beforeChange: [
      enforceMediaProvenance,
      async ({ data, req }) => {
        // Placeholder de blur (8x8 webp) para las imágenes subidas; opcional, nunca bloquea la subida.
        // Aquí `req.file` ya es la versión normalizada (Payload la reasigna en generateFileData.js:285-289).
        const file = (req as { file?: { data?: Buffer; mimetype?: string } }).file
        if (file?.data && file.mimetype?.startsWith('image/')) {
          try {
            const tiny = await sharp(file.data)
              .resize(8, 8, { fit: 'cover' })
              .webp({ quality: 50 })
              .toBuffer()
            data.blurDataURL = `data:image/webp;base64,${tiny.toString('base64')}`
          } catch {
            // blur is optional — skip on failure
          }
        }
        return data
      },
    ],
  },
}
