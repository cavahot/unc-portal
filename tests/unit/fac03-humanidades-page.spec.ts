// FAC-03: Humanidades comparte la composición institucional reutilizable de Odontología.
// Amenaza que evita: mantener una variante visual aislada y un catálogo académico local divergente.
// Límite: el contrato visual profundo vive en FacultadView y sus componentes; aquí verificamos el ensamblaje correcto.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGE = resolve(__dirname, '../../app/[locale]/facultades/humanidades/page.tsx')

describe('página de Humanidades — composición institucional FAC-03', () => {
  const src = readFileSync(PAGE, 'utf8')

  it('usa el contenedor CMS compartido con Odontología', () => {
    expect(src).toMatch(/import FacultadView, \{ facultadMetadata \} from '@\/components\/facultades\/FacultadView'/)
    expect(src).toMatch(/<FacultadView/)
    expect(src).toContain("const SLUG = 'facultad-de-humanidades-y-ciencias-de-la-educacion'")
  })

  it('no conserva catálogos académicos o aranceles locales', () => {
    expect(src).not.toContain('const GRADO:')
    expect(src).not.toContain('const POSGRADO:')
    expect(src).not.toContain('const FEES =')
    expect(src).not.toContain('<main')
  })

  it('mantiene la ruta de metadatos y parámetros de locale', () => {
    expect(src).toMatch(/generateMetadata\(\{ params \}: \{ params: Promise<\{ locale: string \}> \}\)/)
    expect(src).toMatch(/facultadMetadata\(SLUG, locale\)/)
    expect(src).toMatch(/locale=\{locale\}/)
  })
})
