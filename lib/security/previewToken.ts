import { createHmac } from 'node:crypto'
import { safeEqual } from './safeEqual'
import { isStrongSecret } from './secrets'

/**
 * DEP-16 (RDD-DEP-40): verificación del token de preview firmado (lado portal).
 *
 * Formato: `base64url(JSON {s: slug, t: tipo, e: exp en segundos}) + '.' + base64url(HMAC-SHA256)`.
 * La firma cubre exactamente la primera parte (tal como viaja). El CMS firma
 * (`apps/cms/src/utilities/previewToken.ts`, misma construcción); el portal solo verifica.
 * Amenaza: secreto de larga vida en la URL (historial, logs de nginx, Referer) y reutilización del
 * enlace para otro slug. El token vive poco, está atado a un slug/tipo y no revela el secreto.
 * Límite: es un bearer token: quien lo obtenga puede usarlo durante su vida (≤ 15 min aquí, 5 min
 * emitido); no hay lista de revocación ni uso único. Habilitar draftMode no da acceso a datos:
 * los borradores los sigue decidiendo el CMS con la cookie del editor (DEP-02b).
 */

/** Vida máxima aceptada al verificar, aunque la firma sea válida (defensa ante un firmante mal configurado). */
export const MAX_PREVIEW_TTL_SECONDS = 15 * 60

export type PreviewClaims = { slug: string; type: 'noticia' | 'page' }

const b64url = (buffer: Buffer): string => buffer.toString('base64url')

/**
 * Devuelve {slug, type} si el token es auténtico, no expiró y su vida restante no excede el máximo.
 * En cualquier otro caso devuelve null (sin distinguir causa, para no dar un oráculo).
 * `nowMs` es inyectable para pruebas.
 */
export function verifyPreviewToken(
  token: string | null | undefined,
  secret: string | null | undefined,
  nowMs: number = Date.now(),
): PreviewClaims | null {
  if (typeof token !== 'string' || !isStrongSecret(secret)) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const [payload, signature] = parts
  const expected = b64url(createHmac('sha256', (secret as string).trim()).update(payload).digest())
  if (!safeEqual(signature, expected)) return null

  let claims: { s?: unknown; t?: unknown; e?: unknown }
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof claims.s !== 'string' || (claims.t !== 'noticia' && claims.t !== 'page') || typeof claims.e !== 'number') {
    return null
  }
  const remaining = claims.e - Math.floor(nowMs / 1000)
  if (remaining <= 0 || remaining > MAX_PREVIEW_TTL_SECONDS) return null
  return { slug: claims.s, type: claims.t }
}
