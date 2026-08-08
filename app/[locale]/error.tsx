'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <>
      <style>{`
        @keyframes unc-error-pulse {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.5; }
        }
        .unc-error-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(255, 80, 80, 0.5);
          animation: unc-error-pulse 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        .unc-error-ring:nth-child(2) { inset: -14px; animation-delay: 0.8s; }
        .unc-error-ring:nth-child(3) { inset: -28px; animation-delay: 1.6s; }
        @media (prefers-reduced-motion: reduce) {
          .unc-error-ring { animation: none; }
        }
        .unc-btn-reset:hover  { background-color: #8AFF8A !important; }
        .unc-btn-home:hover   { border-color: rgba(92,255,92,0.45) !important; color: #fff !important; }
        .unc-btn-reset:focus-visible,
        .unc-btn-home:focus-visible {
          outline: 2px solid #5CFF5C;
          outline-offset: 3px;
        }
      `}</style>

      <div
        role="main"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '72vh',
          overflow: 'hidden',
          background:
            'radial-gradient(ellipse 640px 400px at 50% 38%, rgba(80,0,0,0.28) 0%, #020817 65%), #020817',
          padding: '5rem 1.5rem',
        }}
      >
        {/* Dot grid */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,80,80,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage:
              'radial-gradient(ellipse 700px 500px at 50% 50%, black 30%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 700px 500px at 50% 50%, black 30%, transparent 80%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '3rem',
            }}
          >
            <Image
              src="/images/logo.png"
              alt="Universidad Nacional de Concepción"
              width={52}
              height={52}
              priority
              style={{ opacity: 0.75 }}
            />
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,80,80,0.8)',
              }}
            >
              Universidad Nacional de Concepción
            </span>
          </div>

          {/* Error icon with rings */}
          <div
            aria-hidden="true"
            style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              marginBottom: '2.5rem',
            }}
          >
            <div className="unc-error-ring" />
            <div className="unc-error-ring" />
            <div className="unc-error-ring" />
            {/* Warning icon */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(255,80,80,0.08)',
                border: '1px solid rgba(255,80,80,0.3)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,120,120,0.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="32"
                height="32"
              >
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          </div>

          {/* Heading + body */}
          <h1
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '0.625rem',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            Algo salió mal
          </h1>
          <p
            style={{
              maxWidth: '34ch',
              fontSize: '0.9375rem',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.44)',
              marginBottom: '2.5rem',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            Ocurrió un error inesperado en el portal. Podés intentar de nuevo
            o volver al inicio.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              className="unc-btn-reset"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#5CFF5C',
                color: '#020817',
                padding: '0.5625rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="13" height="13" aria-hidden="true">
                <path d="M13.5 8A5.5 5.5 0 112.9 5M2 2v4h4" />
              </svg>
              Intentar de nuevo
            </button>

            <Link
              href="/"
              className="unc-btn-home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.6)',
                padding: '0.5625rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
            >
              Ir al inicio
            </Link>
          </div>

          {/* Digest (útil para soporte) */}
          {error.digest && (
            <p
              style={{
                marginTop: '2.5rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.625rem',
                color: 'rgba(255,255,255,0.16)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              REF: {error.digest}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
