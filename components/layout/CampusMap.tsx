'use client'

// MAP-03: preview satelital local solicitado por diseño; el iframe real queda bajo interacción.
import Image from 'next/image'
import { useState } from 'react'
import { safeHref } from '@/lib/security/safeUrl' // defensa en profundidad para enlaces externos
import {
  buildCampusDirectionsUrl,
  buildCampusEmbedUrl,
  buildCampusOpenUrl,
} from '@/lib/maps/campusMapUrls'

export type CampusMapLabels = {
  title: string
  loadButton: string
  directions: string
  openInMaps: string
  posterLabel: string
  iframeTitle: string
  address: string
}

/**
 * Iframe de Google Maps. Solo se monta tras la activación del visitante.
 * Amenaza: seguimiento de terceros y fuga del referrer; mitigación: `referrerPolicy=no-referrer`,
 * `sandbox` mínimo y `src` constante (sin entrada de usuario). Límite: Google ve la IP del
 * visitante una vez cargado; `allow-same-origin` aplica al origen de Google, no al del portal.
 * `allow-popups-to-escape-sandbox` permite que los enlaces del propio mapa abran una pestaña usable.
 */
export function CampusMapFrame({ title }: { title: string }) {
  return (
    <iframe
      title={title}
      src={buildCampusEmbedUrl()}
      loading="lazy"
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block h-full w-full border-0"
    />
  )
}

/**
 * Póster SVG autocontenido (sin pedidos externos): baldosa isométrica abstracta del campus.
 * Los bloques son decorativos y NO representan edificios reales; el pin queda centrado y sin
 * texto encima (la dirección va fuera del póster). El pulso se define en globals.css solo bajo
 * `prefers-reduced-motion: no-preference`.
 */
function CampusPoster({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={label}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="campus-bg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#004700" />
          <stop offset="100%" stopColor="#001A00" />
        </radialGradient>
        <radialGradient id="campus-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8AFF8A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8AFF8A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#campus-bg)" />
      {/* Baldosa isométrica del terreno */}
      <polygon points="200,40 370,150 200,260 30,150" fill="#00A300" fillOpacity="0.22" stroke="#8AFF8A" strokeOpacity="0.35" />
      <polygon points="200,68 320,150 200,232 80,150" fill="none" stroke="#8AFF8A" strokeOpacity="0.18" strokeDasharray="4 5" />
      {/* Bloques abstractos (sin significado cartográfico), lejos del pin central */}
      <g>
        <polygon points="78,150 108,135 138,150 108,165" fill="#00A300" fillOpacity="0.7" />
        <polygon points="78,150 108,165 108,185 78,170" fill="#004700" />
        <polygon points="108,165 138,150 138,170 108,185" fill="#001A00" />
        <polygon points="262,130 300,111 338,130 300,149" fill="#8AFF8A" fillOpacity="0.55" />
        <polygon points="262,130 300,149 300,175 262,156" fill="#004700" />
        <polygon points="300,149 338,130 338,156 300,175" fill="#001A00" />
        <polygon points="250,200 275,187 300,200 275,213" fill="#00A300" fillOpacity="0.5" />
        <polygon points="250,200 275,213 275,225 250,212" fill="#004700" />
        <polygon points="275,213 300,200 300,212 275,225" fill="#001A00" />
      </g>
      {/* Pin brillante centrado */}
      <ellipse cx="200" cy="168" rx="62" ry="28" fill="url(#campus-glow)" className="campus-map-pulse" />
      <path d="M200 84c-21 0-37 16-37 36 0 27 37 62 37 62s37-35 37-62c0-20-16-36-37-36z" fill="#8AFF8A" stroke="#001A00" strokeWidth="3" />
      <circle cx="200" cy="120" r="13" fill="#001A00" />
    </svg>
  )
}

/**
 * Preview satelital local para que el diseño solicitado sea visible de inmediato.
 * La acción conserva el mapa de Google real para zoom y arrastre, pero evita que Google
 * reemplace la vista aérea por el mapa de calles durante el render inicial.
 */
export default function CampusMap({ labels }: { labels: CampusMapLabels }) {
  const [active, setActive] = useState(false)
  const linkClass =
    'inline-flex flex-1 items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-center text-xs font-semibold text-white/85 transition-colors hover:border-[#8AFF8A]/60 hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]'

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#8AFF8A]/25 bg-[#001A00] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
        {active ? (
          <div className="absolute inset-0 grayscale" style={{ filter: 'grayscale(0.04) saturate(1.12) hue-rotate(15deg) brightness(0.82) contrast(1.05)' }}>
            <CampusMapFrame title={labels.iframeTitle} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            aria-label={labels.loadButton}
            className="group absolute inset-0 block h-full w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AFF8A] focus-visible:ring-inset"
          >
            {/* MAP-03: imagen entregada por el usuario, usada como preview satelital estable. */}
            <Image
              src="/images/campus-map-satellite.png"
              alt={labels.posterLabel}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#39FF88]/12 mix-blend-screen" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(138,255,138,0.16)_48%,transparent_56%)] campus-map-sheen" />
            <span className="absolute bottom-3 left-3 rounded-full bg-[#00290D]/85 px-3 py-1 text-xs font-semibold text-[#C8FFCE] backdrop-blur-sm">
              {labels.loadButton}
            </span>
          </button>
        )}
        {active && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#39FF88]/12 mix-blend-screen" />}
        {active && <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#00290D]/85 px-3 py-1 text-xs font-semibold text-[#C8FFCE] backdrop-blur-sm">{labels.title}</span>}
      </div>

      <p className="mt-2 text-xs leading-5 text-white/70">{labels.address}</p>

      <div className="mt-3 flex gap-2">
        <a href={safeHref(buildCampusDirectionsUrl())} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {labels.directions}
        </a>
        <a href={safeHref(buildCampusOpenUrl())} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {labels.openInMaps}
        </a>
      </div>
    </div>
  )
}
