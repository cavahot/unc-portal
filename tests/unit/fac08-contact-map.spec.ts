// FAC-08 / FAC-08b: contrato visual del mapa interactivo en el contacto de facultades.
// Qué hace: exige un mapa real de Google, navegable y accesible, que se monta con un clic (como el Rectorado) y
// con un tratamiento verde suave que no bloquea los gestos ni lava el mapa.
// Amenaza: volver al placeholder estático que no permite explorar la ubicación, o a la capa verde del 35 %
// (mix-blend sobre un iframe cargado de entrada) que dejaba el mapa pálido y aparentemente vacío.
// Límite: pruebas de código fuente; el dibujo real de Google se verifica en el navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const panel = readFileSync('components/facultades/ContactoPanel.tsx', 'utf8')
const mapa = readFileSync('components/facultades/FacultadMapa.tsx', 'utf8')

describe('FAC-08 — mapa interactivo del contacto', () => {
  it('renderiza un mapa real con interacción y accesibilidad', () => {
    expect(mapa).toContain('<iframe')
    expect(mapa).toContain('isAllowedGoogleMapsUrl') // solo se monta una URL de Google Maps permitida
    expect(mapa).toContain('allowFullScreen')
    expect(mapa).toContain('title={title}')
    expect(mapa).toContain('setActive(true)') // se activa con el clic del visitante
  })

  it('ContactoPanel delega en FacultadMapa y ya no incrusta un iframe propio', () => {
    expect(panel).toContain('FacultadMapa')
    expect(panel).toContain('buildFacultadEmbedUrl')
    expect(panel).not.toContain('<iframe')
  })

  it('aplica un tratamiento verde suave sin bloquear los gestos del mapa ni lavarlo', () => {
    expect(mapa).toContain('pointer-events-none')
    expect(mapa).toContain('bg-[#39FF88]/12')
    expect(mapa).not.toContain('bg-[#39FF88]/35')
    expect(panel).not.toContain('bg-[#39FF88]/35')
  })
})
