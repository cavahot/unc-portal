// AUT-01 (base de MIG-IMG §7.4): convierte `media.url` del CMS en una URL absoluta y segura.
// Spec: docs/specs/migration/MIG-IMG-imagenes-de-noticias.md §7.4 y P-09.

type Env = { [key: string]: string | undefined }

/** Origen público del CMS en desarrollo, cuando NEXT_PUBLIC_CMS_URL no está definida. */
const DEV_CMS_ORIGIN = 'http://localhost:3002'

/** Nombre de archivo permitido tras /api/media/file/: sin barras, sin `?`/`#`, sin `\`. */
const MEDIA_PATH = /^\/api\/media\/file\/[A-Za-z0-9._~%-]+$/

/**
 * Origen público del CMS a partir de NEXT_PUBLIC_CMS_URL (solo el origen: se descartan ruta, query y
 * credenciales). Sin variable: localhost:3002 fuera de producción y `null` en producción (falla cerrada:
 * mejor sin foto que con una URL inventada). Variable inválida o no http(s): `null`.
 */
function cmsOrigin(env: Env): string | null {
  const raw = env.NEXT_PUBLIC_CMS_URL?.trim()
  if (!raw) return env.NODE_ENV === 'production' ? null : DEV_CMS_ORIGIN
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

/** true si el nombre de archivo, ya decodificado, no puede escapar de /api/media/file/. */
function hasSafeFilename(pathname: string): boolean {
  const name = pathname.slice('/api/media/file/'.length)
  try {
    const decoded = decodeURIComponent(name)
    return decoded !== '' && decoded !== '.' && decoded !== '..' && !/[/\\\u0000-\u001f]/.test(decoded)
  } catch {
    return false // `%` mal formado
  }
}

/**
 * Devuelve la URL absoluta de un archivo de `media` o `null` si no es seguro mostrarlo.
 *
 * Qué hace: acepta (a) la ruta relativa que genera Payload con almacenamiento local
 * (`/api/media/file/<archivo>`) y le antepone el origen público del CMS; (b) la misma ruta absoluta
 * si ya apunta al origen del CMS; (c) una URL https del host `MEDIA_HOSTNAME` (almacenamiento S3 /
 * CDN, el mismo host que `next.config.mjs` permite a `next/image`). Todo lo demás da `null`.
 *
 * Por qué: con `media.url` relativa, `next/image` y los `href` la resolverían contra el origen del
 * PORTAL (404). Amenazas que evita: `javascript:`/`data:`, `//host`, rutas fuera de /api/media/file/,
 * `..` (también codificado) y hosts arbitrarios, que convertirían al optimizador de imágenes en
 * proxy abierto o abrirían un destino de redirección. Límites: valida la forma, no que el archivo
 * exista ni su contenido; en producción exige NEXT_PUBLIC_CMS_URL (si falta, no hay foto).
 * `env` es inyectable para pruebas.
 */
export function resolveMediaUrl(url: unknown, env: Env = process.env): string | null {
  if (typeof url !== 'string') return null
  const value = url.trim()
  if (value === '' || value.length > 2048) return null

  const origin = cmsOrigin(env)

  if (value.startsWith('/')) {
    if (origin === null || !MEDIA_PATH.test(value) || !hasSafeFilename(value)) return null
    return `${origin}${value}`
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) return null
  // Una ruta con `..` se normaliza en `new URL`; se compara con el texto original para detectarla.
  if (/\/\.\.?(\/|$)/.test(value) || /%2e|%2f|%5c/i.test(value)) return null

  if (origin !== null && parsed.origin === origin) {
    return MEDIA_PATH.test(parsed.pathname) && hasSafeFilename(parsed.pathname) ? `${origin}${parsed.pathname}` : null
  }

  const mediaHost = env.MEDIA_HOSTNAME?.trim().toLowerCase()
  if (mediaHost && parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === mediaHost) {
    return `${parsed.origin}${parsed.pathname}`
  }
  return null
}
