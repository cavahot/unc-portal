// PILARES-01 (T1–T2): modelo del portal y siembra del global `pilares-academicos`
// (spec docs/specs/portal/PILARES-ACADEMICOS.md; tarea odd/tasks/pilares-academicos.md, S3 y S4).
// Amenazas: (1) una cifra de relleno o sin fuente en la portada; (2) una página «publicada» vacía; (3) un ícono libre;
// (4) la siembra pisa ediciones del panel, escribe en un CMS remoto o carga cifras sin fuente.
// Límite: `fetch` simulado; no toca red ni base de datos.
import { describe, expect, it, vi } from 'vitest'

import { mapPilares } from '../../lib/cms/pilares'
import { PILARES_SEED, run } from '../../scripts/seed-pilares-academicos.mjs'

const STATS = { totalEstudiantes: 4985, totalCarrerasAcreditadas: 10, totalDocentes: 762 }
const base = (extra: Record<string, unknown> = {}) => ({
  titulo: 'Docencia',
  descripcion: 'Formación de grado y posgrado.',
  enlaceTexto: 'Ir a Docencia',
  icono: 'birrete',
  ...extra,
})

describe('PILARES-01: modelo del portal', () => {
  it('métricas vinculadas a «Estadísticas» con formato por idioma', () => {
    const raw = { docencia: base({ metricas: [{ origen: 'estadistica', estadistica: 'totalEstudiantes', etiqueta: 'Estudiantes' }] }) }
    expect(mapPilares(raw, STATS, 'es')[0].metricas).toEqual([{ valor: '4.985', etiqueta: 'Estudiantes' }])
    expect(mapPilares(raw, STATS, 'gn')[0].metricas[0].valor).toBe('4.985')
    expect(mapPilares(raw, STATS, 'en')[0].metricas[0].valor).toBe('4,985')
  })

  it('descarta métricas sin dato: estadística ausente o en cero, a mano sin fuente o sin etiqueta', () => {
    const raw = {
      docencia: base({
        metricas: [
          { origen: 'estadistica', estadistica: 'totalEgresados', etiqueta: 'Egresados' },
          { origen: 'manual', valor: '45+', etiqueta: 'Líneas' },
          { origen: 'manual', valor: '45+', fuente: 'Informe 2025', etiqueta: '' },
        ],
      }),
    }
    expect(mapPilares(raw, STATS, 'es')[0].metricas).toEqual([])
    const conFuente = { docencia: base({ metricas: [{ origen: 'manual', valor: '45+', fuente: 'Informe 2025', etiqueta: 'Líneas' }] }) }
    expect(mapPilares(conFuente, STATS, 'es')[0].metricas).toEqual([{ valor: '45+', etiqueta: 'Líneas' }])
  })

  it('a lo sumo dos métricas en la tarjeta', () => {
    const m = (e: string) => ({ origen: 'estadistica', estadistica: e, etiqueta: e })
    const raw = { docencia: base({ metricas: [m('totalEstudiantes'), m('totalDocentes'), m('totalCarrerasAcreditadas')] }) }
    expect(mapPilares(raw, STATS, 'es')[0].metricas).toHaveLength(2)
  })

  it('un pilar incompleto no se publica; el orden es Docencia, Investigación, Extensión', () => {
    const raw = { extension: base({ titulo: 'Extensión' }), investigacion: base({ descripcion: '' }), docencia: base() }
    expect(mapPilares(raw, STATS, 'es').map((p) => p.key)).toEqual(['docencia', 'extension'])
    expect(mapPilares(null, STATS, 'es')).toEqual([])
  })

  it('«publicada» sin contenido sigue en construcción; con contenido se publica', () => {
    const vacio = { docencia: base({ pagina: { estado: 'publicada', contenido: { root: { children: [] } } } }) }
    expect(mapPilares(vacio, STATS, 'es')[0].estado).toBe('construccion')
    const lleno = { docencia: base({ pagina: { estado: 'publicada', contenido: { root: { children: [{ type: 'paragraph', children: [] }] } } } }) }
    expect(mapPilares(lleno, STATS, 'es')[0]).toMatchObject({ estado: 'publicada', href: '/docencia' })
  })

  it('un ícono desconocido vuelve al del pilar', () => {
    expect(mapPilares({ investigacion: base({ icono: '<svg onload=x>' }) }, STATS, 'es')[0].icono).toBe('matraz')
  })
})

