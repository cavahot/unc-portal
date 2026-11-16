// INST-05 (T3): siembra de la colección `tramites` (scripts/seed-tramites.mjs; spec docs/specs/portal/TRAMITES.md §2.5).
// Amenazas: (1) pisar ediciones del equipo al re-ejecutar; (2) crear un trámite huérfano si la facultad no existe;
// (3) escribir en un CMS equivocado o sin credencial fuerte; (4) perder o alterar contenido al copiarlo desde el
// componente anterior; (5) un dry-run que escriba algo.
// Límite: simula el CMS con un `fetch` en memoria; la siembra real contra el CMS local se verifica aparte.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { run, toDoc } from '../../scripts/seed-tramites.mjs'
// @ts-expect-error módulo .mjs sin tipos
import { TRAMITES_SEED } from '../../scripts/lib/tramitesSeedData.mjs'

type Seed = { facultad: string; titulo: string; etiqueta?: string; descripcion?: string; requisitos: string[]; nota?: string; orden: number }
const SEED = TRAMITES_SEED as Seed[]
const FAC_SLUGS = [...new Set(SEED.map((t) => t.facultad))]

/** CMS simulado en memoria: login, facultades y tramites. */
function fakeCms(opts: { sinFacultades?: string[]; existentes?: Array<{ facultad: number; titulo: string }> } = {}) {
  const facultades = FAC_SLUGS.filter((s) => !opts.sinFacultades?.includes(s)).map((slug, i) => ({ id: i + 1, slug }))
  const tramites: Array<Record<string, unknown>> = (opts.existentes ?? []).map((e, i) => ({ id: 100 + i, ...e }))
  const calls: Array<{ method: string; url: string; body?: unknown }> = []
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined })
    const u = new URL(url)
    if (u.pathname === '/api/users/login') return json({ token: 'tok' })
    if (u.pathname === '/api/facultades') {
      const slug = u.searchParams.get('where[slug][equals]')
      return json({ docs: facultades.filter((f) => f.slug === slug) })
    }
    if (u.pathname === '/api/tramites' && method === 'GET') {
      const fid = Number(u.searchParams.get('where[facultad][equals]'))
      const titulo = u.searchParams.get('where[titulo][equals]')
      return json({ docs: tramites.filter((t) => t.facultad === fid && t.titulo === titulo) })
    }
    if (u.pathname === '/api/tramites' && method === 'POST') {
      const doc = JSON.parse(init.body as string)
      tramites.push({ id: tramites.length + 1, ...doc })
      return json({ doc }, 201)
    }
    return json({}, 404)
  }
  return { fetch, calls, tramites, facultades }
}

const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'editor@example.test', CMS_PASSWORD: 'una-clave-sintetica-larga' }
const quiet = () => {}

describe('INST-05 datos de la siembra', () => {
  it('trae los 18 trámites de las 6 facultades con sus 84 requisitos', () => {
    expect(SEED).toHaveLength(18)
    expect(FAC_SLUGS).toHaveLength(6)
    expect(SEED.reduce((n, t) => n + t.requisitos.length, 0)).toBe(84)
  })

  it('cada trámite tiene título y requisitos no vacíos, y el orden va de 1 en 1 dentro de su facultad', () => {
    for (const t of SEED) {
      expect(t.titulo.trim(), t.titulo).not.toBe('')
      expect(t.requisitos.length, t.titulo).toBeGreaterThan(0)
      for (const r of t.requisitos) expect(r.trim()).not.toBe('')
    }
    for (const slug of FAC_SLUGS) {
      expect(SEED.filter((t) => t.facultad === slug).map((t) => t.orden)).toEqual(Array.from({ length: SEED.filter((t) => t.facultad === slug).length }, (_, i) => i + 1))
    }
  })

  it('respeta los límites del CMS (título 200, etiqueta 40, descripción 1000, requisito 600, nota 600, 30 requisitos)', () => {
    for (const t of SEED) {
      expect(t.titulo.length).toBeLessThanOrEqual(200)
      expect((t.etiqueta ?? '').length).toBeLessThanOrEqual(40)
      expect((t.descripcion ?? '').length).toBeLessThanOrEqual(1000)
      expect((t.nota ?? '').length).toBeLessThanOrEqual(600)
      expect(t.requisitos.length).toBeLessThanOrEqual(30)
      for (const r of t.requisitos) expect(r.length).toBeLessThanOrEqual(600)
    }
  })

  it('usa solo los slugs de facultad que el portal conoce', () => {
    expect(new Set(FAC_SLUGS)).toEqual(
      new Set([
        'facultad-de-medicina',
        'facultad-de-odontologia',
        'facultad-de-ciencias-agrarias',
        'facultad-de-ciencias-economicas-y-administrativas',
        'facultad-de-humanidades-y-ciencias-de-la-educacion',
        'facultad-de-ciencias-exactas-y-tecnologicas',
      ]),
    )
  })

  it('toDoc envía solo los campos que existen y los requisitos como lista de {texto}', () => {
    const doc = toDoc({ facultad: 'x', titulo: 'T', requisitos: ['a', 'b'], orden: 3 }, 7)
    expect(doc).toEqual({ facultad: 7, titulo: 'T', requisitos: [{ texto: 'a' }, { texto: 'b' }], orden: 3, activa: true })
    expect(toDoc({ facultad: 'x', titulo: 'T', etiqueta: 'E', descripcion: 'D', nota: 'N', requisitos: ['a'], orden: 1 }, 7)).toMatchObject({ etiqueta: 'E', descripcion: 'D', nota: 'N' })
  })
})

describe('INST-05 siembra', () => {
  it('el dry-run (por defecto) no hace ninguna llamada de red', async () => {
    const cms = fakeCms()
    const r = await run({ deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.dryRun).toBe(true)
    expect(cms.calls).toHaveLength(0)
  })

  it('--apply crea los 18 trámites; repetirla no crea ni modifica nada', async () => {
    const cms = fakeCms()
    const first = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(first.counts).toEqual({ creados: 18, omitidos: 0, errores: 0 })
    expect(cms.tramites).toHaveLength(18)
    const writes = cms.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/api/tramites')).length
    const second = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(second.counts).toEqual({ creados: 0, omitidos: 18, errores: 0 })
    expect(cms.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/api/tramites')).length).toBe(writes)
    expect(cms.calls.some((c) => c.method === 'PATCH' || c.method === 'PUT' || c.method === 'DELETE')).toBe(false)
  })

  it('no pisa un trámite que el equipo ya cargó (misma facultad y título)', async () => {
    const t = SEED[0]
    const cms = fakeCms({ existentes: [{ facultad: 1, titulo: t.titulo }] })
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 17, omitidos: 1, errores: 0 })
  })

  it('una facultad que no existe en el CMS cuenta como error y no crea trámites huérfanos', async () => {
    const cms = fakeCms({ sinFacultades: ['facultad-de-medicina'] })
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts.errores).toBe(SEED.filter((t) => t.facultad === 'facultad-de-medicina').length)
    expect(r.counts.creados + r.counts.errores).toBe(18)
    expect(cms.tramites.every((t) => t.facultad !== undefined)).toBe(true)
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
