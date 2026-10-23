import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { buildCSP, generateNonce } from './lib/csp'
import { getClientIp } from './lib/security/clientIp'

const intlMiddleware = createMiddleware(routing)

// Simple in-memory rate limiter for PAGES only (not /api/*, see DEP-06)
// Note: resets on server restart; for multi-instance deployments, use Redis/Upstash
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT = 120       // requests
const WINDOW_MS  = 60_000    // per 60 seconds

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT - 1, reset: now + WINDOW_MS }
  }

  entry.count++
  const remaining = Math.max(0, RATE_LIMIT - entry.count)
  return {
    allowed: entry.count <= RATE_LIMIT,
    remaining,
    reset: entry.windowStart + WINDOW_MS,
  }
}

// Cleanup old entries every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now - entry.windowStart > WINDOW_MS * 2) rateLimitMap.delete(ip)
    }
  }, 300_000)
}

/** Headers to propagate from the intl response to our own */
const INTL_HEADER_PREFIXES = ['x-', 'link', 'vary', 'cache-control']
function isIntlHeader(key: string): boolean {
  return INTL_HEADER_PREFIXES.some((p) => key.toLowerCase().startsWith(p))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // DEP-06 / RDD-DEP-15: IP confiable = x-real-ip fijado por nginx; x-forwarded-for del cliente
  // NO se lee (rotarlo evadía el límite) y request.ip no existe en Next 16.
  const ip = getClientIp(request.headers)

  const rl = checkRateLimit(ip)

  if (!rl.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(RATE_LIMIT),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rl.reset).toISOString(),
        'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
      },
    })
  }

  // ── Generate nonce for this request ────────────────────────────────────────
  const nonce = generateNonce()
  const csp   = buildCSP(nonce)
  const isDev = process.env.NODE_ENV === 'development'

  // Build modified request headers that server components will see (via x-nonce, x-locale)
  const SUPPORTED_LOCALES = ['es', 'en', 'pt-BR', 'gn']
  const pathSegment = pathname.split('/')[1] ?? ''
  const locale = SUPPORTED_LOCALES.includes(pathSegment) ? pathSegment : 'es'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-locale', locale)

  // Rate-limit response headers (applied to every non-429 response)
  function applyRateLimitHeaders(res: NextResponse): void {
    res.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
    res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    res.headers.set('X-RateLimit-Reset', new Date(rl.reset).toISOString())
  }

  // ── API routes ──────────────────────────────────────────────────────────────
  // DEP-06 / RDD-DEP-14: /api/* NO pasa por este proxy (el matcher de abajo excluye `api/`).
  // Antes había aquí una rama con CORS y límite que nunca se ejecutaba y daba falsa
  // sensación de protección. El límite de tasa y el tope de cuerpo viven DENTRO de cada
  // handler público (lib/security/*). CORS no es autenticación: protege el secreto/rol
  // de cada ruta, no las cabeceras.

  // ── Locale routes ───────────────────────────────────────────────────────────
  // Step 1: let intl middleware decide routing (redirect / rewrite / next)
  const intlResponse = intlMiddleware(request)

  // Step 2: for redirects, CSP is irrelevant — just forward them
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    applyRateLimitHeaders(intlResponse)
    return intlResponse
  }

  // Step 3: for next/rewrite — replace with a response that forwards x-nonce
  // to server components, and carry over any intl-specific response headers.
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Copy intl headers (locale cookie, middleware rewrites, vary, etc.)
  intlResponse.headers.forEach((value, key) => {
    if (isIntlHeader(key)) {
      response.headers.set(key, value)
    }
  })

  // Set CSP — report-only in dev so nothing breaks while we audit violations
  if (isDev) {
    response.headers.set('Content-Security-Policy-Report-Only', csp)
  } else {
    response.headers.set('Content-Security-Policy', csp)
  }

  applyRateLimitHeaders(response)
  return response
}

export const config = {
  matcher: [
    // Exclude Next.js internals, static assets, API routes, and special metadata routes
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|api/|images/|fonts/|icons/|assets/).*)',
  ],
}
