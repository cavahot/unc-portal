// TITULOS-01 (T3): siembra idempotente del global `titulos-inscripcion` (spec docs/specs/portal/TITULOS.md §2.4;
// tarea odd/tasks/titulos-cms.md, S7).
// Amenazas: (1) pisar lo que el editor ya cambió en el panel al volver a ejecutar; (2) escribir en un CMS equivocado;
// (3) credencial débil o impresa en los logs; (4) sembrar contenido que el propio CMS rechazaría o que el portal
// no puede pintar; (5) guardar el monto del arancel en vez de enlazar la fila existente.
// Límite: `fetch` simulado; no toca red ni base de datos.
import { describe, expect, it, vi } from 'vitest'

import { TITULOS_SEED, plannedDocument, run } from '../../scripts/seed-titulos.mjs'
import { mapTitulosInscripcion } from '../../lib/cms/titulos'
import { validateConesUrl } from '../../apps/cms/src/utilities/validators'

const ENV = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'seed@example.test', CMS_PASSWORD: 'una-clave-de-prueba-segura-1' }
const ARANCEL = { id: 7, concepto: 'Inscripción de Títulos Universitarios', monto: 200000, active: true }

type Call = { method: string; url: string; body?: unknown }

/** `fetch` simulado: responde según la ruta y guarda las llamadas. `global` es lo que devuelve el GET del global. */
function fakeFetch(opts: { global?: unknown; arancel?: unknown; postStatus?: number; loginToken?: string | null } = {}) {
  const calls: Call[] = []
  const impl = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body) : undefined
    calls.push({ method, url, body })
    const json = (status: number, data: unknown) => ({ ok: status < 400, status, json: async () => data })
    if (url.endsWith('/api/users/login')) return json(opts.loginToken === null ? 401 : 200, opts.loginToken === null ? {} : { token: opts.loginToken ?? 'tok' })
    if (url.includes('/api/globals/titulos-inscripcion') && method === 'GET') return json(200, opts.global ?? {})
    if (url.includes('/api/aranceles-rectorado')) return json(200, { docs: opts.arancel === undefined ? [ARANCEL] : opts.arancel ? [opts.arancel] : [] })
    if (url.includes('/api/globals/titulos-inscripcion') && method === 'POST') return json(opts.postStatus ?? 200, { doc: {} })
    return json(404, {})
  })
  return { impl, calls }
}
const deps = (f: ReturnType<typeof fakeFetch>) => ({ env: ENV, fetch: f.impl, log: vi.fn(), pace: async () => {} })

describe('TITULOS-01 contenido de partida', () => {
  it('el contenido sembrado es publicable por el portal (3 tipos, 8 pasos, plazo, nota y arancel)', () => {
    const data = mapTitulosInscripcion({ ...plannedDocument(ARANCEL.id), arancel: ARANCEL })!
    expect(data).not.toBeNull()
    expect(data.tipos.map((t) => t.slug)).toEqual(['extranjera', 'publica', 'privada'])
    expect(data.tipos.map((t) => t.requisitos.length)).toEqual([5, 4, 4])
    expect(data.pasos).toHaveLength(8)
    expect(data.plazo).toEqual({ min: 8, max: 24 })
    expect(data.arancel?.monto).toBe(200000)
    expect(data.notaCones?.url).toBe('https://www.cones.gov.py/')
  })

  it('respeta las reglas del propio CMS (topes, slug, acento, plazo, URL del CONES)', () => {
    const doc = plannedDocument(ARANCEL.id) as typeof TITULOS_SEED & { arancel: number }
    expect(doc.plazoMinHoras).toBeLessThanOrEqual(doc.plazoMaxHoras)
    expect(validateConesUrl(doc.notaCones.url)).toBe(true)
    const slugs = doc.tipos.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const t of doc.tipos) {
      expect(t.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(['verde', 'azul', 'violeta']).toContain(t.acento)
      for (const r of t.requisitos) expect(r.texto.length).toBeLessThanOrEqual(600)
    }
    for (const p of doc.pasos) expect(p.descripcion.length).toBeLessThanOrEqual(800)
  })

  it('NO guarda el monto del arancel: solo el id de la fila existente', () => {
    const doc = plannedDocument(7) as Record<string, unknown>
    expect(doc.arancel).toBe(7)
    expect(JSON.stringify(doc)).not.toMatch(/200\.?000|monto/)
    expect('arancel' in (plannedDocument(null) as Record<string, unknown>)).toBe(false)
  })

  it('la redacción es neutra (sin voseo)', () => {
    expect(JSON.stringify(TITULOS_SEED)).not.toMatch(/\b(Consultá|Identificá|Mirá|Presentate|Necesitás)\b/)
  })
})

