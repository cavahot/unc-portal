// FAC-05: consulta del listado /facultades (`getFacultadesLista`): estados ok/empty/unavailable y conteo de carreras.
// Amenazas: nombres de facultades escritos en el código cuando el CMS falla (parecen oficiales); «no disponible»
// confundido con «vacío»; un «0 carreras» inventado cuando solo falla el conteo. Límite: simula el cliente del CMS.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { getFacultadesLista } from '../../lib/cms/queries/facultadesLista'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('FAC-05 consulta del listado', () => {
  beforeEach(() => { cmsFetch.mockReset() })
  const fac = [
    { slug: 'facultad-de-odontologia', nombre: 'Facultad de Odontología', descripcion: ' Formación en salud oral. ' },
    { slug: 'facultad-de-medicina', nombre: 'Facultad de Medicina' },
    { slug: '', nombre: 'Sin slug' },
    { slug: 'sin-nombre' },
  ]

  it('mapea facultades válidas y cuenta las carreras por facultad', async () => {
    cmsFetch.mockImplementation(async (url: string) =>
      url.startsWith('/facultades')
        ? { docs: fac }
        : { docs: [{ facultad: { slug: 'facultad-de-odontologia' } }, { facultad: { slug: 'facultad-de-odontologia' } }, { facultad: 7 }, {}] },
    )
    const r = await getFacultadesLista()
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.facultades.map((f) => f.slug)).toEqual(['facultad-de-odontologia', 'facultad-de-medicina'])
    expect(r.facultades[0]).toMatchObject({ descripcion: 'Formación en salud oral.', carreras: 2 })
    expect(r.facultades[1]).toMatchObject({ descripcion: undefined, carreras: 0 })
  })

  it('sin facultades activas es «empty» y con el CMS caído es «unavailable» (nunca nombres inventados)', async () => {
    cmsFetch.mockResolvedValue({ docs: [] })
    expect((await getFacultadesLista()).status).toBe('empty')
    cmsFetch.mockRejectedValue(new Error('boom'))
    const r = await getFacultadesLista()
    expect(r).toEqual({ status: 'unavailable' })
    expect(JSON.stringify(r)).not.toMatch(/Odontolog/)
  })

  it('si falla solo el conteo de carreras, muestra las facultades sin conteo (null) y no un cero falso', async () => {
    cmsFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('/facultades')) return { docs: fac.slice(0, 1) }
      throw new Error('carreras caídas')
    })
    const r = await getFacultadesLista()
    expect(r.status === 'ok' && r.facultades[0].carreras).toBeNull()
  })

  it('el código de la consulta no trae nombres de facultades', () => {
    expect(read('lib/cms/queries/facultadesLista.ts')).not.toMatch(/Odontolog|Medicina|Humanidades/)
  })
})
