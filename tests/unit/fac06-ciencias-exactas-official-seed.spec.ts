// FAC-06: contrato de Ciencias Exactas basado en la fuente oficial de la UNC.
// Qué hace: fija procedencia, catálogo y ausencia de datos inventados antes de migrar la página.
// Amenaza: evita que el portal conserve tablas demo o aranceles locales fuera del CMS.
// Límite: no sustituye la lectura de vuelta en CMS, PostgreSQL y HTML real.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../../scripts/lib/cienciasExactasSeedData.mjs'

const PAGE = resolve(__dirname, '../../app/[locale]/facultades/ciencias-exactas/page.tsx')

describe('FAC-06 Ciencias Exactas — seed oficial y portal CMS', () => {
  it('conserva la fuente oficial, el slug y el catálogo separado por tipo', () => {
    expect(data.SOURCES.S1).toBe('https://www.unc.edu.py/facultad-de-ciencias-exactas-y-tecnologicas/')
    expect(data.FACULTAD_SLUG).toBe('facultad-de-ciencias-exactas-y-tecnologicas')
    expect(data.CARRERAS.filter((row: { tipo: string }) => row.tipo === 'grado')).toHaveLength(3)
    expect(data.CARRERAS.filter((row: { tipo: string }) => row.tipo === 'posgrado')).toHaveLength(2)
  })

  it('conserva aranceles publicados y registra los datos que no deben inventarse', () => {
    expect(data.ARANCELES.length).toBeGreaterThan(0)
    expect(data.OMITIDOS).toEqual(expect.arrayContaining([
      expect.objectContaining({ concepto: 'Aranceles Educativos' }),
    ]))
  })

  it('usa FacultadView como contenedor dinámico sin catálogos locales', () => {
    const src = readFileSync(PAGE, 'utf8')
    expect(src).toContain("import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'")
    expect(src).toContain("const SLUG = 'facultad-de-ciencias-exactas-y-tecnologicas'")
    expect(src).not.toMatch(/ARANCELES|DEMO_|ProgramTable|ArancelTable/)
    expect(src).not.toMatch(/<main\b/)
  })
})
