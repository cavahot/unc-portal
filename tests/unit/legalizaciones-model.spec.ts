// INST-11 (T2-T3): consulta `getLegalizaciones` y siembra `seed-legalizaciones.mjs` (spec docs/specs/portal/LEGALIZACIONES.md §2.3-2.4).
// Amenazas: (1) una caída del CMS mostrada como «sin contenido»; (2) un monto de arancel inventado (solo sale de la fila
// enlazada); (3) pisar ediciones al re-ejecutar la siembra; (4) escribir en un CMS equivocado o sin credencial fuerte;
// (5) perder contenido al convertirlo desde el código de la página.
// Límite: un cliente del CMS y un `fetch` simulados; la siembra real contra el CMS local se verifica aparte.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { getLegalizaciones } from '../../lib/cms/queries/legalizaciones'
import { mapTitulosInscripcion } from '../../lib/cms/titulos'
// @ts-expect-error módulo .mjs sin tipos
import { ARANCEL_CONCEPTO, AVISO_FUENTE, LEGALIZACIONES_SEED, plannedDocument, run } from '../../scripts/seed-legalizaciones.mjs'

const doc = (over: Record<string, unknown> = {}) => ({
  titulo: 'Legalización de documentos',
  descripcion: 'Servicio.',
  unidad: 'Secretaría General — UNC',
  plazoMinHoras: 12,
  plazoMaxHoras: 24,
  arancel: { id: 7, concepto: 'Legalizaciones', monto: 50000, active: true },
  tipos: [{ slug: 'titulos', etiqueta: 'Categoría 1', titulo: 'Títulos', acento: 'verde', requisitos: [{ texto: 'Original.' }] }],
  pasos: [{ responsable: 'Recurrente', descripcion: 'Presenta.' }],
  ...over,
})

describe('INST-11 getLegalizaciones', () => {
  beforeEach(() => {
    cmsFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('pide el global con el arancel poblado y las etiquetas del global y de aranceles', async () => {
    cmsFetch.mockResolvedValue(doc())
    await getLegalizaciones()
    const [path, opts] = cmsFetch.mock.calls[0]
    expect(path).toBe('/globals/legalizaciones?depth=1')
    expect(opts.tags).toEqual(['legalizaciones', 'aranceles-rectorado'])
  })

  it('ok con contenido: categorías, pasos numerados, plazo y arancel de la fila enlazada', async () => {
    cmsFetch.mockResolvedValue(doc())
    const r = await getLegalizaciones()
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.data.tipos).toHaveLength(1)
    expect(r.data.pasos[0].numero).toBe(1)
    expect(r.data.plazo).toEqual({ min: 12, max: 24 })
    expect(r.data.arancel).toEqual({ concepto: 'Legalizaciones', monto: 50000 })
    expect(r.data.notaCones).toBeNull() // no aplica a legalizaciones
  })

  it('arancel sin enlazar, sin poblar o inactivo: no hay monto (nunca uno inventado)', async () => {
    for (const arancel of [null, undefined, 7, { concepto: 'Legalizaciones', monto: 50000, active: false }]) {
      cmsFetch.mockResolvedValue(doc({ arancel }))
      const r = await getLegalizaciones()
      expect(r.status === 'ok' && r.data.arancel).toBeNull()
    }
  })

  it('empty sin categorías, sin pasos o sin título; unavailable en una caída o una forma inesperada', async () => {
    for (const bad of [doc({ tipos: [] }), doc({ pasos: [] }), doc({ titulo: ' ' })]) {
      cmsFetch.mockResolvedValue(bad)
      expect(await getLegalizaciones()).toEqual({ status: 'empty' })
    }
    cmsFetch.mockRejectedValue(new Error('http://cms.interno SECRETO'))
    expect(await getLegalizaciones()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue('no es objeto')
    expect(await getLegalizaciones()).toEqual({ status: 'unavailable' })
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(' ')
    expect(logged).not.toContain('SECRETO')
  })
})

/** CMS simulado en memoria: login, el global y la fila de aranceles. */
function fakeCms(opts: { existente?: Record<string, unknown>; sinArancel?: boolean } = {}) {
  let store: Record<string, unknown> = opts.existente ?? {}
  const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = []
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined })
    const u = new URL(url)
    if (u.pathname === '/api/users/login') return json({ token: 'tok' })
    if (u.pathname === '/api/globals/legalizaciones') {
      if (method === 'GET') return json(store)
      if (method === 'POST') {
        store = JSON.parse(init.body as string)
        return json({ result: store })
      }
    }
    if (u.pathname === '/api/aranceles-rectorado') return json({ docs: opts.sinArancel ? [] : [{ id: 7 }] })
    return json({}, 404)
  }
  return { fetch, calls, get store() { return store } }
}
const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'editor@example.test', CMS_PASSWORD: 'una-clave-sintetica-larga' }
const quiet = () => {}

