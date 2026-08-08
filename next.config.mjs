import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      'next-intl/config': './i18n/request.ts',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 92],
    remotePatterns: [
      // MinIO local (dev)
      { protocol: 'http', hostname: 'localhost', port: '9100', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9100', pathname: '/**' },
      // Payload CMS local media (dev)
      { protocol: 'http', hostname: 'localhost', port: '3002', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3002', pathname: '/**' },
      // WordPress original (imágenes migradas que aún no están en Payload)
      { protocol: 'https', hostname: 'www.unc.edu.py', pathname: '/**' },
      { protocol: 'https', hostname: 'migracion.unc.edu.py', pathname: '/**' },
      // Flag CDN para los selectores de idioma
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      // Servidor dedicado — configurar MEDIA_HOSTNAME en Vercel env vars
      ...(process.env.MEDIA_HOSTNAME
        ? [{ protocol: 'https', hostname: process.env.MEDIA_HOSTNAME, pathname: '/**' }]
        : []),
    ],
  },
}

// Required for Docker production image (see Dockerfile at repo root).
// The Sentry plugin is fully compatible with standalone output.
nextConfig.output = 'standalone'

const sentryConfig = {
  // Build-time source-map upload — requires SENTRY_AUTH_TOKEN in CI/CD.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress CLI output locally; show it in CI.
  silent: !process.env.CI,

  // Route browser events through /api/monitoring to bypass ad-blockers.
  tunnelRoute: '/api/monitoring',

  // Keep source maps private — never expose them to the browser.
  hideSourceMaps: true,

  // Tree-shake the Sentry logger from production bundles.
  disableLogger: true,

  // Annotate React components in the bundle for better error context.
  reactComponentAnnotation: { enabled: true },

  // We don't use Vercel Cron Monitors.
  automaticVercelMonitors: false,
}

export default withSentryConfig(withNextIntl(nextConfig), sentryConfig)
