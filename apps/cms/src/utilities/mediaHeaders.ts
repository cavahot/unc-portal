/**
 * MIG-IMG fase 2a (spec §7.2 y §16.6.4): cabeceras de seguridad al servir `GET /api/media/file/*`.
 *
 * Qué hace: se usa como `upload.modifyResponseHeaders` de `media`. Payload la llama después de fijar
 * `Content-Type`, `Content-Length` y `Accept-Ranges` (node_modules/payload/dist/uploads/endpoints/getFile.js:
 * 106-137, y también en la respuesta 416 de rango inválido, getFile.js:92-104). Agrega:
 *   - `X-Content-Type-Options: nosniff`: el navegador no «adivina» HTML/script en un archivo mal tipado.
 *   - `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox`:
 *     aunque un archivo se abriera como documento, queda en un origen opaco, sin scripts, formularios ni
 *     acceso a las cookies del panel (mismo origen que `/admin`). `img-src`/`style-src` solo permiten que el
 *     visor de imágenes del navegador muestre la propia imagen.
 *   - `Cache-Control: public, max-age=86400` en imágenes (sin `immutable`: el nombre puede reutilizarse tras
 *     borrar); el optimizador del portal respeta ese max-age.
 *
 * Por qué existe: Payload solo agrega `script-src 'none'` a los SVG (getFile.js:109-111) y nada a los demás.
 * Límites: (1) los PDF no llevan `sandbox`, porque el visor de PDF de Chrome/Edge no se abre en un documento
 * con sandbox; reciben `nosniff`. (2) Con `MEDIA_STORAGE=s3` el plugin responde antes (getFile.js:27-46) y
 * estas cabeceras NO se aplican: el bucket/CDN debe fijarlas. (3) No reemplaza la validación de bytes.
 * Tarea: MIG-IMG fase 2a. Evidencia: RDD-MIG-IMG-58 y 59.
 */

export const MEDIA_FILE_CSP = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"

/** Aplica las cabeceras de seguridad sobre las que ya puso Payload y devuelve el mismo objeto. */
export function applyMediaFileHeaders({ headers }: { headers: Headers }): Headers {
  const type = (headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase()
  headers.set('X-Content-Type-Options', 'nosniff')
  if (type !== 'application/pdf') {
    headers.set('Content-Security-Policy', MEDIA_FILE_CSP)
  }
  if (type.startsWith('image/')) {
    headers.set('Cache-Control', 'public, max-age=86400')
  }
  return headers
}
