// RES-01: contrato visual de la página de Investigación.
// Qué hace: asegura que la página use la variante visual específica sin alterar otras áreas académicas.
// Amenaza: evita que Investigación continúe compartiendo una plantilla genérica sin identidad científica.
// Límite: el contrato verifica estructura y clases; el equilibrio visual se confirma en navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/[locale]/investigacion/page.tsx', 'utf8')
const component = readFileSync('components/pages/AcademicSectionPage.tsx', 'utf8')
const css = readFileSync('app/globals.css', 'utf8')

describe('RES-01 — diseño visual de Investigación', () => {
  it('la variante de investigación sigue disponible en la plantilla académica', () => {
    // PILARES-01 (2026-11-10): /investigacion pasó a leer el CMS y mostrar «en construcción» (pedido del propietario);
    // la variante visual queda en la plantilla para cuando la página se publique con ese diseño.
    expect(page).toContain("pilar=\"investigacion\"")
    expect(component).toContain("visualVariant?: 'default' | 'research'")
    expect(component).toContain('research-hero')
    expect(component).toContain('research-areas')
  })

  it('usa movimiento seguro y respeta reducción de movimiento', () => {
    expect(component).toContain('transition-[transform,border-color,box-shadow]')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('.research-hero-grid')
  })
})
