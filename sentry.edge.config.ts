/**
 * Sentry Edge runtime initialization.
 * Runs in middleware and Edge API routes.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tunnel: '/api/monitoring',

  // Keep edge traces lean — 5 % in production.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  debug: false,
})