describe('TITULOS-01 ejecución', () => {
  it('dry-run (por defecto): sin red y sin escribir', async () => {
    const f = fakeFetch()
    const result = await run({ deps: deps(f) })
    expect(result.dryRun).toBe(true)
    expect(f.impl).not.toHaveBeenCalled()
  })

  it('--apply con el global vacío: inicia sesión, enlaza el arancel y escribe una sola vez', async () => {
    const f = fakeFetch({ global: {} })
    const result = await run({ apply: true, deps: deps(f) })
    const posts = f.calls.filter((c) => c.method === 'POST' && c.url.includes('/globals/'))
    expect(posts).toHaveLength(1)
    expect((posts[0].body as { arancel: number }).arancel).toBe(7)
    expect((posts[0].body as { tipos: unknown[] }).tipos).toHaveLength(3)
    expect(result.counts).toMatchObject({ creados: 1, omitidos: 0, errores: 0 })
  })

  it('--apply con contenido ya existente: se OMITE y no pisa ediciones del editor', async () => {
    const f = fakeFetch({ global: { titulo: 'Editado por el PO', tipos: [{ slug: 'x' }], pasos: [{}] } })
    const result = await run({ apply: true, deps: deps(f) })
    expect(f.calls.some((c) => c.method === 'POST' && c.url.includes('/globals/'))).toBe(false)
    expect(result.counts).toMatchObject({ creados: 0, omitidos: 1, errores: 0 })
  })

  it('sin la fila de arancel: escribe igual, sin relación, y lo avisa (la página enlazará a los aranceles)', async () => {
    const f = fakeFetch({ arancel: null })
    const d = deps(f)
    await run({ apply: true, deps: d })
    const post = f.calls.find((c) => c.method === 'POST' && c.url.includes('/globals/'))!
    expect('arancel' in (post.body as object)).toBe(false)
    expect((d.log as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n')).toMatch(/arancel/i)
  })

  it('un POST fallido cuenta como error (no se declara éxito)', async () => {
    const f = fakeFetch({ postStatus: 400 })
    const result = await run({ apply: true, deps: deps(f) })
    expect(result.counts).toMatchObject({ creados: 0, errores: 1 })
  })

  it('rechaza un CMS remoto sin --allow-remote y exige https con él', async () => {
    const f = fakeFetch()
    await expect(run({ apply: true, deps: { ...deps(f), env: { ...ENV, CMS_URL: 'https://cms.example.test' } } })).rejects.toThrow(/local/i)
    await expect(run({ apply: true, allowRemote: true, deps: { ...deps(f), env: { ...ENV, CMS_URL: 'http://cms.example.test' } } })).rejects.toThrow(/https/i)
    expect(f.impl).not.toHaveBeenCalled()
  })

  it('exige usuario y una contraseña segura, y nunca imprime la contraseña', async () => {
    const f = fakeFetch()
    await expect(run({ apply: true, deps: { ...deps(f), env: { ...ENV, CMS_EMAIL: '' } } })).rejects.toThrow(/CMS_EMAIL/)
    const weak = run({ apply: true, deps: { ...deps(f), env: { ...ENV, CMS_PASSWORD: 'admin123' } } })
    await expect(weak).rejects.toThrow(/CMS_PASSWORD/)
    await expect(weak).rejects.not.toThrow(/admin123/)
    const d = deps(f)
    await run({ apply: true, deps: d })
    expect((d.log as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n')).not.toContain(ENV.CMS_PASSWORD)
  })

  it('un login fallido aborta antes de escribir', async () => {
    const f = fakeFetch({ loginToken: null })
    await expect(run({ apply: true, deps: deps(f) })).rejects.toThrow(/iniciar sesión/i)
    expect(f.calls.some((c) => c.method === 'POST' && c.url.includes('/globals/'))).toBe(false)
  })
})
