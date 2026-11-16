// FAC-08b: el mapa del contacto de la facultad usa «clic para cargar» (igual que CampusMap del Rectorado).
// Qué hace: renderiza ContactoPanel en su estado inicial y comprueba que NO monta Google antes del clic, que
// muestra la vista satelital con un botón accesible y que no lleva la capa verde que dejaba el mapa lavado.
// Amenaza: cargar Google (terceros, cookies, IP del visitante) sin acción del usuario y un mapa ilegible
// (capa mix-blend 35 % + filtros) que parecía vacío. Límite: render estático (entorno node); el clic real
// y el dibujo de las teselas de Google se verifican en el navegador, no aquí.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ContactoPanel, { type ContactoLabels } from '@/components/facultades/ContactoPanel'

const labels: ContactoLabels = {
  direccion: 'Dirección',
  mapa: 'Ver en el mapa',
  telefono: 'Teléfono',
  correo: 'Correo electrónico',
  sitio: 'Sitio web',
  redes: 'Redes',
  nuevaPestana: '(se abre en una pestaña nueva)',
  redesNombres: {},
}

// Fixture mínimo: solo los campos que lee ContactoPanel.
const facultad = {
  direccion: 'Campus Universitario: Ruta Py05, Km 210.',
  telefono: '(595 331) 243176',
  telHref: 'tel:595331243176',
  emails: [],
  redes: [],
  sitioWeb: null,
} as never

describe('FAC-08b mapa de contacto de la facultad', () => {
  const html = renderToStaticMarkup(
    createElement(ContactoPanel, { facultad, mapHref: 'https://www.google.com/maps/search/?api=1&query=x', labels }),
  )

  it('no monta el iframe de Google antes de la interacción del visitante', () => {
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('google.com/maps?q=')
  })

  it('muestra la vista satelital del campus con un botón accesible para cargar el mapa', () => {
    expect(html).toContain(encodeURIComponent('/images/campus-map-satellite.png'))
    expect(html).toMatch(/<button[^>]*type="button"[^>]*aria-label="Ver en el mapa"/)
  })

  it('no incluye la capa verde de 35 % que lavaba el mapa', () => {
    expect(html).not.toContain('bg-[#39FF88]/35')
  })

  it('coloca el mapa al lado de la tarjeta de dirección, con la proporción 4:3 del mapa del Rectorado', () => {
    // Antes ocupaba una fila completa debajo (`sm:col-span-2`) y la tarjeta de dirección quedaba sola a media fila.
    expect(html).not.toContain('sm:col-span-2')
    expect(html).toContain('sm:col-start-2')
    expect(html).toContain('sm:row-start-1')
    expect(html).toContain('aspect-[4/3]')
    expect(html).not.toContain('aspect-[16/9]')
  })

  it('el mapa tiene ancho explícito: sin él, min-h + aspect-ratio ensanchan la caja y se sale de su columna', () => {
    const box = html.match(/<div class="([^"]*aspect-\[4\/3\][^"]*)"/)?.[1] ?? ''
    expect(box.split(' ')).toContain('w-full')
  })

  it('mantiene 4:3 de verdad: no se estira al alto de las tarjetas y se alinea arriba', () => {
    // Con `h-full` el mapa copiaba el alto de la pila de tarjetas (p. ej. 260×456) y dejaba de ser 4:3.
    const classes = html.match(/<div class="([^"]*aspect-\[4\/3\][^"]*)"/)?.[1].split(' ') ?? []
    expect(classes).not.toContain('h-full')
    expect(classes.some((c) => c.startsWith('min-h-'))).toBe(false)
    expect(html).toMatch(/sm:col-start-2[^"]*self-start|self-start[^"]*sm:col-start-2/)
  })

  describe('equilibrio de las tarjetas: «Sitio web» bajo el mapa', () => {
    const withSite = renderToStaticMarkup(
      createElement(ContactoPanel, {
        facultad: {
          direccion: 'Campus Universitario: Ruta Py05, Km 210.',
          telefono: '(595 331) 243176',
          telHref: 'tel:595331243176',
          emails: [{ email: 'secgral@fhyce.edu.py', etiqueta: null }],
          redes: [],
          sitioWeb: { href: 'https://www.fhyce.edu.py', label: 'www.fhyce.edu.py' },
        } as never,
        mapHref: 'https://www.google.com/maps/search/?api=1&query=x',
        labels,
      }),
    )
    const classOfCard = (term: string) => withSite.match(new RegExp(`<div class="([^"]*)"><dt[^>]*>${term}</dt>`))?.[1].split(' ') ?? []

    it('la tarjeta «Sitio web» va en la columna del mapa, debajo de él', () => {
      expect(classOfCard('Sitio web')).toContain('sm:col-start-2')
    })

    it('el mapa ocupa dos filas (no tres) para que «Sitio web» quede justo debajo', () => {
      expect(withSite).toContain('sm:row-span-2')
      expect(withSite).not.toContain('sm:row-span-3')
    })

    it('las tarjetas de dirección, teléfono y correo siguen en la columna izquierda', () => {
      for (const term of ['Dirección', 'Teléfono', 'Correo electrónico']) {
        expect(classOfCard(term), term).not.toContain('sm:col-start-2')
      }
    })
  })

  it('conserva el enlace «Ver en el mapa» a una pestaña nueva y seguro', () => {
    expect(html).toContain('https://www.google.com/maps/search/')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
