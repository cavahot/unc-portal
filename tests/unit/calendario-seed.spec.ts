// INST-07 (T3): siembra de la colección `calendario-academico` (scripts/seed-calendario.mjs; spec docs/specs/portal/CALENDARIO.md §2.5).
// Amenazas: (1) pisar ediciones de Secretaría al re-ejecutar; (2) escribir en un CMS equivocado o sin credencial fuerte;
// (3) perder o alterar fechas al convertirlas desde el texto anterior; (4) una fecha desplazada un día por la zona horaria;
// (5) un dry-run que escriba algo; (6) sembrar fechas no verificadas sin avisarlo.
// Límite: simula el CMS con un `fetch` en memoria; la siembra real contra el CMS local se verifica aparte.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { AVISO_FECHAS, run, toCmsDate, toDoc } from '../../scripts/seed-calendario.mjs'
// @ts-expect-error módulo .mjs sin tipos
import { CALENDARIO_SEED } from '../../scripts/lib/calendarioSeedData.mjs'
import { mapBloque } from '../../lib/cms/calendario'

type Entrada = { evento?: string; descripcion?: string; inicio: string; fin?: string }
type Bloque = { titulo: string; tipo: 'semestre' | 'examenes'; anio: number; orden: number; entradas: Entrada[] }
const SEED = CALENDARIO_SEED as Bloque[]

/** CMS simulado en memoria: login y calendario-academico. */
function fakeCms(opts: { existentes?: Array<{ titulo: string; anio: number }> } = {}) {
  const docs: Array<Record<string, unknown>> = (opts.existentes ?? []).map((e, i) => ({ id: 100 + i, ...e }))
  const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = []
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined })
    const u = new URL(url)
    if (u.pathname === '/api/users/login') return json({ token: 'tok' })
    if (u.pathname === '/api/calendario-academico' && method === 'GET') {
      const titulo = u.searchParams.get('where[titulo][equals]')
      const anio = Number(u.searchParams.get('where[anio][equals]'))
      return json({ docs: docs.filter((d) => d.titulo === titulo && d.anio === anio) })
    }
    if (u.pathname === '/api/calendario-academico' && method === 'POST') {
      const doc = JSON.parse(init.body as string)
      docs.push({ id: docs.length + 1, ...doc })
      return json({ doc }, 201)
    }
    return json({}, 404)
  }
  return { fetch, calls, docs }
}

const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'editor@example.test', CMS_PASSWORD: 'una-clave-sintetica-larga' }
const quiet = () => {}

describe('INST-07 datos de la siembra', () => {
  it('trae los 2 semestres de 5 eventos y las 4 mesas de exámenes (14 fechas)', () => {
    expect(SEED).toHaveLength(3)
    expect(SEED.filter((b) => b.tipo === 'semestre').map((b) => b.entradas.length)).toEqual([5, 5])
    expect(SEED.find((b) => b.tipo === 'examenes')!.entradas).toHaveLength(4)
    expect(SEED.reduce((n, b) => n + b.entradas.length, 0)).toBe(14)
    expect(new Set(SEED.map((b) => b.anio))).toEqual(new Set([2026]))
  })

  it('conserva las fechas exactas del texto anterior (convertidas, no retranscritas)', () => {
    const [s1, s2, finales] = SEED
    expect(s1.entradas.map((e) => [e.evento, e.inicio, e.fin])).toEqual([
      ['inicio-clases', '2026-03-02', undefined],
      ['inscripcion-tardia', '2026-03-16', '2026-03-27'],
      ['parciales-1', '2026-05-05', '2026-05-16'],
      ['parciales-2', '2026-06-23', '2026-07-04'],
      ['cierre-semestre', '2026-07-11', undefined],
    ])
    expect(s2.entradas.map((e) => [e.evento, e.inicio, e.fin])).toEqual([
      ['inicio-clases', '2026-08-03', undefined],
      ['inscripcion-tardia', '2026-08-17', '2026-08-28'],
      ['parciales-1', '2026-10-05', '2026-10-16'],
      ['parciales-2', '2026-11-23', '2026-12-04'],
      ['cierre-semestre', '2026-12-11', undefined],
    ])
    expect(finales.entradas.map((e) => [e.inicio, e.fin])).toEqual([
      ['2025-12-01', '2025-12-19'],
      ['2026-02-02', '2026-02-20'],
      ['2026-07-14', '2026-08-01'],
      ['2026-12-01', '2026-12-19'],
    ])
  })

  it('cada entrada tiene fechas válidas, el fin va después del inicio y los semestres traen evento', () => {
    for (const b of SEED) {
      for (const e of b.entradas) {
        expect(e.inicio).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        if (e.fin) expect(e.fin > e.inicio).toBe(true)
        if (b.tipo === 'semestre') expect(e.evento, b.titulo).toBeTruthy()
        if (b.tipo === 'examenes') expect(e.evento).toBeUndefined()
      }
    }
  })

  it('el portal acepta cada bloque sembrado tal como lo enviará la siembra (de ida y vuelta sin perder fechas)', () => {
    for (const b of SEED) {
      const mapeado = mapBloque({ id: 1, ...toDoc(b) })
      expect(mapeado, b.titulo).not.toBeNull()
      expect(mapeado!.entradas.map((e) => [e.inicio, e.fin]), b.titulo).toEqual(b.entradas.map((e) => [e.inicio, e.fin]))
    }
  })

  it('las fechas se envían a mediodía UTC para que ninguna zona horaria las corra de día', () => {
    expect(toCmsDate('2026-03-02')).toBe('2026-03-02T12:00:00.000Z')
    const doc = toDoc(SEED[0])
    expect(doc.entradas[0]).toEqual({ evento: 'inicio-clases', inicio: '2026-03-02T12:00:00.000Z' })
    expect(doc.entradas[1]).toMatchObject({ inicio: '2026-03-16T12:00:00.000Z', fin: '2026-03-27T12:00:00.000Z' })
    expect(doc).toMatchObject({ tipo: 'semestre', anio: 2026, activa: true })
  })

  it('las mesas de exámenes se envían sin evento', () => {
    const doc = toDoc(SEED.find((b) => b.tipo === 'examenes'))
    for (const e of doc.entradas as Array<Record<string, unknown>>) expect('evento' in e).toBe(false)
  })
})

