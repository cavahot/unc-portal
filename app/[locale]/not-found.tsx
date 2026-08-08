'use client'

import { Link } from '@/i18n/navigation'

export default function NotFound() {
  return (
    <>
      <style>{`
        /* ---- Animations ---- */
        @keyframes unc404-pulse {
          0%   { transform: scale(1);   opacity: 0.75; }
          100% { transform: scale(3.2); opacity: 0; }
        }
        @keyframes unc404-pin-drop {
          0%   { transform: translateY(-18px) scale(0.9); opacity: 0; }
          55%  { transform: translateY(4px)   scale(1.02); opacity: 1; }
          75%  { transform: translateY(-3px)  scale(0.99); opacity: 1; }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        @keyframes unc404-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ---- Pulse ring on pin dot ---- */
        .unc404-pulse {
          position: absolute;
          border-radius: 50%;
          border: 1px solid #5CFF5C;
          animation: unc404-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          pointer-events: none;
          will-change: transform, opacity;
        }

        /* ---- Pin entrance ---- */
        .unc404-pin {
          opacity: 0;
          animation: unc404-pin-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards;
        }

        /* ---- Content stagger (delay overridden inline per element) ---- */
        .unc404-up {
          opacity: 0;
          animation: unc404-fade-up 0.45s ease 0.55s forwards;
        }

        /* ---- CTA interactions ---- */
        .unc404-cta-primary { transition: background 0.15s ease; }
        .unc404-cta-primary:hover  { background: #8AFF8A !important; }
        .unc404-cta-ghost   { transition: border-color 0.15s ease, color 0.15s ease; }
        .unc404-cta-ghost:hover    {
          border-color: rgba(92, 255, 92, 0.42) !important;
          color: #e8eaf0 !important;
        }
        .unc404-cta-primary:focus-visible,
        .unc404-cta-ghost:focus-visible {
          outline: 2px solid #5CFF5C;
          outline-offset: 3px;
        }

        /* ---- Reduced motion ---- */
        @media (prefers-reduced-motion: reduce) {
          .unc404-pulse,
          .unc404-pin,
          .unc404-up {
            animation: none;
            opacity: 1;
            transform: none;
          }
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
          minHeight: '80vh',
          overflow: 'hidden',
          background: '#060d1a',
          padding: '5rem 1.5rem',
        }}
      >
        {/* ── Topographic contour backdrop ── */}
        <svg
          aria-hidden="true"
          viewBox="0 0 900 600"
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* North-east cluster */}
          {[70, 130, 195, 270, 360, 460].map((r, i) => (
            <ellipse
              key={`ne${i}`}
              cx={680}
              cy={170}
              rx={r}
              ry={r * 0.58}
              fill="none"
              stroke="rgba(92,255,92,0.032)"
              strokeWidth="1"
              transform="rotate(-14 680 170)"
            />
          ))}
          {/* South-west cluster */}
          {[55, 100, 155, 215].map((r, i) => (
            <ellipse
              key={`sw${i}`}
              cx={190}
              cy={490}
              rx={r}
              ry={r * 0.72}
              fill="none"
              stroke="rgba(92,255,92,0.025)"
              strokeWidth="1"
              transform="rotate(8 190 490)"
            />
          ))}
          {/* Graticule lines */}
          {[120, 240, 360, 480].map((y, i) => (
            <line
              key={`h${i}`}
              x1="0" y1={y} x2="900" y2={y}
              stroke="rgba(92,255,92,0.018)"
              strokeWidth="1"
              strokeDasharray="3 14"
            />
          ))}
          {[200, 450, 700].map((x, i) => (
            <line
              key={`v${i}`}
              x1={x} y1="0" x2={x} y2="600"
              stroke="rgba(92,255,92,0.012)"
              strokeWidth="1"
              strokeDasharray="2 18"
            />
          ))}
        </svg>

        {/* ── Main content ── */}
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

          {/* Location pin */}
          <div
            aria-label="Ubicación no encontrada"
            className="unc404-pin"
            style={{
              position: 'relative',
              marginBottom: '2rem',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Pulse ring behind the pin's base dot */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '10px',
                height: '10px',
                zIndex: 0,
              }}
            >
              <div
                className="unc404-pulse"
                style={{ inset: '-8px', animationDelay: '0s' }}
              />
            </div>

            {/* Pin SVG */}
            <svg
              viewBox="0 0 44 56"
              fill="none"
              width="44"
              height="56"
              aria-hidden="true"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/* Teardrop body */}
              <path
                d="M22 2C12.61 2 5 9.61 5 19c0 12.38 17 35 17 35s17-22.62 17-35C39 9.61 31.39 2 22 2z"
                fill="rgba(92,255,92,0.1)"
                stroke="#5CFF5C"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              {/* Centre dot */}
              <circle cx="22" cy="19" r="4.5" fill="#5CFF5C" />
              {/* Crosshair ticks */}
              <line x1="22" y1="12.5" x2="22" y2="15.5" stroke="#5CFF5C" strokeWidth="1" opacity="0.55" />
              <line x1="22" y1="22.5" x2="22" y2="25.5" stroke="#5CFF5C" strokeWidth="1" opacity="0.55" />
              <line x1="15.5" y1="19" x2="18.5" y2="19" stroke="#5CFF5C" strokeWidth="1" opacity="0.55" />
              <line x1="25.5" y1="19" x2="28.5" y2="19" stroke="#5CFF5C" strokeWidth="1" opacity="0.55" />
            </svg>
          </div>

          {/* Eyebrow */}
          <span
            className="unc404-up"
            style={{
              display: 'block',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.6rem',
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#5CFF5C',
              marginBottom: '0.875rem',
              animationDelay: '0.55s',
            }}
          >
            destino no encontrado
          </span>

          {/* 404 numeral */}
          <div
            className="unc404-up"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
              fontSize: 'clamp(5.5rem, 20vw, 9.5rem)',
              fontWeight: 800,
              lineHeight: 0.88,
              letterSpacing: '-0.04em',
              color: '#e8eaf0',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: '1.5rem',
              animationDelay: '0.62s',
            }}
          >
            404
          </div>

          {/* Green rule */}
          <div
            className="unc404-up"
            style={{
              width: '36px',
              height: '1px',
              background: 'rgba(92,255,92,0.45)',
              marginBottom: '1.375rem',
              animationDelay: '0.68s',
            }}
          />

          {/* Heading */}
          <h1
            className="unc404-up"
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#e8eaf0',
              marginBottom: '0.6rem',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
              animationDelay: '0.72s',
            }}
          >
            Página no encontrada
          </h1>

          {/* Description */}
          <p
            className="unc404-up"
            style={{
              maxWidth: '34ch',
              fontSize: '0.9375rem',
              lineHeight: 1.7,
              color: 'rgba(232,234,240,0.44)',
              marginBottom: '2.25rem',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
              animationDelay: '0.76s',
            }}
          >
            La dirección que ingresaste no existe en el portal.
            Verificá la URL o navegá desde el inicio.
          </p>

          {/* CTAs */}
          <div
            className="unc404-up"
            style={{
              display: 'flex',
              gap: '0.625rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '3.5rem',
              animationDelay: '0.8s',
            }}
          >
            <Link
              href="/"
              className="unc404-cta-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#5CFF5C',
                color: '#060d1a',
                padding: '0.5625rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
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
              className="unc404-cta-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                border: '1px solid rgba(232,234,240,0.14)',
                color: 'rgba(232,234,240,0.6)',
                padding: '0.5625rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Ver noticias
            </Link>
          </div>

          {/* Status footer */}
          <p
            className="unc404-up"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.6rem',
              color: 'rgba(232,234,240,0.16)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              animationDelay: '0.85s',
            }}
          >
            ERR_ROUTE_NOT_FOUND · portal.unc.edu.py
          </p>
        </div>
      </div>
    </>
  )
}
