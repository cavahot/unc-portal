// UI-FTR-01: en el pie, "de Concepción" usa la misma tipografía que "Universidad Nacional" (decisión
// del Product Owner, 2026-10-23), igual que en el encabezado (UI-HDR-02).
// Límite: prueba estática del marcado fuente (entorno node); la apariencia se verificó en el navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const source = readFileSync(path.resolve(__dirname, '..', '..', 'components', 'layout', 'Footer.tsx'), 'utf8')

const classesOfSpanWith = (key: string) => {
  const at = source.indexOf(`{t('${key}')}`)
  const open = source.lastIndexOf('<span', at)
  const match = /className="([^"]+)"/.exec(source.slice(open, at))
  return match ? match[1] : ''
}

describe('Footer: bloque de identidad', () => {
  const name = classesOfSpanWith('universidadNacional')
  const place = classesOfSpanWith('deConcepcion')

  it('"de Concepción" tiene las mismas clases tipográficas que "Universidad Nacional"', () => {
    expect(name).not.toBe('')
    expect(place).toBe(name)
    expect(name).toMatch(/text-base/)
    expect(name).toMatch(/font-semibold/)
  })

  it('conserva el lema en verde con mayúsculas espaciadas', () => {
    const tagline = classesOfSpanWith('tagline')
    expect(tagline).toMatch(/uppercase/)
    expect(tagline).toMatch(/text-\[#8AFF8A\]/)
  })
})
