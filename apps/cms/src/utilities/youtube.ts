// VIDEO-01: regla única para aceptar un enlace de video de YouTube en el CMS (spec: docs/specs/portal/VIDEO-YOUTUBE-IMAGENES-CUERPO.md, S1).
// Qué hace: extrae el identificador de 11 caracteres de las formas de URL que usa YouTube y rechaza todo lo demás.
// Por qué existe: el portal incrusta el video en un `iframe`; aceptar texto libre permitiría guardar un destino arbitrario.
// Amenaza que evita: `iframe` hacia otro origen o con `javascript:`; dominios parecidos (`youtube.com.otro.com`).
// Límite: no comprueba que el video exista ni que sea público. El portal repite la misma regla en `lib/video/youtube.ts`
//   (no confía en lo guardado); la prueba `tests/unit/richtext-video-imagenes.spec.ts` exige que ambas coincidan.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

export const YOUTUBE_URL_MESSAGE =
  'Pegue el enlace de un video de YouTube (por ejemplo, https://www.youtube.com/watch?v=…).'

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

/** Validación del campo `url` del bloque: `true` o el mensaje para quien edita. */
export function validateYouTubeUrl(value: unknown): true | string {
  return youTubeIdFromUrl(value) ? true : YOUTUBE_URL_MESSAGE
}
