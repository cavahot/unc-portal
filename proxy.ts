import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes: apply CORS + rate-limit, skip locale processing
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3002'
    response.headers.set('Access-Control-Allow-Origin', cmsUrl)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', '99')
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 3600000).toISOString())
    return response
  }

  // All other routes: locale middleware + rate-limit headers
  const response = intlMiddleware(request)
  response.headers.set('X-RateLimit-Limit', '100')
  response.headers.set('X-RateLimit-Remaining', '99')
  response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 3600000).toISOString())
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
