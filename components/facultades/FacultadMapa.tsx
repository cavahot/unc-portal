'use client'

// FAC-08b: mapa del contacto de la facultad con «clic para cargar», igual que CampusMap del Rectorado (MAP-03).
// Qué hace: muestra la vista satelital local del campus y solo monta el iframe de Google cuando el visitante
// pulsa el botón. Antes el iframe se cargaba solo, con una capa verde al 35 % y filtros que dejaban el mapa
// lavado y aparentemente vacío.
// Amenaza: Google (terceros, cookies, IP del visitante) cargando sin acción del usuario y fuga del referrer.
// Límite: una vez cargado, Google ve la IP del visitante; la vista previa es la del campus (las facultades
// comparten dirección), no un mapa de cada sede.
import Image from 'next/image'
import { useState } from 'react'
import { isAllowedGoogleMapsUrl } from '@/lib/maps/campusMapUrls'

// Mismo tratamiento de color que el mapa activo del Rectorado (CampusMap), para que ambos se vean iguales.
const ACTIVE_FILTER = 'grayscale(0.04) saturate(1.12) hue-rotate(15deg) brightness(0.82) contrast(1.05)'

/**
 * Iframe de Google Maps. No monta nada si la URL sale de la allowlist (defensa en profundidad: la URL ya sale
 * de `buildFacultadEmbedUrl`). `sandbox` mínimo y `referrerPolicy="no-referrer"`; `allow-popups-to-escape-sandbox`
 * permite que los enlaces del propio mapa abran una pestaña usable.
 */
export function FacultadMapaFrame({ src, title }: { src: string; title: string }) {
  if (!isAllowedGoogleMapsUrl(src)) return null
  return (
    <iframe
      title={title}
      src={src}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block h-full w-full border-0"
    />
  )
}

export default function FacultadMapa({ embedUrl, label }: { embedUrl: string; label: string }) {
  const [active, setActive] = useState(false)
  return (
    // Disposición (FAC-08b): en pantallas ≥ sm el mapa va en la columna derecha, junto a las tarjetas de contacto
    // (dirección, teléfono, correo), con la proporción 4:3 del mapa del Rectorado y alineado arriba (`self-start`).
    // Ocupa 2 filas para que la tarjeta «Sitio web» (columna derecha) quede justo debajo y el conjunto se equilibre.
    // Sin `h-full` ni `min-h-*`: con ellos el mapa copiaba el alto de la pila de tarjetas y dejaba de ser 4:3, y
    // `min-h` + `aspect-ratio` ensanchaban la caja más allá de su columna. En móvil es una sola columna y queda
    // justo debajo de la dirección (orden del DOM).
    <div className="self-start rounded-2xl bg-white/[0.07] p-3 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:p-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#8AFF8A]/25 bg-[#001A00] shadow-[0_0_40px_rgba(57,255,136,0.12)]">
        {active ? (
          <div className="absolute inset-0" style={{ filter: ACTIVE_FILTER }}>
            <FacultadMapaFrame src={embedUrl} title={label} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            aria-label={label}
            className="group absolute inset-0 block h-full w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AFF8A] focus-visible:ring-inset"
          >
            {/* Decorativa: el nombre accesible del botón es `label`. */}
            <Image src="/images/campus-map-satellite.png" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#39FF88]/12 mix-blend-screen" />
            <span className="absolute bottom-3 left-3 rounded-full bg-[#00290D]/85 px-3 py-1 text-xs font-semibold text-[#C8FFCE] backdrop-blur-sm">
              {label}
            </span>
          </button>
        )}
        {active && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#39FF88]/12 mix-blend-screen" />}
      </div>
    </div>
  )
}
