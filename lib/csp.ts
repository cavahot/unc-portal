/**
 * lib/csp.ts
 * Builds the Content-Security-Policy string for the portal.
 *
 * Strategy:
 *   - Development: report-only, permissive (allows HMR, Turbopack eval, etc.)
 *   - Production:  enforce mode, nonce-based strict-dynamic
 *
 * Call buildCSP(nonce) from the middleware (proxy.ts) once per request.
 */

const isDev = process.env.NODE_ENV === 'development'

/** Known external image/media hosts */
const IMG_HOSTS = [
  'https://www.unc.edu.py',
  'https://migracion.unc.edu.py',
  'https://flagcdn.com',
  // Production S3 / CDN — add via env if needed
  ...(process.env.MEDIA_HOSTNAME ? [`https://${process.env.MEDIA_HOSTNAME}`] : []),
].join(' ')

/** CMS and MinIO origins for client-side fetch / WebSocket (dev HMR) */
const CONNECT_DEV = [
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:9100',
  'http://127.0.0.1:9100',
  'ws://localhost:*',
  'wss://localhost:*',
].join(' ')

const CONNECT_PROD = process.env.NEXT_PUBLIC_CMS_URL
  ? process.env.NEXT_PUBLIC_CMS_URL
  : ''

export function buildCSP(nonce: string): string {
  if (isDev) {
    // Development: report-only, permissive — we just want to surface violations
    return [
      "default-src 'self'",
      // Turbopack + Next.js HMR needs unsafe-eval and unsafe-inline in dev
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src  'self' 'unsafe-inline'`,
      `img-src    'self' data: blob: ${IMG_HOSTS} http://localhost:* http://127.0.0.1:*`,
      `font-src   'self' data:`,
      `connect-src 'self' ${CONNECT_DEV}`,
      `media-src  'none'`,
      `object-src 'none'`,
      `base-uri   'self'`,
      `form-action 'self'`,
      // Google Maps embed on /contacto
      `frame-src  https://www.google.com`,
      `frame-ancestors 'none'`,
    ]
      .join('; ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Production: same-origin + inline policy.
  // strict-dynamic is intentionally omitted: it would ignore 'self', blocking
  // Next.js App Router external script chunks (_next/static/...). The RSC
  // streaming payload (self.__next_f.push) requires 'unsafe-inline'.
  // The nonce is kept for any explicitly nonce'd scripts we add in the future.
  return [
    "default-src 'none'",
    `script-src  'self' 'unsafe-inline' 'nonce-${nonce}'`,
    `style-src   'self' 'unsafe-inline'`,   // Tailwind / inline style props
    `img-src     'self' data: blob: ${IMG_HOSTS}`,
    `font-src    'self' data:`,
    `connect-src 'self' ${CONNECT_PROD}`,
    `media-src   'none'`,
    `object-src  'none'`,
    `base-uri    'self'`,
    `form-action 'self'`,
    // Google Maps embed on /contacto
    `frame-src   https://www.google.com`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ]
    .join('; ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Generates a cryptographically random base64-encoded nonce.
 *  Uses btoa + Web Crypto — safe in both Node.js and the edge runtime.
 */
export function generateNonce(): string {
  // crypto.randomUUID() is available in Node 14.17+ and all edge runtimes
  return btoa(crypto.randomUUID())
}
