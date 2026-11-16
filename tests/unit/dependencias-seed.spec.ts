// INST-12 (T2): siembra `seed-dependencias.mjs` (spec docs/specs/portal/DEPENDENCIAS.md §2.4).
// Amenazas: (1) pisar ediciones al re-ejecutar; (2) escribir en un CMS equivocado o con una clave débil; (3) perder datos al
// convertirlos desde el código de la página; (4) imprimir la credencial; (5) datos sembrados que el propio portal descartaría.
// Límite: un cliente del CMS y un `fetch` simulados; la siembra real contra el CMS local se verifica aparte.
import { describe, expect, it } from 'vitest'
import { mapDependencias } from '../../lib/cms/dependencias'
// @ts-expect-error módulo .mjs sin tipos
import { AVISO_FUENTE, DEPENDENCIAS_SEED, run, toDoc } from '../../scripts/seed-dependencias.mjs'

/** CMS simulado en memoria: login y la colección (búsqueda por slug y alta). */
function fakeCms(existentes: string[] = []) {
  const store = new Map<string, Record<string, unknown>>(existentes.map((s) => [s, { slug: s, nombre: 'Editada por la institución' }]))
  const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = []
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined })
    const u = new URL(url)
    if (u.pathname === '/api/users/login') return json({ token: 'tok' })
    if (u.pathname === '/api/dependencias-contacto') {
      if (method === 'GET') {
        const slug = u.searchParams.get('where[slug][equals]') ?? ''
        return json({ docs: store.has(slug) ? [store.get(slug)] : [] })
      }
      if (method === 'POST') {
        const doc = JSON.parse(init.body as string)
        store.set(doc.slug, doc)
        return json({ doc })
      }
    }
    return json({}, 404)
  }
  return { fetch, calls, store }
}
const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'editor@example.test', CMS_PASSWORD: 'una-clave-sintetica-larga' }
const quiet = () => {}

describe('INST-12 datos de la siembra', () => {
  it('trae las 7 dependencias y las 10 sedes que estaban en el código', () => {
    expect(DEPENDENCIAS_SEED).toHaveLength(7)
    expect(DEPENDENCIAS_SEED.reduce((n: number, d: { sedes: unknown[] }) => n + d.sedes.length, 0)).toBe(10)
    expect(DEPENDENCIAS_SEED[0]).toMatchObject({ slug: 'rectorado', destacada: true, orden: 1 })
    expect(DEPENDENCIAS_SEED.filter((d: { destacada: boolean }) => d.destacada)).toHaveLength(1)
    expect(new Set(DEPENDENCIAS_SEED.map((d: { slug: string }) => d.slug)).size).toBe(7)
  })

  it('el contenido sembrado pasa por el mapeador del portal sin perder filas ni datos', () => {
    const docs = DEPENDENCIAS_SEED.map((d: unknown) => toDoc(d))
    const mapped = mapDependencias(docs)
    expect(mapped).toHaveLength(7)
    expect(mapped.every((d) => d.logo !== null)).toBe(true)
    const antes = DEPENDENCIAS_SEED.flatMap((d: { sedes: Array<{ telefonos: string[]; correos: string[] }> }) => d.sedes.flatMap((s) => [...s.telefonos, ...s.correos])).length
    const despues = mapped.flatMap((d) => d.sedes.flatMap((s) => [...s.telefonos, ...s.correos])).length
    expect(despues).toBe(antes)
  })

  it('no usa voseo ni guarda datos fuera del contacto', () => {
    expect(JSON.stringify(DEPENDENCIAS_SEED)).not.toMatch(/\b(querés|Encontrá|podés|Mirá)\b/)
  })
})

describe('INST-12 siembra', () => {
  it('por defecto es dry-run: sin red, con el aviso de que no hubo revisión de la fuente', async () => {
    const cms = fakeCms()
    const logs: string[] = []
    const r = await run({ deps: { env, fetch: cms.fetch, log: (m: string) => logs.push(m) } })
    expect(r.dryRun).toBe(true)
    expect(cms.calls).toHaveLength(0)
    expect(logs.join('\n')).toContain(AVISO_FUENTE)
  })

  it('con --apply crea las 7 y las listas de texto pasan al formato { texto }', async () => {
    const cms = fakeCms()
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 7, omitidos: 0, errores: 0 })
    const rectorado = cms.store.get('rectorado') as { sedes: Array<{ telefonos: Array<{ texto: string }> }> }
    expect(rectorado.sedes[0].telefonos[0]).toEqual({ texto: '(595 331) 241069' })
  })

  it('una dependencia existente no se modifica y repetir la siembra omite todas', async () => {
    const cms = fakeCms(['medicina'])
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 6, omitidos: 1, errores: 0 })
    expect(cms.store.get('medicina')).toEqual({ slug: 'medicina', nombre: 'Editada por la institución' })
    const again = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(again.counts).toEqual({ creados: 0, omitidos: 7, errores: 0 })
  })

  it('solo usa GET y POST y cuenta un error de escritura', async () => {
    const cms = fakeCms()
    await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(new Set(cms.calls.map((c) => c.method))).toEqual(new Set(['GET', 'POST']))
    const failing = async (url: string, init: { method?: string; body?: string } = {}) =>
      url.endsWith('/dependencias-contacto') && init.method === 'POST' ? new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), { status: 400 }) : fakeCms().fetch(url, init)
    const r = await run({ apply: true, deps: { env, fetch: failing, log: quiet } })
    expect(r.counts.errores).toBe(7)
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
