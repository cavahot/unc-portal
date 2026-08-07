'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes unc-radar {
          0%   { transform: scale(0.55); opacity: 0.75; }
          100% { transform: scale(2.4);  opacity: 0; }
        }
        @keyframes unc-glow {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }
        .unc-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid #5CFF5C;
          animation: unc-radar 3.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .unc-ring:nth-child(2) { animation-delay: 1.07s; }
        .unc-ring:nth-child(3) { animation-delay: 2.13s; }
        .unc-glow-bg {
          position: absolute;
          inset: -20%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(92,255,92,0.14) 0%, transparent 65%);
          animation: unc-glow 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .unc-ring, .unc-glow-bg { animation: none; }
        }
        .unc-cta-primary:hover  { background-color: #8AFF8A !important; }
        .unc-cta-ghost:hover    { border-color: rgba(92,255,92,0.45) !important; color: #ffffff !important; }
        .unc-cta-primary:focus-visible,
        .unc-cta-ghost:focus-visible {
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
            'radial-gradient(ellipse 640px 480px at 50% 38%, rgba(0,60,0,0.22) 0%, #020817 68%), #020817',
          padding: '5rem 1.5rem',
        }}
      >
        {/* Subtle dot-grid backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(92,255,92,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 700px 500px at 50% 50%, black 30%, transparent 80%)',
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
          {/* UNC logotype */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '3.5rem',
            }}
          >
            <Image
              src="/images/logo.png"
              alt="Universidad Nacional de Concepción"
              width={52}
              height={52}
              priority
              style={{ opacity: 0.88 }}
            />
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#5CFF5C',
              }}
            >
              Universidad Nacional de Concepción
            </span>
          </div>

          {/* Radar + 404 */}
          <div
            aria-label="Error 404"
            style={{
              position: 'relative',
              width: '210px',
              height: '210px',
              marginBottom: '2.75rem',
            }}
          >
            <div className="unc-glow-bg" />
            <div className="unc-ring" />
            <div className="unc-ring" />
            <div className="unc-ring" />

            {/* Center crosshair lines */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(92,255,92,0.18), transparent)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '100%',
                  background: 'linear-gradient(transparent, rgba(92,255,92,0.18), transparent)',
                }}
              />
            </div>

            {/* The 404 numeral */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '4.75rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow:
                    '0 0 24px rgba(92,255,92,0.4), 0 0 60px rgba(92,255,92,0.12)',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                }}
              >
                404
              </span>
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
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            }}
          >
            Página no encontrada
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
            La dirección que ingresaste no existe en el portal.
            Verificá la URL o navegá desde el inicio.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              gap: '0.625rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Link
              href="/"
              className="unc-cta-primary"
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
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
                border: '1px solid transparent',
              }}
            >
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                width="13"
                height="13"
                aria-hidden="true"
              >
                <path d="M8 1.5L1 8h2v5.5A.5.5 0 003.5 14h3V10.5h3V14h3a.5.5 0 00.5-.5V8h2L8 1.5z" />
              </svg>
              Ir al inicio
            </Link>

            <Link
              href="/noticias"
              className="unc-cta-ghost"
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
              Ver noticias
            </Link>
          </div>

          {/* Debug line */}
          <p
            style={{
              marginTop: '3.5rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.625rem',
              color: 'rgba(255,255,255,0.16)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ERR_ROUTE_NOT_FOUND · portal.unc.edu.py
          </p>
        </div>
      </div>
    </>
  )
}
