// FAC-04: Humanidades debe reutilizar la fuente oficial verificada y la página CMS dinámica.
// Amenaza que evita: publicar carreras/aranceles desactualizados o dejar una segunda fuente local divergente.
// Límite: la prueba verifica el contrato del seed y la composición; la carga real se comprueba contra PostgreSQL y HTTP.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const DATA = resolve(__dirname, '../../scripts/lib/humanidadesSeedData.mjs')
const PAGE = resolve(__dirname, '../../app/[locale]/facultades/humanidades/page.tsx')

describe('FAC-04 — seed oficial y página dinámica de Humanidades', () => {
  it('declara la fuente oficial y las colecciones completas', async () => {
    const data = await import(DATA)
    expect(data.SOURCES.S1).toBe('https://www.unc.edu.py/facultad-de-humanidades-y-ciencias-de-la-educacion/')
    expect(data.FACULTAD_SLUG).toBe('facultad-de-humanidades-y-ciencias-de-la-educacion')
    expect(data.CARRERAS.length).toBe(26)
    expect(data.ARANCELES.length).toBe(26)
    expect(data.OMITIDOS.map((row: { concepto: string }) => row.concepto)).toEqual(['Aranceles Educativos', 'Servicios educativos'])
    expect(data.CARRERAS.every((row: { sourceUrl: string }) => row.sourceUrl === data.SOURCES.S1)).toBe(true)
    expect(data.ARANCELES.every((row: { sourceUrl: string }) => row.sourceUrl === data.SOURCES.S1)).toBe(true)
  })

  it('consume FacultadView y no mantiene catálogos académicos locales', () => {
    const src = readFileSync(PAGE, 'utf8')
    expect(src).toContain("import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'")
    expect(src).toContain("const SLUG = 'facultad-de-humanidades-y-ciencias-de-la-educacion'")
    expect(src).not.toContain('const GRADO:')
    expect(src).not.toContain('const POSGRADO:')
    expect(src).not.toContain('const FEES =')
  })
})
