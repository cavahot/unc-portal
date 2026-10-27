// MAP-01: constructor de las URLs de Google Maps del campus (embed, cómo llegar, abrir).
// Spec: docs/specs/portal/CAMPUS-MAP.md. No hay coordenadas verificadas: el lugar se resuelve por texto.
import { safeHref } from '@/lib/security/safeUrl'

/** Consulta por texto (nombre + dirección confirmada). Constante: nunca se arma con entrada externa. */
export const CAMPUS_MAP_QUERY =
  'Universidad Nacional de Concepción, Ruta PY05 Km 210, Concepción, Paraguay'

const GOOGLE_ORIGIN = 'https://www.google.com'

/**
 * Indica si un valor es una URL https de Google Maps con host exacto `www.google.com`,
 * sin credenciales ni puerto y con ruta bajo `/maps`.
 *
 * Amenaza que evita: un iframe/enlace hacia otro origen (typosquatting como
 * `www.google.com.evil.com`, `user@host`, http plano) por un cambio futuro de la constante.
 * Límite: no comprueba que Google siga sirviendo ese formato ni que el destino sea confiable
 * más allá del host.
 */
export function isAllowedGoogleMapsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || safeHref(value) === '#') return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    url.host === 'www.google.com' &&
    !url.username &&
    !url.password &&
    (url.pathname === '/maps' || url.pathname.startsWith('/maps/'))
  )
}

/** Valida el resultado construido; si la allowlist falla es un error de programación, no de usuario. */
function assertAllowed(url: string): string {
  if (!isAllowedGoogleMapsUrl(url)) throw new Error('URL de mapa fuera de la allowlist')
  return url
}

/**
 * URL del iframe (formato de inserción sin clave: `maps?q=…&output=embed`).
 * Sin parámetros a propósito: no existe entrada de usuario que pueda alterar el destino.
 * Se omite `t=k` (satélite) porque no está documentado oficialmente.
 */
export function buildCampusEmbedUrl(): string {
  return assertAllowed(`${GOOGLE_ORIGIN}/maps?q=${encodeURIComponent(CAMPUS_MAP_QUERY)}&z=16&output=embed`)
}

/** Enlace "Cómo llegar" (Maps URLs oficial: `dir/?api=1&destination=`). Sin parámetros, ver arriba. */
export function buildCampusDirectionsUrl(): string {
  return assertAllowed(`${GOOGLE_ORIGIN}/maps/dir/?api=1&destination=${encodeURIComponent(CAMPUS_MAP_QUERY)}`)
}

/** Enlace "Abrir en Google Maps" (Maps URLs oficial: `search/?api=1&query=`). Sin parámetros. */
export function buildCampusOpenUrl(): string {
  return assertAllowed(`${GOOGLE_ORIGIN}/maps/search/?api=1&query=${encodeURIComponent(CAMPUS_MAP_QUERY)}`)
}
