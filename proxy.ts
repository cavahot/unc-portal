import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Simple in-memory sliding-window rate limiter
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? request.headers.get('x-real-ip')
           ?? '127.0.0.1'

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

  // API routes: apply CORS + rate-limit, skip locale processing
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3002'
    response.headers.set('Access-Control-Allow-Origin', cmsUrl)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
    response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    response.headers.set('X-RateLimit-Reset', new Date(rl.reset).toISOString())
    return response
  }

  // All other routes: locale middleware + rate-limit headers
  const response = intlMiddleware(request)
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
  response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
  response.headers.set('X-RateLimit-Reset', new Date(rl.reset).toISOString())
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|images/|fonts/|icons/|assets/).*)',
  ],
}
