// FAC-01: consulta de la página de facultad (lib/cms/queries/facultad.ts). Spec FACULTADES.md §2.
// Amenazas: (1) una caída del CMS tapada con datos de demostración; (2) pedir filas inactivas o sin tope;
// (3) mostrar una acreditación no verificada; (4) que una sección caída tumbe toda la página.
// Límite: se simula `fetch`; la verificación en vivo contra el CMS local está en el informe.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFacultadDetalle } from '@/lib/cms/queries/facultad'

type Routes = Record<string, { status?: number; body: unknown }>

function stubFetch(routes: Routes) {
  const calls: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(href)
      calls.push(url)
      const key = Object.keys(routes).find((k) => url.pathname.endsWith(`/api/${k}`))
      const r = key ? routes[key] : { status: 404, body: {} }
      return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const FAC = { id: 6, nombre: 'Facultad de Odontología', slug: 'facultad-de-odontologia', activa: true }
const OK: Routes = {
  facultades: { body: { docs: [FAC] } },
  carreras: { body: { docs: [{ id: 1, nombre: 'Odontología', tipo: 'grado', resoluciones: [{ numero: '165/15' }] }] } },
  autoridades: { body: { docs: [{ id: 3, name: 'Prof. Dr. Carlos Ramón Lima De León', role: 'Decano', type: 'decano', faculty: FAC }] } },
  acreditaciones: { body: { docs: [{ id: 2, programa: 'Odontología', organismo: 'aneaes', active: true, verificado: false, fuenteUrl: 'https://www.aneaes.gov.py/' }] } },
  'aranceles-facultad': { body: { docs: [{ id: 9, concepto: 'Multas', monto: 10000, grupo: 'multas' }] } },
}

describe('getFacultadDetalle', () => {
  it('ok: arma todas las secciones con filtros de activos, tope y slug de la facultad', async () => {
    const calls = stubFetch(OK)
    const r = await getFacultadDetalle('facultad-de-odontologia')
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.facultad.nombre).toBe('Facultad de Odontología')
    expect(r.carreras).toMatchObject({ status: 'ok' })
    expect(r.decano?.name).toBe('Prof. Dr. Carlos Ramón Lima De León')
    expect(r.acreditaciones).toEqual([]) // verificado=false -> nunca se muestra
    expect(r.aranceles.map((g) => g.grupo)).toEqual(['multas'])
    const byPath = (p: string) => calls.find((u) => u.pathname.endsWith(`/api/${p}`))!.searchParams
    expect(byPath('facultades').get('where[slug][equals]')).toBe('facultad-de-odontologia')
    expect(byPath('facultades').get('where[activa][equals]')).toBe('true')
    expect(byPath('carreras').get('where[facultad.slug][equals]')).toBe('facultad-de-odontologia')
    expect(byPath('carreras').get('where[activa][equals]')).toBe('true')
    expect(byPath('autoridades').get('where[type][equals]')).toBe('decano')
    expect(byPath('autoridades').get('where[active][equals]')).toBe('true')
    expect(byPath('acreditaciones').get('where[verificado][equals]')).toBe('true')
    expect(byPath('aranceles-facultad').get('where[active][equals]')).toBe('true')
    for (const u of calls) expect(Number(u.searchParams.get('limit'))).toBeLessThanOrEqual(200)
  })

  it('not-found: la facultad no existe o está inactiva', async () => {
    stubFetch({ ...OK, facultades: { body: { docs: [] } } })
    expect((await getFacultadDetalle('x')).status).toBe('not-found')
    stubFetch({ ...OK, facultades: { body: { docs: [{ ...FAC, activa: false }] } } })
    expect((await getFacultadDetalle('x')).status).toBe('not-found')
  })

  it('unavailable: CMS caído al pedir la facultad (sin datos inventados)', async () => {
    stubFetch({ ...OK, facultades: { status: 503, body: {} } })
    expect(await getFacultadDetalle('facultad-de-odontologia')).toEqual({ status: 'unavailable' })
  })

  it('carreras vacías -> empty; carreras caídas -> unavailable; las demás secciones siguen', async () => {
    stubFetch({ ...OK, carreras: { body: { docs: [] } } })
    let r = await getFacultadDetalle('facultad-de-odontologia')
    expect(r.status === 'ok' && r.carreras).toEqual({ status: 'empty' })
    stubFetch({ ...OK, carreras: { status: 500, body: {} }, autoridades: { status: 500, body: {} } })
    r = await getFacultadDetalle('facultad-de-odontologia')
    expect(r.status === 'ok' && r.carreras).toEqual({ status: 'unavailable' })
    expect(r.status === 'ok' && r.decano).toBeNull()
    expect(r.status === 'ok' && r.aranceles.length).toBe(1)
  })

  it('una acreditación activa y verificada sí aparece', async () => {
    stubFetch({
      ...OK,
      acreditaciones: { body: { docs: [{ id: 2, programa: 'Odontología', organismo: 'aneaes', active: true, verificado: true, fuenteUrl: 'https://www.aneaes.gov.py/' }] } },
    })
    const r = await getFacultadDetalle('facultad-de-odontologia')
    expect(r.status === 'ok' && r.acreditaciones.map((a) => a.programa)).toEqual(['Odontología'])
  })
})
