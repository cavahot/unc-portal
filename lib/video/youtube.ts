// VIDEO-01 (S2): identificador de un video de YouTube a partir del enlace guardado en el CMS.
// Qué hace: misma regla que `apps/cms/src/utilities/youtube.ts`; el portal la repite porque no confía en lo guardado
//   (un dato alterado en la base no debe convertirse en un `iframe` hacia otro origen).
// Amenaza que evita: `iframe` con `javascript:` o hacia un dominio arbitrario. Límite: no comprueba que el video exista.
// La prueba `tests/unit/richtext-video-imagenes.spec.ts` exige que ambas reglas acepten y rechacen lo mismo.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

/** Identificador del video o `null` si el valor no es un enlace de video de YouTube. */
export function youTubeIdFromUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw || raw.length > 2048) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (!HOSTS.has(host)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  let id: string | null = null
  if (host === 'youtu.be') id = parts.length === 1 ? parts[0] : null
  else if (parts.length === 1 && parts[0] === 'watch') id = url.searchParams.get('v')
  else if (parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0])) id = parts[1]
  return id && VIDEO_ID.test(id) ? id : null
}

/**
 * URL de inserción en modo de privacidad mejorada (sin cookies hasta la reproducción). La arma el portal a partir del
 * identificador ya validado: nunca se usa el enlace guardado como `src`. Es el único origen de video que permite la CSP.
 */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}