const ENV = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'seed@example.test', CMS_PASSWORD: 'una-clave-de-prueba-segura-1' }

function fakeFetch(opts: { global?: unknown; postStatus?: number } = {}) {
  const calls: Array<{ method: string; url: string; body?: unknown }> = []
  const impl = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const method = init?.method ?? 'GET'
    calls.push({ method, url, body: init?.body ? JSON.parse(init.body) : undefined })
    const json = (status: number, data: unknown) => ({ ok: status < 400, status, json: async () => data })
    if (url.endsWith('/api/users/login')) return json(200, { token: 'tok' })
    if (url.includes('/api/globals/pilares-academicos') && method === 'GET') return json(200, opts.global ?? {})
    if (url.includes('/api/globals/pilares-academicos') && method === 'POST') return json(opts.postStatus ?? 200, {})
    return json(404, {})
  })
  return { impl, calls }
}

describe('PILARES-01: siembra', () => {
  it('el contenido sembrado es publicable: 3 tarjetas, Docencia con 2 cifras de «Estadísticas», todo en construcción', () => {
    const pilares = mapPilares(PILARES_SEED, STATS, 'es')
    expect(pilares.map((p) => p.key)).toEqual(['docencia', 'investigacion', 'extension'])
    expect(pilares[0].metricas).toEqual([
      { valor: '10', etiqueta: 'Carreras acreditadas' },
      { valor: '4.985', etiqueta: 'Estudiantes activos' },
    ])
    expect(pilares.every((p) => p.estado === 'construccion')).toBe(true)
  })

  it('no carga ninguna cifra a mano y respeta los topes del CMS', () => {
    for (const pilar of Object.values(PILARES_SEED) as Array<Record<string, any>>) {
      const todas = [...pilar.metricas, ...pilar.pagina.estadisticas]
      expect(todas.every((m: { origen: string }) => m.origen === 'estadistica')).toBe(true)
      expect(pilar.titulo.length).toBeLessThanOrEqual(60)
      expect(pilar.bajada.length).toBeLessThanOrEqual(60)
      expect(pilar.descripcion.length).toBeLessThanOrEqual(260)
      expect(pilar.enlaceTexto.length).toBeLessThanOrEqual(40)
      expect(pilar.metricas.length).toBeLessThanOrEqual(2)
    }
  })

  it('dry-run (por defecto): sin red', async () => {
    const { impl } = fakeFetch()
    await run({ deps: { env: ENV, fetch: impl, log: () => {} } })
    expect(impl).not.toHaveBeenCalled()
  })

  it('--apply con el global vacío escribe una vez; con contenido se omite', async () => {
    const vacio = fakeFetch()
    const r1 = await run({ apply: true, deps: { env: ENV, fetch: vacio.impl, log: () => {} } })
    expect(r1.counts.creados).toBe(1)
    expect(vacio.calls.filter((c) => c.method === 'POST' && c.url.includes('pilares-academicos'))).toHaveLength(1)

    const lleno = fakeFetch({ global: { docencia: { titulo: 'Editado en el panel' } } })
    const r2 = await run({ apply: true, deps: { env: ENV, fetch: lleno.impl, log: () => {} } })
    expect(r2.counts.omitidos).toBe(1)
    expect(lleno.calls.some((c) => c.method === 'POST' && c.url.includes('pilares-academicos'))).toBe(false)
  })

  it('rechaza un CMS remoto sin --allow-remote', async () => {
    const { impl } = fakeFetch()
    await expect(run({ apply: true, deps: { env: { ...ENV, CMS_URL: 'https://cms.example.org' }, fetch: impl, log: () => {} } })).rejects.toThrow(/solo escribe en un CMS local/)
  })
})
