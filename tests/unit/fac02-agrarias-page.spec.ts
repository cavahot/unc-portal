// FAC-02: la página de Agrarias es un contenedor fino sobre FacultadView (100 % CMS, sin datos de demostración).
// Amenazas: (1) aranceles/carreras de demostración escritos en el código que aparenten ser oficiales;
// (2) slug distinto del real en el CMS (página vacía o de otra facultad); (3) CMS caído que muestre datos inventados.
// Límite: render estático con el CMS simulado; el render con datos reales se verifica en el navegador.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const PAGE = resolve(__dirname, '../../app/[locale]/facultades/agrarias/page.tsx')
const SEED_DATA = resolve(__dirname, '../../scripts/lib/agrariasSeedData.mjs')

const state = vi.hoisted(() => ({ result: { status: 'unavailable' } as any }))
vi.mock('@/lib/cms/queries/facultad', () => ({
  getFacultadDetalle: async () => state.result,
  FACULTAD_TAGS: [],
}))
vi.mock('@/lib/i18n/server', () => ({ getT: async () => (key: string) => key }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

describe('página de Agrarias', () => {
  const src = readFileSync(PAGE, 'utf8')

  it('es un contenedor: importa FacultadView y no trae datos de demostración', () => {
    expect(src).toMatch(/from '@\/components\/facultades\/FacultadView'/)
    expect(src).not.toMatch(/ARANCELES|DEMO_|Ingenier[ií]a Agron[oó]mica/)
    expect(src.split('\n').length).toBeLessThan(40)
  })
  it('conserva ISR de 60 s', () => {
    expect(src).toMatch(/export const revalidate = 60\b/)
  })
  it('usa el slug real del CMS (el de los datos sembrados si existen)', async () => {
    expect(src).toMatch(/const SLUG = 'facultad-de-ciencias-agrarias'/)
    if (existsSync(SEED_DATA)) {
      const data = await import(/* @vite-ignore */ SEED_DATA)
      expect(data.FACULTAD_SLUG).toBe('facultad-de-ciencias-agrarias')
    }
  })
  it('CMS no disponible: aviso honesto, sin datos de demostración', async () => {
    const FacultadView = (await import('@/components/facultades/FacultadView')).default
    state.result = { status: 'unavailable' }
    const html = renderToStaticMarkup(await FacultadView({ slug: 'facultad-de-ciencias-agrarias', locale: 'es' }))
    expect(html).toContain('states.unavailable')
    expect(html).not.toMatch(/Agron|Gs\.|₲/)
  })
  it('facultad inexistente: 404 en lugar de datos inventados', async () => {
    const FacultadView = (await import('@/components/facultades/FacultadView')).default
    state.result = { status: 'not-found' }
    await expect(FacultadView({ slug: 'facultad-de-ciencias-agrarias', locale: 'es' })).rejects.toThrow('NEXT_NOT_FOUND')
    void createElement
  })
})