describe('INST-11 datos de la siembra', () => {
  it('trae las 3 categorías, los 10 pasos y el plazo de 12 a 24 horas', () => {
    expect(LEGALIZACIONES_SEED.tipos).toHaveLength(3)
    expect(LEGALIZACIONES_SEED.tipos.map((t: { requisitos: unknown[] }) => t.requisitos.length)).toEqual([2, 1, 4])
    expect(LEGALIZACIONES_SEED.pasos).toHaveLength(10)
    expect([LEGALIZACIONES_SEED.plazoMinHoras, LEGALIZACIONES_SEED.plazoMaxHoras]).toEqual([12, 24])
    expect(ARANCEL_CONCEPTO).toBe('Legalizaciones')
  })

  it('no guarda el monto del arancel y no usa voseo', () => {
    expect(JSON.stringify(LEGALIZACIONES_SEED)).not.toMatch(/50\.?000|monto/)
    expect(JSON.stringify(LEGALIZACIONES_SEED)).not.toMatch(/\b(querés|Identificá|Consultá|Mirá|podés)\b/)
  })

  it('el contenido sembrado pasa por el mapper del portal sin perder filas', () => {
    const d = mapTitulosInscripcion(plannedDocument(7))!
    expect(d.tipos).toHaveLength(3)
    expect(d.pasos).toHaveLength(10)
    expect(d.plazo).toEqual({ min: 12, max: 24 })
  })
})

describe('INST-11 siembra', () => {
  it('por defecto es dry-run: sin red, con el aviso de que no hubo revisión de la fuente', async () => {
    const cms = fakeCms()
    const logs: string[] = []
    const r = await run({ deps: { env, fetch: cms.fetch, log: (m: string) => logs.push(m) } })
    expect(r.dryRun).toBe(true)
    expect(cms.calls).toHaveLength(0)
    expect(logs.join('\n')).toContain(AVISO_FUENTE)
  })

  it('con --apply crea el global y enlaza el arancel por su id', async () => {
    const cms = fakeCms()
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 1, omitidos: 0, errores: 0 })
    expect(cms.store.arancel).toBe(7)
    expect((cms.store.pasos as unknown[]).length).toBe(10)
  })

  it('sin la fila de arancel siembra igual, sin relación y sin monto', async () => {
    const cms = fakeCms({ sinArancel: true })
    const logs: string[] = []
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: (m: string) => logs.push(m) } })
    expect(r.counts.creados).toBe(1)
    expect('arancel' in cms.store).toBe(false)
    expect(logs.join('\n')).toContain('No se encontró la fila de arancel')
  })

  it('un global con contenido no se modifica y repetir la siembra omite', async () => {
    const existente = { titulo: 'Editado por la institución' }
    const cms = fakeCms({ existente })
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 0, omitidos: 1, errores: 0 })
    expect(cms.store).toEqual(existente)
    expect(cms.calls.filter((c) => c.method === 'POST' && c.url.includes('/globals/'))).toHaveLength(0)
    const cms2 = fakeCms()
    await run({ apply: true, deps: { env, fetch: cms2.fetch, log: quiet } })
    const again = await run({ apply: true, deps: { env, fetch: cms2.fetch, log: quiet } })
    expect(again.counts.omitidos).toBe(1)
  })

  it('solo usa GET y POST y cuenta un error de escritura', async () => {
    const cms = fakeCms()
    await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(new Set(cms.calls.map((c) => c.method))).toEqual(new Set(['GET', 'POST']))
    const failing = async (url: string, init: { method?: string; body?: string } = {}) =>
      url.endsWith('/globals/legalizaciones') && init.method === 'POST' ? new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), { status: 400 }) : fakeCms().fetch(url, init)
    const r = await run({ apply: true, deps: { env, fetch: failing, log: quiet } })
    expect(r.counts.errores).toBe(1)
  })

  it('rechaza un destino remoto sin --allow-remote y una contraseña débil, sin imprimir la credencial', async () => {
    const cms = fakeCms()
    const logs: string[] = []
    await expect(run({ apply: true, deps: { env: { ...env, CMS_URL: 'https://cms.example.org' }, fetch: cms.fetch, log: quiet } })).rejects.toThrow(/solo escribe en un CMS local/)
    await expect(run({ apply: true, deps: { env: { ...env, CMS_PASSWORD: 'corta' }, fetch: cms.fetch, log: (m: string) => logs.push(m) } })).rejects.toThrow(/demasiado corta/)
    expect(cms.calls).toHaveLength(0)
    expect(logs.join('\n')).not.toContain(env.CMS_PASSWORD)
  })
})
