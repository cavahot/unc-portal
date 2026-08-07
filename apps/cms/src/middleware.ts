import { NextRequest, NextResponse } from 'next/server'

/**
 * CMS CORS middleware.
 *
 * Restricts cross-origin access on /api/* routes to the portal domain.
 * Operational endpoints (alerts, logs, metrics, auditoria, health, dashboard,
 * setup) are additionally blocked for any cross-origin request — they are
 * internal-only and should never be called from a browser on another origin.
 *
 * Payload's own /api/payload/* routes (auth, collections, globals) are allowed
 * from the configured PORTAL_URL so the portal server-side code can reach them.
 */

const INTERNAL_API_PATHS = [
  '/api/alerts',
  '/api/auditoria',
  '/api/dashboard',
  '/api/health',
  '/api/logs',
  '/api/metrics',
  '/api/setup',
]

function getAllowedOrigins(): string[] {
  const origins: string[] = []

  const portalUrl = process.env.PORTAL_URL
  if (portalUrl) origins.push(portalUrl.replace(/\/$/, ''))

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
  if (serverUrl) origins.push(serverUrl.replace(/\/$/, ''))

  // Always allow same-origin / no-origin (server-to-server calls)
  return origins
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true // server-to-server, no Origin header
  const allowed = getAllowedOrigins()
  return allowed.some((o) => origin === o)
}

function setCorsHeaders(response: NextResponse, origin: string | null): void {
  const allowed = getAllowedOrigins()
  const effectiveOrigin = origin && isAllowedOrigin(origin) ? origin : (allowed[0] ?? '')

  if (effectiveOrigin) {
    response.headers.set('Access-Control-Allow-Origin', effectiveOrigin)
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  )
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')
  const method = request.method

  // Only intercept /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const isInternalPath = INTERNAL_API_PATHS.some((p) => pathname.startsWith(p))

  // Block cross-origin requests to internal-only endpoints entirely
  if (isInternalPath && origin && !isAllowedOrigin(origin)) {
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden: cross-origin access not allowed for this endpoint' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    setCorsHeaders(preflight, origin)
    return preflight
  }

  // Pass through with CORS headers on the response
  const response = NextResponse.next()
  setCorsHeaders(response, origin)
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
