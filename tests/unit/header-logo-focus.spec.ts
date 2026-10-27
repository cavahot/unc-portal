// UI-HDR-01: el enlace del logo del encabezado no debe dibujar un borde verde alrededor.
// Decisión del Product Owner (2026-10-23): sin borde/anillo; el foco de teclado se conserva con un
// indicador sin borde (fondo suave) para no dejar la navegación por teclado sin señal (WCAG 2.4.7).
// Límite: prueba estática del marcado fuente (entorno node); la apariencia se verificó en el navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const source = readFileSync(path.resolve(__dirname, '..', '..', 'components', 'layout', 'Header.tsx'), 'utf8')

// Clases del <Link href="/"> de identidad institucional (primer Link con aria-label homeAriaLabel).
const logoLinkClasses = (() => {
  const start = source.indexOf("aria-label={t('homeAriaLabel')}")
  const match = /className="([^"]+)"/.exec(source.slice(start))
  return match ? match[1] : ''
})()

describe('Header: enlace del logo', () => {
  it('encuentra las clases del enlace del logo', () => {
    expect(logoLinkClasses).toContain('group')
  })

  it('no dibuja borde, anillo ni outline de color al enfocar', () => {
    expect(logoLinkClasses).not.toMatch(/ring-\[#|focus-visible:ring|ring-offset/)
    expect(logoLinkClasses).not.toMatch(/focus-visible:border|focus:border/)
    expect(logoLinkClasses).toContain('focus-visible:outline-none')
  })

  it('conserva un indicador de foco de teclado sin borde', () => {
    expect(logoLinkClasses).toMatch(/focus-visible:bg-white\/\d+/)
  })
})

// UI-HDR-02: el bloque de identidad del encabezado sigue el estilo del pie (logo grande, nombre en dos
// líneas y lema en verde) y "de Concepción" usa exactamente la tipografía de "Universidad Nacional".
describe('Header: bloque de identidad', () => {
  const classesOfSpanWith = (key: string) => {
    const at = source.indexOf(`{t('${key}')}`)
    const open = source.lastIndexOf('<span', at)
    const match = /className="([^"]+)"/.exec(source.slice(open, at))
    return match ? match[1] : ''
  }
  const name = classesOfSpanWith('brandName')
  const place = classesOfSpanWith('brandLocation')
  const tagline = classesOfSpanWith('brandTagline')

  it('"de Concepción" tiene la misma tipografía que "Universidad Nacional"', () => {
    expect(name).not.toBe('')
    expect(place).toBe(name)
    expect(name).toMatch(/text-base/)
    expect(name).toMatch(/font-semibold/)
  })

  it('el lema conserva el estilo verde en mayúsculas espaciadas', () => {
    expect(tagline).toMatch(/uppercase/)
    expect(tagline).toMatch(/tracking-\[0\.2em\]/)
    expect(tagline).toMatch(/text-\[#8AFF8A\]/)
  })

  it('el logo es más grande, como en el pie (64 px desde xl)', () => {
    expect(source).toMatch(/h-14 w-14[^"]*xl:h-16 xl:w-16/)
    expect(source).toMatch(/sizes="\(min-width: 1280px\) 64px, 56px"/)
  })
})
