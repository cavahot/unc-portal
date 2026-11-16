// AUT-FACET: contrato del catálogo de autoridades y fotos oficiales de FACET-UNC.
// Qué hace: prueba la procedencia, roles críticos y cobertura de imágenes antes de sembrar Payload.
// Amenaza: evita reemplazar al decano correcto por una autoridad antigua o guardar fotos sin relación verificable.
// Límite: no valida visualmente cada fotografía; la respuesta HTTP y los hashes de media se verifican en el seed.
import { describe, expect, it } from 'vitest'
import data from '../../scripts/lib/facetAutoridadesSeedData.mjs'

describe('AUT-FACET — autoridades, directivos y fotos oficiales', () => {
  it('conserva las fuentes oficiales y el catálogo completo', () => {
    expect(data.SOURCES.page).toBe('https://facet-unc.edu.py/autoridades-y-directivos/')
    expect(data.SOURCES.embedded).toBe('https://facet-unc.edu.py/extras_facet/autoridades/index.html')
    expect(data.AUTHORITIES.length).toBe(29)
  })

  it('asigna el decanato vigente de FACET y conserva el vicedecanato', () => {
    expect(data.AUTHORITIES.find((row: { type: string }) => row.type === 'decano')).toMatchObject({
      name: 'Prof. Mg. Jorge Elías Sanz Cabrera',
      role: 'Decano FACET',
    })
    expect(data.AUTHORITIES).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Prof. Dr. Jorge Daniel Mello Román', role: 'Vicedecano FACET' }),
    ]))
  })

  it('conserva fotos oficiales y no inventa fotos para cargos sin imagen publicada', () => {
    const withPhoto = data.AUTHORITIES.filter((row: { photo: unknown }) => row.photo)
    const withoutPhoto = data.AUTHORITIES.filter((row: { photo: unknown }) => !row.photo)
    expect(withPhoto.length).toBe(12)
    expect(withoutPhoto.length).toBe(17)
    expect(withPhoto.every((row: { photo: { url: string } }) => row.photo.url.startsWith('https://facet-unc.edu.py/'))).toBe(true)
  })
})
