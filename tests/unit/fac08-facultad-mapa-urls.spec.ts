// FAC-08b: URL del mapa embebido de la facultad y su iframe.
// Qué hace: fija que la dirección del campus use la consulta validada (la que sí resuelve el Rectorado), que
// cualquier otra dirección se codifique y quede dentro de la allowlist de Google Maps, y que el iframe salga
// con sandbox y referrer estricto.
// Amenaza: una dirección del CMS con `&`, comillas o `<script` que altere la URL, y un iframe sin sandbox
// que reciba el referrer completo. Límite: no comprueba qué dibuja Google para cada consulta.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  buildCampusEmbedUrl,
  buildFacultadEmbedUrl,
  isAllowedGoogleMapsUrl,
  isCampusAddress,
} from '@/lib/maps/campusMapUrls'
import { FacultadMapaFrame } from '@/components/facultades/FacultadMapa'

describe('FAC-08b direcciones y URL de embed', () => {
  it('reconoce las direcciones reales del campus (las 6 facultades)', () => {
    for (const d of [
      'Campus Universitario: Ruta Py05, Km 210.',
      'Campus Universitario: Ruta PY05, km 210, Concepción, Paraguay.',
      'Campus Universitario: Ruta PY05, km 210, Concepción.',
      'Campus Universitario: Ruta PY05, km 210. Predio Hospital Regional: Prof. Guillermo Cabral y Dr. Marcial Royg Bernal.',
    ]) {
      expect(isCampusAddress(d), d).toBe(true)
    }
    expect(isCampusAddress('Av. Mariscal López 123, Asunción')).toBe(false)
  })

  it('la dirección del campus usa exactamente la URL validada del Rectorado', () => {
    expect(buildFacultadEmbedUrl('Campus Universitario: Ruta Py05, Km 210.')).toBe(buildCampusEmbedUrl())
  })

  it('otra dirección se codifica, usa vista satélite y queda dentro de la allowlist', () => {
    const url = buildFacultadEmbedUrl('Sede Norte, Calle 1 & "Calle 2" <script>')
    expect(isAllowedGoogleMapsUrl(url)).toBe(true)
    expect(url).toContain('t=k')
    expect(url).toContain('output=embed')
    expect(url).not.toContain('<script')
    expect(new URL(url).searchParams.get('q')).toContain('Sede Norte')
    expect(new URL(url).searchParams.get('t')).toBe('k') // el `&` de la dirección no inyectó otro parámetro
  })
})

describe('FAC-08b iframe del mapa', () => {
  const html = renderToStaticMarkup(createElement(FacultadMapaFrame, { src: buildCampusEmbedUrl(), title: 'Ver en el mapa' }))

  it('sale con sandbox mínimo, referrer estricto y carga diferida', () => {
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"')
    expect(html).toContain('referrerPolicy="no-referrer"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('title="Ver en el mapa"')
  })

  it('no monta nada si la URL sale de la allowlist de Google Maps', () => {
    const bad = renderToStaticMarkup(createElement(FacultadMapaFrame, { src: 'https://www.google.com.evil.example/maps?q=x', title: 't' }))
    expect(bad).toBe('')
  })
})
