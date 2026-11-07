// FAC-05: contrato de Medicina basado en la fuente oficial de la UNC.
// Qué hace: garantiza que el catálogo y el contacto sembrados tengan procedencia verificable.
// Amenaza: evita repetir el error histórico de mantener carreras y aranceles locales fuera del CMS.
// Límite: no prueba que el CMS vivo haya sido cargado; esa aceptación se verifica por API, PostgreSQL y HTML.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../../scripts/lib/medicinaSeedData.mjs'

const PAGE = resolve(__dirname, '../../app/[locale]/facultades/medicina/page.tsx')

describe('FAC-05 Medicina — seed oficial y portal CMS', () => {
  it('conserva la fuente oficial y el slug de Payload', () => {
    expect(data.SOURCES.S1).toBe('https://www.unc.edu.py/facultad-de-medicina/')
    expect(data.FACULTAD_SLUG).toBe('facultad-de-medicina')
    expect(data.CARRERAS).toHaveLength(3)
    expect(data.CARRERAS.map((row: { tipo: string }) => row.tipo)).toEqual(['grado', 'posgrado', 'posgrado'])
  })

  it('conserva resoluciones CONES y omite aranceles no publicados por la fuente', () => {
    expect(data.CARRERAS.flatMap((row: { resoluciones: unknown[] }) => row.resoluciones)).toHaveLength(4)
    expect(data.ARANCELES).toEqual([])
    expect(data.OMITIDOS).toEqual(expect.arrayContaining([
      expect.objectContaining({ concepto: 'Aranceles facultad' }),
    ]))
  })

  it('la página es un contenedor dinámico y no conserva datos locales', () => {
    const src = readFileSync(PAGE, 'utf8')
    expect(src).toContain("import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'")
    expect(src).toContain("const SLUG = 'facultad-de-medicina'")
    expect(src).not.toMatch(/ARANCELES|DEMO_|ProgramTable|ArancelTable/)
    expect(src).not.toMatch(/<main\b/)
  })
})
