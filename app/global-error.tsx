'use client'

/**
 * global-error.tsx — last-resort error boundary for the root layout.
 *
 * This catches errors thrown by layout.tsx itself (not page errors — those
 * go to [locale]/error.tsx). It replaces the entire document, so it must
 * include <html> and <body>.
 *
 * Keep it intentionally minimal: at this point the theme, fonts, and
 * navigation are all unavailable.
 */
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error crítico — UNC</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #020817;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100dvh;
            padding: 2rem;
            text-align: center;
          }
          .container { max-width: 400px; }
          h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; }
          p  { font-size: 0.9375rem; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 2rem; }
          button {
            background: #5CFF5C;
            color: #020817;
            border: none;
            border-radius: 9999px;
            padding: 0.625rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
          }
          button:hover { background: #8AFF8A; }
          .digest {
            margin-top: 2rem;
            font-family: ui-monospace, monospace;
            font-size: 0.6rem;
            color: rgba(255,255,255,0.15);
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Error crítico en el portal</h1>
          <p>
            Ocurrió un problema inesperado al cargar la página. El equipo ya fue
            notificado automáticamente.
          </p>
          <button onClick={reset}>Recargar</button>
          {error.digest && (
            <p className="digest">REF: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  )
}
