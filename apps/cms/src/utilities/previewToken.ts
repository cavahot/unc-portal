import { createHmac } from 'node:crypto'

import { isStrongSecret } from '../config/secrets'

/**
 * DEP-16 (RDD-DEP-40): firma del token de preview (solo servidor del CMS).
 *
 * Formato idéntico al que verifica `lib/security/previewToken.ts` del portal:
 * `base64url(JSON {s, t, e}) + '.' + base64url(HMAC-SHA256(PREVIEW_SECRET, primera parte))`.
 * Amenaza: el enlace de live preview llevaba `PREVIEW_SECRET` crudo en la query. Aquí solo viaja
 * un token de vida corta atado a un slug y tipo.
 * Límite: este módulo debe importarse únicamente desde código que corre en el servidor (la función
 * `livePreview.url` de Payload se ejecuta en el servidor, ver spec DEP-16 §D); importarlo desde un
 * componente cliente expondría la lógica, aunque no el secreto (se lee de process.env en servidor).
 */

/** Vida emitida del token: 5 minutos (el portal acepta hasta 15 al verificar). */
export const PREVIEW_TTL_SECONDS = 5 * 60

/** Mismo patrón de slug que valida el portal en /api/preview (defensa en profundidad). */
export const PREVIEW_SLUG_RE = /^[a-z0-9][a-z0-9-/]{0,120}$/

export type PreviewClaims = { slug: string; type: 'noticia' | 'page' }

/**
 * Firma un token para `claims`. Lanza si el secreto es débil o el slug no cumple el patrón, para
 * que nunca se emita un enlace que el portal rechazaría o firmado con un secreto trivial.
 * `nowMs` y `ttlSeconds` son inyectables para pruebas.
 */
export function signPreviewToken(
  claims: PreviewClaims,
  secret: string | undefined | null,
  nowMs: number = Date.now(),
  ttlSeconds: number = PREVIEW_TTL_SECONDS,
): string {
  if (!isStrongSecret(secret)) throw new Error('PREVIEW_SECRET no está configurado con un secreto válido.')
  if (!PREVIEW_SLUG_RE.test(claims.slug)) throw new Error('Slug de preview inválido.')
  const payload = Buffer.from(
    JSON.stringify({ s: claims.slug, t: claims.type, e: Math.floor(nowMs / 1000) + ttlSeconds }),
  ).toString('base64url')
  const signature = createHmac('sha256', (secret as string).trim()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}
