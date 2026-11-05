// AUT-DECANOS: contrato de fotos oficiales de los decanos de la UNC.
// Qué hace: fija seis facultades, procedencia y la regla de no tocar rector/vicerrector.
// Amenaza: evita que un seed de imágenes modifique autoridades fuera de su alcance.
// Límite: prueba el contrato de datos; la disponibilidad del archivo se verifica contra el CMS después del seed.
import { describe, expect, it } from 'vitest'
import data from '../../scripts/lib/decanosAutoridadesSeedData.mjs'

describe('AUT-DECANOS — fotos oficiales de autoridades', () => {
  it('usa la página oficial y cubre solo los decanos pendientes', () => {
    expect(data.SOURCE).toBe('https://www.unc.edu.py/autoridades/')
    expect(data.DECANOS).toHaveLength(5)
    expect(new Set(data.DECANOS.map((row: { facultySlug: string }) => row.facultySlug)).size).toBe(5)
  })

  it('solo define autoridades de tipo decano con imagen UNC', () => {
    expect(data.DECANOS.every((row: { type: string; image: { url: string } }) => row.type === 'decano' && row.image.url.startsWith('https://unc.edu.py/'))).toBe(true)
  })

  it('incluye a Medicina como decano pendiente', () => {
    expect(data.DECANOS).toEqual(expect.arrayContaining([
      expect.objectContaining({
        facultySlug: 'facultad-de-medicina',
        name: 'Prof. Dr. Roberto Gustavo Barrios',
      }),
    ]))
    expect(data.DECANOS.some((row: { name: string }) => row.name.includes('Jorge Daniel Mello'))).toBe(false)
  })
})
