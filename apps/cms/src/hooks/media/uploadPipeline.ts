/**
 * MIG-IMG fase 2a: tubería de subida de `media` (capa ANTES de guardar).
 *
 * Orden verificado en Payload 3.87.1 (create y updateByID):
 *   beforeOperation (aquí)        node_modules/payload/dist/collections/operations/create.js:37-42
 *   → access.create/update         create.js:70-75 · updateByID.js:42
 *   → generateFileData             create.js:79-92 · updateByID.js:98 (mide, decide MIME y nombre, prepara
 *                                   la escritura con los bytes de `req.file`)
 *   → beforeChange (colección)     create.js:121-135
 *   → escritura en staticDir       create.js:170 (uploadFiles) y db.create (create.js:194)
 * Por eso la normalización va en beforeOperation: es el único punto con `req.file` disponible ANTES de que
 * Payload calcule `filesize`/`width`/`height`/`mimeType` (generateFileData.js:146-187) y escriba el archivo.
 *
 * `prepareMediaUpload` (beforeOperation):
 *   1. Anónimo o rol sin permiso de media → 403 inmediato. Amenaza: beforeOperation corre ANTES del access
 *      de Payload; sin esto un anónimo haría decodificar 10 MiB y consultar la BD (CPU/DoS, sondeo de hash).
 *      Con `overrideAccess` (scripts de servidor por Local API) se respeta la decisión del llamador.
 *   2. Guardia de bytes de fase 1 (`validateUploadFile`): nombre, firma, MIME, extensión, tope → 400.
 *   3. sha256 del ORIGINAL → `req.context`; si otro documento ya tiene ese hash → 409 con su ID (no se
 *      crea un segundo archivo ni fila). La subida idéntica es un error explícito, no una operación
 *      silenciosa, para que el editor sepa que debe reutilizar la imagen existente.
 *   4. Imágenes: `normalizeImage` (decodificación completa, orientación, 2560 px, sin metadatos, sRGB) y
 *      reemplazo de `req.file.data/size/mimetype`. Imagen dañada → 400.
 * `enforceMediaProvenance` (beforeChange): el sha256 lo fija SOLO el servidor (se ignora el del cliente).
 *
 * Límites: el 409 previo no cubre dos subidas idénticas simultáneas: allí decide el índice único de la BD
 * (la segunda falla con un error de validación de Payload). Los PDF/DOC/DOCX solo pasan por la guardia de
 * bytes y el hash (no se normalizan). Tarea: MIG-IMG fase 2a. Evidencia: RDD-MIG-IMG-50 a 57.
 */
import { APIError, Forbidden } from 'payload'
import type { CollectionBeforeChangeHook, CollectionBeforeOperationHook, Where } from 'payload'
import { canWriteMedia } from '../../access/roles'
import { resolveMaxBytes } from '../../config/mediaStorage'
import { normalizeImage } from '../../utilities/imageNormalize'
import { isSha256Hex, normalizeSourcePath, sha256Hex } from '../../utilities/mediaProvenance'
import { validateUploadFile } from '../../utilities/uploadGuard'

/** Clave de `req.context` donde viaja el sha256 del original entre beforeOperation y beforeChange. */
export const MEDIA_SHA256_CONTEXT_KEY = 'migImgUploadSha256'

type UploadFile = { data?: Buffer; mimetype?: string; name?: string; size?: number }

/** Mensaje del 409: en español, con el ID existente para que el editor (o el cargador) lo reutilice. */
function duplicateMessage(id: unknown): string {
  return `Esta imagen ya está en la biblioteca de medios (ID ${String(id)}). Use la existente en lugar de subirla de nuevo.`
}

export const prepareMediaUpload: CollectionBeforeOperationHook = async ({ args, operation, overrideAccess, req }) => {
  if (operation !== 'create' && operation !== 'update') return args
  // Un hash de una operación anterior con el mismo `req` no debe aplicarse a esta.
  if (req.context) delete (req.context as Record<string, unknown>)[MEDIA_SHA256_CONTEXT_KEY]

  const file = (req as { file?: UploadFile }).file
  if (!file?.data) return args

  if (!overrideAccess && !(await canWriteMedia({ req } as Parameters<typeof canWriteMedia>[0]))) {
    throw new Forbidden(req.t)
  }

  const check = await validateUploadFile({
    filename: file.name ?? '',
    mimetype: file.mimetype ?? '',
    data: file.data,
    maxBytes: resolveMaxBytes(process.env),
  })
  if (!check.ok) throw new APIError(check.reason, 400, undefined, true)
  file.mimetype = check.mimeType

  const sha256 = sha256Hex(file.data)
  const ownId = (args as { id?: number | string }).id
  const byHash: Where = { sha256: { equals: sha256 } }
  const where: Where = operation === 'update' && ownId !== undefined ? { and: [byHash, { id: { not_equals: ownId } }] } : byHash
  const existing = await req.payload.find({
    collection: 'media',
    where,
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true, // la lectura de media ya es pública; aquí solo se compara el hash
    req,
  })
  const dup = existing.docs[0] as { id?: unknown; filename?: unknown } | undefined
  if (dup) {
    throw new APIError(duplicateMessage(dup.id), 409, { id: dup.id, filename: dup.filename }, true)
  }

  if (check.mimeType.startsWith('image/')) {
    const result = await normalizeImage({ data: file.data, mimeType: check.mimeType })
    if (!result.ok) throw new APIError(result.reason, 400, undefined, true)
    file.data = result.data
    file.size = result.data.length
    file.mimetype = result.mimeType
  }

  // Se escribe en `req.context` AL FINAL y sin guardar una referencia previa: la Local API (`payload.find`
  // con `req`, arriba) REEMPLAZA `req.context` por un objeto nuevo (node_modules/payload/dist/utilities/
  // createLocalReq.js:5-18). Con una referencia vieja el hash se perdía y beforeChange guardaba NULL
  // (hallazgo en vivo 2026-10-24: dos subidas idénticas daban 201).
  ;((req.context ??= {}) as Record<string, unknown>)[MEDIA_SHA256_CONTEXT_KEY] = sha256
  return args
}

/**
 * Fija `sha256` desde el servidor y normaliza `sourcePath`. Con archivo nuevo: hash del original calculado
 * en `prepareMediaUpload`. Edición sin archivo: conserva el valor previo. Alta sin archivo propio (p. ej.
 * «Duplicar» en el panel): NULL, para no chocar con el índice único ni copiar una procedencia ajena.
 */
export const enforceMediaProvenance: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const hash = (req.context as Record<string, unknown> | undefined)?.[MEDIA_SHA256_CONTEXT_KEY]
  if (isSha256Hex(hash)) {
    data.sha256 = hash
  } else if (operation === 'update') {
    const previous = (originalDoc as { sha256?: unknown } | undefined)?.sha256
    data.sha256 = isSha256Hex(previous) ? previous : null
  } else {
    data.sha256 = null
  }
  if ('sourcePath' in data) data.sourcePath = normalizeSourcePath(data.sourcePath)
  return data
}
