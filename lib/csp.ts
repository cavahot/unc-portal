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

import { buildImagesConfig, cmsPublicOrigin } from './images/nextImagesConfig.mjs'

const isDev = process.env.NODE_ENV === 'development'

/**
 * MIG-IMG fase 2a: hosts externos permitidos en `img-src`, derivados de la MISMA lista que `next/image`
 * (lib/images/nextImagesConfig.mjs) más el origen público del CMS, para que una imagen `unoptimized` o una
 * URL absoluta de `media` no quede bloqueada en producción. Sin `migracion.unc.edu.py` (D4: sin hotlink).
 * Se calcula en cada llamada leyendo el objeto de entorno completo (no un acceso literal a una variable
 * pública de Next, que el compilador reemplaza por su valor al construir). Límite: las imágenes optimizadas salen de `/_next/image` ('self'); esta lista
 * solo importa para cargas directas. Los orígenes http/localhost solo aparecen fuera de producción.
 */
function imgHosts(): string {
  const env = process.env as Record<string, string | undefined>
  const origins = new Set<string>()
  const cms = cmsPublicOrigin(env)
  if (cms) origins.add(cms)
  for (const p of buildImagesConfig(env).remotePatterns) {
    if (p.protocol === 'https') origins.add(`https://${p.hostname}`)
  }
  return [...origins].join(' ')
}

/** Orígenes del CMS y del almacén S3 local (SeaweedFS, puerto 9100) para fetch / WebSocket en desarrollo (HMR). */
const CONNECT_DEV = [
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:9100',
  'http://127.0.0.1:9100',
  'ws://localhost:*',
  'wss://localhost:*',
].join(' ')

// Decisión 2026-10-28: NEXT_PUBLIC_CMS_URL es ahora el origen público de los archivos (www, mismo origen que
// el portal) y ya no el panel del CMS. El código cliente del portal no hace fetch al CMS (solo servidor, vía
// CMS_URL interna), así que 'self' basta: connect-src NO concede ningún origen extra (menos superficie de
// exfiltración y sin conceder cms.unc.edu.py al portal).
const CONNECT_PROD = ''

export function buildCSP(nonce: string): string {
  if (isDev) {
    // Development: report-only, permissive — we just want to surface violations
    return [
      "default-src 'self'",
      // Turbopack + Next.js HMR needs unsafe-eval and unsafe-inline in dev
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src  'self' 'unsafe-inline'`,
      `img-src    'self' data: blob: ${imgHosts()} http://localhost:* http://127.0.0.1:*`,
      `font-src   'self' data:`,
      `connect-src 'self' ${CONNECT_DEV}`,
      `media-src  'none'`,
      `object-src 'none'`,
      `base-uri   'self'`,
      `form-action 'self'`,
      // Sentry Session Replay uses an inline Web Worker (blob: URL)
      `worker-src blob:`,
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
    `img-src     'self' data: blob: ${imgHosts()}`,
    `font-src    'self' data:`,
    `connect-src 'self' ${CONNECT_PROD}`,
    `media-src   'none'`,
    `object-src  'none'`,
    `base-uri    'self'`,
    `form-action 'self'`,
    // Sentry Session Replay uses an inline Web Worker (blob: URL)
    `worker-src  blob:`,
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