describe('INST-07 siembra', () => {
  it('el dry-run (por defecto) no hace ninguna llamada de red y avisa que las fechas no están verificadas', async () => {
    const cms = fakeCms()
    const logs: string[] = []
    const r = await run({ deps: { env, fetch: cms.fetch, log: (m: string) => logs.push(m) } })
    expect(r.dryRun).toBe(true)
    expect(cms.calls).toHaveLength(0)
    expect(logs).toContain(AVISO_FECHAS)
  })

  it('--apply crea los 3 bloques, repetirla no crea ni modifica nada, y avisa que las fechas no están verificadas', async () => {
    const cms = fakeCms()
    const logs: string[] = []
    const first = await run({ apply: true, deps: { env, fetch: cms.fetch, log: (m: string) => logs.push(m) } })
    expect(first.counts).toEqual({ creados: 3, omitidos: 0, errores: 0 })
    expect(cms.docs).toHaveLength(3)
    expect(logs).toContain(AVISO_FECHAS)
    const writes = cms.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/api/calendario-academico')).length
    const second = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(second.counts).toEqual({ creados: 0, omitidos: 3, errores: 0 })
    expect(cms.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/api/calendario-academico')).length).toBe(writes)
    expect(cms.calls.some((c) => ['PATCH', 'PUT', 'DELETE'].includes(c.method))).toBe(false)
  })

  it('no pisa un bloque que Secretaría ya cargó (mismo título y año)', async () => {
    const cms = fakeCms({ existentes: [{ titulo: SEED[0].titulo, anio: SEED[0].anio }] })
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 2, omitidos: 1, errores: 0 })
  })

  it('un error del CMS al escribir se cuenta y no se oculta', async () => {
    const cms = fakeCms()
    const failing = async (url: string, init: { method?: string; body?: string } = {}) =>
      init.method === 'POST' && url.endsWith('/api/calendario-academico')
        ? new Response(JSON.stringify({ errors: [{ message: 'fecha inválida' }] }), { status: 400 })
        : cms.fetch(url, init)
    const r = await run({ apply: true, deps: { env, fetch: failing, log: quiet } })
    expect(r.counts).toEqual({ creados: 0, omitidos: 0, errores: 3 })
  })

  it('rechaza un destino remoto sin --allow-remote y una contraseña débil, sin imprimir la credencial', async () => {
    const logs: string[] = []
    const cms = fakeCms()
    await expect(run({ apply: true, deps: { env: { ...env, CMS_URL: 'https://cms.example.org' }, fetch: cms.fetch, log: (m: string) => logs.push(m) } })).rejects.toThrow(/solo escribe en un CMS local/)
    await expect(run({ apply: true, deps: { env: { ...env, CMS_PASSWORD: 'corta' }, fetch: cms.fetch, log: (m: string) => logs.push(m) } })).rejects.toThrow(/demasiado corta/)
    expect(cms.calls).toHaveLength(0)
    expect(logs.join('\n')).not.toContain(env.CMS_PASSWORD)
  })
})
