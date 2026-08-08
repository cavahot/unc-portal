/**
 * Sentry client-side (browser) initialization.
 * Imported automatically by Next.js via the Sentry webpack plugin.
 *
 * Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs'
import { replayIntegration } from '@sentry/replay'

const isProd = process.env.NODE_ENV === 'production'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Route events through our own tunnel to bypass ad-blockers.
  // The tunnel endpoint lives at app/api/monitoring/route.ts.
  tunnel: '/api/monitoring',

  // ── Performance ────────────────────────────────────────────────────────────
  // Sample 10 % of requests in prod; 100 % in dev so nothing is missed locally.
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // ── Session Replay ──────────────────────────────────────────────────────────
  // Record 5 % of normal sessions and 100 % of sessions that produced an error.
  replaysSessionSampleRate: isProd ? 0.05 : 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    replayIntegration({
      // Mask all input values and block media by default.
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // ── Noise filter ───────────────────────────────────────────────────────────
  // Drop events that are expected and actionable by the user (not by us).
  beforeSend(event, hint) {
    const err = hint.originalException

    if (err instanceof Error) {
      // Next.js chunk preload failures auto-reload — no need to alert on them.
      if (err.name === 'ChunkLoadError') return null

      // User navigated away before the fetch completed — not a bug.
      if (err.name === 'AbortError') return null

      // React hydration mismatches in dev — caught by React itself.
      if (!isProd && err.message?.includes('Hydration')) return null
    }

    return event
  },

  // Suppress debug output in production builds.
  debug: false,
})
