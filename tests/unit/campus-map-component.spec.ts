// MAP-01: comportamiento del facade "clic para cargar" de CampusMap.
// Amenaza: cargar el iframe de Google (terceros, cookies, IP del visitante) sin acción del
// usuario. Límite: renderizado estático (entorno node, sin jsdom ni testing-library): prueba
// el estado inicial y el marcado del iframe, no el clic real (se verificó en el navegador).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CampusMap, { CampusMapFrame } from '@/components/layout/CampusMap'
import { buildCampusEmbedUrl } from '@/lib/maps/campusMapUrls'

const ROOT = path.resolve(__dirname, '..', '..')
const labels = {
  title: 'Mapa del campus',
  loadButton: 'Ver mapa interactivo',
  directions: 'Cómo llegar',
  openInMaps: 'Abrir en Google Maps',
  posterLabel: 'Ilustración del campus con la ubicación del Rectorado',
  iframeTitle: 'Mapa de Google con la ubicación de la Universidad Nacional de Concepción',
  address: 'Km 210, Ruta PY05, Concepción, Paraguay',
}

describe('CampusMap (estado inicial)', () => {
  const html = renderToStaticMarkup(createElement(CampusMap, { labels }))

  it('no monta iframe antes de la activación', () => {
    expect(html).not.toContain('<iframe')
  })
  it('no hay recursos externos que se carguen solos (src/srcset/url()/import/preload)', () => {
    expect(html).not.toMatch(/\ssrc=/i)
    expect(html).not.toMatch(/srcset=|url\(http|@import|rel="preload"/i)
  })
  it('muestra botón accesible, dirección y enlaces seguros', () => {
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('Ver mapa interactivo')
    expect(html).toContain('Km 210, Ruta PY05, Concepción, Paraguay')
    expect(html.match(/rel="noopener noreferrer"/g)?.length).toBe(2)
    expect(html.match(/target="_blank"/g)?.length).toBe(2)
    expect(html).toContain('https://www.google.com/maps/dir/?api=1')
    expect(html).toContain('https://www.google.com/maps/search/?api=1')
  })
  it('el póster es una imagen con nombre accesible y no etiqueta edificios reales', () => {
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Ilustración del campus con la ubicación del Rectorado"')
  })
})

describe('CampusMapFrame (tras activar)', () => {
  const html = renderToStaticMarkup(createElement(CampusMapFrame, { title: labels.iframeTitle }))
  it('usa solo la URL constante y los atributos de privacidad/aislamiento', () => {
    expect(html).toContain('<iframe')
    expect(html).toContain(`src="${buildCampusEmbedUrl().replace(/&/g, '&amp;')}"`)
    expect(html).toContain(`title="${labels.iframeTitle}"`)
    expect(html).toContain('loading="lazy"')
    expect(html.toLowerCase()).toContain('referrerpolicy="no-referrer"')
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"')
    expect(html).not.toContain('allowfullscreen')
  })
})

describe('integración (análisis estático)', () => {
  const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')
  it('el footer usa CampusMap y /contacto ya no tiene el iframe con place id inventado', () => {
    expect(read('components/layout/Footer.tsx')).toContain('<CampusMap')
    const contacto = read('app/[locale]/contacto/page.tsx')
    expect(contacto).toContain('<CampusMap')
    expect(contacto).not.toContain('<iframe')
    expect(contacto).not.toContain('0x945c5a1b')
  })
  it('MAP-01 layout: el footer reparte 3/4/5 columnas en 2xl y la tarjeta tiene 2 columnas internas', () => {
    const footer = read('components/layout/Footer.tsx')
    expect(footer).toContain('2xl:col-span-3')
    expect(footer).toContain('2xl:col-span-4')
    expect(footer).toContain('2xl:col-span-5')
    expect(footer).toContain('md:grid-cols-2')
    expect(footer).toContain('max-w-[1536px]')
  })
  it('MAP-01 layout: la dirección va fuera del póster (no se superpone al pin) y el póster es 4/3', () => {
    const src = read('components/layout/CampusMap.tsx')
    expect(src).toContain('aspect-[4/3]')
    expect(src).not.toContain('absolute inset-x-0 bottom-0')
  })
  it('CSP: frame-src de www.google.com ya existe y no se amplía', () => {
    const csp = read('lib/csp.ts')
    expect(csp).toContain('frame-src  https://www.google.com')
    expect(csp).not.toMatch(/frame-src[^\n]*maps\.google/)
  })
  it('los 4 catálogos tienen las claves del mapa', () => {
    for (const l of ['es', 'en', 'gn', 'pt-BR']) {
      const c = JSON.parse(read(`messages/${l}/common.json`))
      for (const k of ['mapTitle', 'mapLoad', 'mapDirections', 'mapOpen', 'mapPosterLabel', 'mapIframeTitle', 'addressOneLine']) {
        expect(typeof c[k], `${l}.${k}`).toBe('string')
        expect(c[k].length).toBeGreaterThan(3)
      }
    }
  })
})
