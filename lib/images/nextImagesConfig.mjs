// MIG-IMG fase 2a (spec §7 «Portal next.config.mjs» y §17): configuración de `next/image` del portal.
//
// Qué hace: construye `images` de next.config a partir del entorno: qué hosts y rutas puede pedir el
// optimizador `/_next/image` y si puede conectarse a IP locales. Es un módulo puro (recibe `env`) para
// probarlo sin arrancar Next; next.config.mjs y lib/csp.ts lo comparten para que la lista no se desalinee.
//
// Por qué existe:
//   - Next 16 rechaza optimizar imágenes cuyo host resuelve a una IP privada/local («"url" parameter is not
//     allowed», node_modules/next/dist/server/image-optimizer.js:895-921) salvo `dangerouslyAllowLocalIP`
//     (config-schema.js:610; por defecto false, shared/lib/image-config.js:64). En desarrollo el CMS está en
//     localhost:3002, así que se activa SOLO fuera de producción.
//   - `remotePatterns` con `pathname: '/**'` convertía el optimizador en un proxy hacia cualquier ruta del
//     CMS o del sitio WordPress. Ahora: CMS solo `/api/media/file/**`; WordPress solo `/wp-content/uploads/**`.
//
// Amenazas que evita: SSRF del optimizador hacia la red interna en producción (Docker, servicios del VPS,
// metadatos de nube); uso del optimizador como proxy abierto o consumidor de CPU con hosts arbitrarios.
// Límites: (1) `remotePatterns` se congela al CONSTRUIR (`next build`) y el Dockerfile del portal no recibe
// NEXT_PUBLIC_CMS_URL como build-arg: por eso, en producción sin variable, se usa el host canónico
// `https://cms.unc.edu.py` (nginx server_name del CMS). Si el dominio cambia, pasar NEXT_PUBLIC_CMS_URL al
// build. (2) Con `dangerouslyAllowLocalIP: false`, si el host público del CMS resolviera a una IP privada
// desde el contenedor del portal (DNS interno), Next también lo rechazaría.

/** Origen del CMS en desarrollo cuando NEXT_PUBLIC_CMS_URL no está definida (igual que lib/cms/mediaUrl.ts). */
export const DEV_CMS_ORIGIN = 'http://localhost:3002'
/** Host público canónico del CMS en producción (infrastructure/nginx/nginx.conf, server cms.unc.edu.py). */
export const PROD_CMS_ORIGIN_DEFAULT = 'https://cms.unc.edu.py'
/** Única ruta del CMS que el optimizador puede pedir: los archivos de `media`. */
export const MEDIA_FILE_PATHNAME = '/api/media/file/**'

/** Nombre de host DNS simple (sin esquema, puerto, ruta ni comodines). */
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i

/**
 * Origen público del CMS (solo esquema://host[:puerto]) o null si no es seguro usarlo.
 * Desarrollo: NEXT_PUBLIC_CMS_URL o localhost:3002. Producción: NEXT_PUBLIC_CMS_URL solo si es https;
 * sin variable, el host canónico. Una variable inválida o http en producción da null (falla cerrada).
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function cmsPublicOrigin(env) {
  const isProduction = env.NODE_ENV === 'production'
  const raw = typeof env.NEXT_PUBLIC_CMS_URL === 'string' ? env.NEXT_PUBLIC_CMS_URL.trim() : ''
  if (raw === '') return isProduction ? PROD_CMS_ORIGIN_DEFAULT : DEV_CMS_ORIGIN
  try {
    const url = new URL(raw)
    if (url.username || url.password) return null
    if (url.protocol === 'https:') return url.origin
    if (url.protocol === 'http:' && !isProduction) return url.origin
    return null
  } catch {
    return null
  }
}

/**
 * Patrón de `remotePatterns` para un origen, con el puerto exacto ('' = puerto por defecto; Next solo
 * ignora el puerto si el patrón no lo define, match-remote-pattern.js).
 * @param {string} origin
 * @param {string} pathname
 */
function patternFor(origin, pathname) {
  const url = new URL(origin)
  return { protocol: url.protocol.replace(/:$/, ''), hostname: url.hostname, port: url.port, pathname }
}

/**
 * Configuración `images` de next.config.
 * @param {Record<string, string | undefined>} env
 */
export function buildImagesConfig(env) {
  const isProduction = env.NODE_ENV === 'production'
  /** @type {Array<{ protocol: string, hostname: string, port?: string, pathname: string }>} */
  const remotePatterns = []

  const cms = cmsPublicOrigin(env)
  if (cms) remotePatterns.push(patternFor(cms, MEDIA_FILE_PATHNAME))

  if (!isProduction) {
    // CMS local por ambas formas de escribir localhost, y el almacén S3 local (SeaweedFS en 9100, perfil s3 en dev).
    for (const origin of ['http://localhost:3002', 'http://127.0.0.1:3002']) {
      if (origin !== cms) remotePatterns.push(patternFor(origin, MEDIA_FILE_PATHNAME))
    }
    remotePatterns.push(
      { protocol: 'http', hostname: 'localhost', port: '9100', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9100', pathname: '/**' },
    )
  }

  // Almacenamiento de objetos / CDN (MEDIA_STORAGE=s3): solo https y un host DNS válido.
  const mediaHost = typeof env.MEDIA_HOSTNAME === 'string' ? env.MEDIA_HOSTNAME.trim().toLowerCase() : ''
  if (HOSTNAME.test(mediaHost)) {
    remotePatterns.push({ protocol: 'https', hostname: mediaHost, port: '', pathname: '/**' })
  }

  // WordPress original: respaldo transitorio (featuredImageUrl) solo en su carpeta de subidas.
  remotePatterns.push({ protocol: 'https', hostname: 'www.unc.edu.py', port: '', pathname: '/wp-content/uploads/**' })
  // Banderas de los selectores de idioma.
  remotePatterns.push({ protocol: 'https', hostname: 'flagcdn.com', port: '', pathname: '/**' })

  return {
    formats: /** @type {Array<'image/avif' | 'image/webp'>} */ (['image/avif', 'image/webp']),
    qualities: [75, 92],
    remotePatterns,
    // Solo en desarrollo: el CMS local resuelve a 127.0.0.1/::1. Nunca en producción (SSRF).
    ...(isProduction ? {} : { dangerouslyAllowLocalIP: true }),
  }
}
