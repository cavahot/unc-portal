// FAC-08: contrato visual del mapa interactivo en el contacto de facultades.
// Qué hace: exige un mapa real embebido, navegable y con tratamiento visual verde translúcido.
// Amenaza: evita volver al placeholder estático que no permite explorar la ubicación.
// Límite: el mapa depende de la disponibilidad de Google Maps y se verifica también en navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync('components/facultades/ContactoPanel.tsx', 'utf8')

describe('FAC-08 — mapa interactivo del contacto', () => {
  it('renderiza un mapa real con interacción y accesibilidad', () => {
    expect(source).toContain('<iframe')
    expect(source).toContain('www.google.com/maps')
    expect(source).toContain('allowFullScreen')
    expect(source).toContain('title={label}')
  })

  it('aplica tratamiento visual translúcido verde sin bloquear los gestos del mapa', () => {
    expect(source).toContain('pointer-events-none')
    expect(source).toContain('bg-[#39FF88]/35')
    expect(source).toContain('grayscale')
  })
})
