// MAP-01: contrato de lib/maps/campusMapUrls.ts (URLs del mapa del campus).
// Amenaza: un iframe/enlace con origen distinto de https://www.google.com o armado con
// entrada externa abriría seguimiento o contenido ajeno. Límite: no prueba que Google
// siga aceptando el formato `output=embed` (ver docs/specs/portal/CAMPUS-MAP.md, riesgos).
import { describe, expect, it } from 'vitest'
import {
  CAMPUS_MAP_QUERY,
  buildCampusEmbedUrl,
  buildCampusDirectionsUrl,
  buildCampusOpenUrl,
  isAllowedGoogleMapsUrl,
} from '@/lib/maps/campusMapUrls'

describe('campusMapUrls', () => {
  it('la consulta es por texto (nombre + dirección) y no contiene coordenadas inventadas', () => {
    expect(CAMPUS_MAP_QUERY).toContain('Universidad Nacional de Concepción')
    expect(CAMPUS_MAP_QUERY).toContain('Ruta PY05 Km 210')
    expect(CAMPUS_MAP_QUERY).not.toMatch(/-?\d{1,3}\.\d{3,}/)
  })

  it('embed: https, host exacto www.google.com, q codificado, sin t=k ni claves', () => {
    const u = new URL(buildCampusEmbedUrl())
    expect(u.protocol).toBe('https:')
    expect(u.host).toBe('www.google.com')
    expect(u.pathname).toBe('/maps')
    expect(u.searchParams.get('q')).toBe(CAMPUS_MAP_QUERY)
    expect(u.searchParams.get('output')).toBe('embed')
    expect(u.searchParams.get('z')).toBe('16')
    expect(u.searchParams.has('key')).toBe(false)
  })

  it('cómo llegar: api=1 y destination codificado', () => {
    const u = new URL(buildCampusDirectionsUrl())
    expect(u.origin).toBe('https://www.google.com')
    expect(u.pathname).toBe('/maps/dir/')
    expect(u.searchParams.get('api')).toBe('1')
    expect(u.searchParams.get('destination')).toBe(CAMPUS_MAP_QUERY)
  })

  it('abrir en Google Maps: api=1 y query codificado', () => {
    const u = new URL(buildCampusOpenUrl())
    expect(u.origin).toBe('https://www.google.com')
    expect(u.pathname).toBe('/maps/search/')
    expect(u.searchParams.get('query')).toBe(CAMPUS_MAP_QUERY)
  })

  it('las funciones no aceptan parámetros (sin entrada controlable)', () => {
    expect(buildCampusEmbedUrl.length).toBe(0)
    expect(buildCampusDirectionsUrl.length).toBe(0)
    expect(buildCampusOpenUrl.length).toBe(0)
  })

  it('la allowlist rechaza otros hosts, http, subdominios engañosos y esquemas peligrosos', () => {
    expect(isAllowedGoogleMapsUrl(buildCampusEmbedUrl())).toBe(true)
    for (const bad of [
      'http://www.google.com/maps?q=x',
      'https://google.com/maps?q=x',
      'https://www.google.com.evil.com/maps',
      'https://evil.com/?u=https://www.google.com/maps',
      'https://user@www.google.com@evil.com/maps',
      'https://www.google.com:8443/maps',
      'javascript:alert(1)',
      '//www.google.com/maps',
      'https://www.google.com/other',
      42,
      undefined,
    ]) {
      expect(isAllowedGoogleMapsUrl(bad as unknown)).toBe(false)
    }
  })
})
