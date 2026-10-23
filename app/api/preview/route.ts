import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { getClientIp } from '@/lib/security/clientIp'
import { verifyPreviewToken } from '@/lib/security/previewToken'
import { createRateLimiter, tooManyRequests } from '@/lib/security/rateLimit'
import { readStrongSecret } from '@/lib/security/secrets'

// DEP-06 / RDD-DEP-14: 20 intentos por minuto por IP confiable (x-real-ip de nginx).
// Amenaza: fuerza bruta del token de preview. El límite va ANTES de verificar la firma.
// Límite: store en memoria por instancia; no es autenticación.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 })

const SLUG_RE = /^[a-z0-9][a-z0-9-/]{0,120}$/

export async function GET(request: NextRequest) {
  const rate = limiter.check(getClientIp(request.headers))
  if (!rate.allowed) {
    return tooManyRequests(rate, 'Too many requests')
  }

  // DEP-16/B: sin PREVIEW_SECRET fuerte no se puede verificar nada: 503 genérico (el log solo
  // nombra la variable). Se evalúa antes que el token para no dar pistas del motivo.
  const secret = readStrongSecret('PREVIEW_SECRET', process.env.PREVIEW_SECRET)
  if (!secret) {
    return new Response('Service unavailable', { status: 503 })
  }

  // DEP-16/D: el enlace trae un token HMAC de vida corta (?token=...), NO el secreto. El parámetro
  // legado `secret` se ignora por completo. El slug y el tipo salen de la carga FIRMADA: los de la
  // query no cuentan, así el token no sirve para otro contenido. Todo fallo es el mismo 401.
  // Límite: bearer token reutilizable durante su vida (5 min emitido, 15 máx.); draftMode solo
  // habilita la cookie, los borradores los autoriza el CMS con la sesión del editor (DEP-02b).
  const claims = verifyPreviewToken(request.nextUrl.searchParams.get('token'), secret)
  if (!claims) {
    return new Response('Invalid preview token', { status: 401 })
  }
  const { slug, type } = claims

  // Defensa en profundidad: el slug firmado también cumple el patrón antes de usarse en redirect.
  if (!SLUG_RE.test(slug)) {
    return new Response('Invalid slug', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  if (type === 'page') {
    redirect(`/${slug}`)
  }

  redirect(`/noticias/${slug}`)
}
