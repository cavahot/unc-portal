/**
 * Sentry server-side (Node.js) initialization.
 * Imported automatically by Next.js via the Sentry webpack plugin.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tunnel: '/api/monitoring',

  // Sample 10 % of server traces in production.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Suppress verbose SDK output.
  debug: false,
})
