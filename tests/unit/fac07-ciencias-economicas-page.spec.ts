// FAC-07: contrato de migración de Ciencias Económicas al portal compartido.
// Qué hace: impide que la ruta vuelva a publicar catálogos o aranceles hardcodeados.
// Amenaza: evita divergencia entre Payload CMS y una segunda fuente estática en la página.
// Límite: no prueba la disponibilidad del CMS; esa verificación se ejecuta con el seed y la página real.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/[locale]/facultades/ciencias-economicas/page.tsx', 'utf8')

describe('FAC-07 — Ciencias Económicas usa FacultadView', () => {
  it('delega la composición al componente institucional compartido', () => {
    expect(page).toContain("import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'")
    expect(page).toContain('<FacultadView slug={SLUG} locale={locale} />')
    expect(page).toContain('export async function generateMetadata')
  })

  it('no conserva catálogos locales ni datos demo', () => {
    expect(page).not.toMatch(/const\s+(ARANCELES|DEMO_GRADO|DEMO_POSGRADO)\b/)
    expect(page).not.toContain('ProgramTable')
    expect(page).not.toContain('ArancelTable')
  })
})
