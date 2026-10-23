/**
 * Sentry tunnel endpoint — proxies Sentry envelopes through our own domain.
 *
 * Why: ad-blockers and privacy extensions block requests to *.sentry.io.
 * Routing events through /api/monitoring (same origin) bypasses this.
 *
 * The `tunnelRoute` option in withSentryConfig points here automatically.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { readBodyLimited, payloadTooLarge } from '@/lib/security/bodyLimit'
import { getClientIp } from '@/lib/security/clientIp'
import { createRateLimiter, tooManyRequests } from '@/lib/security/rateLimit'

// DEP-06 / RDD-DEP-14: 60 envelopes por minuto por IP confiable y cuerpo <= 1 MiB.
// Amenaza: usar el túnel como relé abierto hacia Sentry o agotar memoria con cuerpos
// enormes. Límite: store en memoria por instancia; el tope de 1 MiB es una hipótesis a
// ajustar con envelopes reales. DEP-16/E: el destino lo fija SOLO el servidor (ver más abajo).
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })
const MAX_BODY_BYTES = 1024 * 1024

export const runtime = 'nodejs'

/**
 * DEP-16/E: extrae host y proyecto de un DSN de Sentry (https://CLAVE@HOST/PROYECTO).
 * Amenaza: DSN con credenciales engañosas (`https://host-ok@evil`) o proyecto no numérico que
 * altere la ruta del upstream. Devuelve null si el DSN no es https, no tiene proyecto numérico o
 * no se puede analizar. `URL.host` ya resuelve la parte tras `@`, por eso la comparación es por host real.
 */
function parseSentryTarget(dsn: unknown): { host: string; projectId: string } | null {
  if (typeof dsn !== 'string' || dsn === '') return null
  let url: URL
  try {
    url = new URL(dsn)
  } catch {
    return null
  }
  const projectId = url.pathname.replace(/^\//, '')
  if (url.protocol !== 'https:' || !url.host || !/^\d{1,20}$/.test(projectId)) return null
  return { host: url.host, projectId }
}

export async function POST(request: NextRequest) {
  const rate = limiter.check(getClientIp(request.headers))
  if (!rate.allowed) {
    return tooManyRequests(rate, 'Too many requests')
  }

  const raw = await readBodyLimited(request, MAX_BODY_BYTES)
  if (!raw.ok) return payloadTooLarge()
  const envelope = raw.text

  // The first line of a Sentry envelope is always a JSON header.
  const headerLine = envelope.split('\n')[0] ?? '{}'
  let header: { dsn?: string }
  try {
    header = JSON.parse(headerLine) as { dsn?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid envelope' }, { status: 400 })
  }

  // DEP-16/E (RDD-DEP-41): el destino sale ÚNICAMENTE de NEXT_PUBLIC_SENTRY_DSN del servidor.
  // Amenaza: el túnel público reenviaba a cualquier host del DSN que traía el envelope (SSRF
  // parcial / relé abierto). Si el envelope trae un DSN distinto (host o proyecto) se rechaza con
  // 403 sin llamar a fetch; sin DSN en el envelope se usa el del servidor.
  // Límite: no autentica al cliente (el DSN público es público por diseño) ni valida el contenido
  // del envelope; solo acota el destino. El upstream se arma siempre con https y el host configurado.
  const serverTarget = parseSentryTarget(process.env.NEXT_PUBLIC_SENTRY_DSN)
  if (!serverTarget) {
    console.error('[DEP-16] NEXT_PUBLIC_SENTRY_DSN ausente o inválido: túnel de monitoreo desactivado')
    return NextResponse.json({ error: 'Monitoring tunnel unavailable' }, { status: 503 })
  }
  if (header.dsn !== undefined) {
    const clientTarget = parseSentryTarget(header.dsn)
    if (!clientTarget || clientTarget.host !== serverTarget.host || clientTarget.projectId !== serverTarget.projectId) {
      return NextResponse.json({ error: 'DSN not allowed' }, { status: 403 })
    }
  }

  const upstreamUrl = `https://${serverTarget.host}/api/${serverTarget.projectId}/envelope/`

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: envelope,
  })

  return new NextResponse(null, { status: upstream.ok ? 200 : upstream.status })
}
