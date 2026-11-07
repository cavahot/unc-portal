// INST-08 (T3): siembra de los globals `politica-privacidad` y `declaracion-accesibilidad` (scripts/seed-legales.mjs; spec
// docs/specs/portal/LEGALES.md §2.7).
// Amenazas: (1) pisar ediciones al re-ejecutar; (2) escribir en un CMS equivocado o sin credencial fuerte; (3) perder o
// alterar texto al convertirlo desde los mensajes, o dejar voseo en el español; (4) un dry-run que escriba algo; (5) sembrar
// texto legal sin avisar que no tuvo revisión jurídica.
// Límite: simula el CMS con un `fetch` en memoria; la siembra real contra el CMS local se verifica aparte.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { AVISO_LEGAL, LOCALES, docAccesibilidad, docPrivacidad, run } from '../../scripts/seed-legales.mjs'
// @ts-expect-error módulo .mjs sin tipos
import { LEGALES_SEED } from '../../scripts/lib/legalesSeedData.mjs'
import { mapDeclaracionAccesibilidad, mapPoliticaPrivacidad } from '../../lib/cms/legales'

const SEED = LEGALES_SEED as {
  privacidad: { ultimaActualizacion: string; secciones: Record<string, Array<{ titulo: string; contenido: string }>> }
  accesibilidad: { correoContacto: string; descripcion: Record<string, string>; caracteristicas: Record<string, Array<{ titulo: string; descripcion: string }>> }
}

/** CMS simulado en memoria: login y los dos globals, con un documento por idioma. */
function fakeCms(opts: { existentes?: Record<string, Record<string, unknown>> } = {}) {
  const store: Record<string, Record<string, Record<string, unknown>>> = {}
  for (const [slug, doc] of Object.entries(opts.existentes ?? {})) store[slug] = { es: doc }
  const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = []
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined })
    const u = new URL(url)
    if (u.pathname === '/api/users/login') return json({ token: 'tok' })
    const m = u.pathname.match(/^\/api\/globals\/([\w-]+)$/)
    if (m) {
      const slug = m[1]
      const locale = u.searchParams.get('locale') ?? 'es'
      if (method === 'GET') return json(store[slug]?.[locale] ?? {})
      if (method === 'POST') {
        store[slug] = { ...(store[slug] ?? {}), [locale]: JSON.parse(init.body as string) }
        return json({ result: store[slug][locale] })
      }
    }
    return json({}, 404)
  }
  return { fetch, calls, store }
}

const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'editor@example.test', CMS_PASSWORD: 'una-clave-sintetica-larga' }
const quiet = () => {}

describe('INST-08 datos de la siembra', () => {
  it('trae 7 secciones y 6 características en cada uno de los cuatro idiomas', () => {
    expect(LOCALES).toEqual(['es', 'en', 'pt-BR', 'gn'])
    for (const l of LOCALES) {
      expect(SEED.privacidad.secciones[l]).toHaveLength(7)
      expect(SEED.accesibilidad.caracteristicas[l]).toHaveLength(6)
      expect(SEED.accesibilidad.descripcion[l].length).toBeGreaterThan(20)
    }
    expect(SEED.accesibilidad.correoContacto).toBe('secgral@unc.edu.py')
    expect(SEED.privacidad.ultimaActualizacion).toBe('2026-08-01')
  })

  it('el español está en forma de «usted», sin voseo', () => {
    const es = JSON.stringify([SEED.privacidad.secciones.es, SEED.accesibilidad.descripcion.es, SEED.accesibilidad.caracteristicas.es])
    expect(es).not.toMatch(/\b(Podés|podés|Usá|usá|encontrás|escribinos|tenés|Verificá|Consultá)\b/)
    expect(es).toContain('Puede aumentar')
    expect(es).toContain('Use Tab para moverse')
  })

  it('cada texto sembrado pasa por el modelo del portal sin perder filas ni el correo', () => {
    for (const l of LOCALES) {
      const p = mapPoliticaPrivacidad(docPrivacidad(SEED, l))!
      expect(p.secciones).toHaveLength(7)
      expect(p.actualizacion).toBe('2026-08-01')
      const a = mapDeclaracionAccesibilidad(docAccesibilidad(SEED, l))!
      expect(a.caracteristicas).toHaveLength(6)
      expect(a.correo).toBe('secgral@unc.edu.py')
    }
  })

  it('el texto de los idiomas distintos del español es el que ya existía en los mensajes del portal', () => {
    expect(SEED.privacidad.secciones.en[0].titulo).not.toBe(SEED.privacidad.secciones.es[0].titulo)
    expect(SEED.accesibilidad.caracteristicas['pt-BR'][0].titulo).not.toBe(SEED.accesibilidad.caracteristicas.es[0].titulo)
  })
})

describe('INST-08 siembra', () => {
  it('por defecto es dry-run: no hace llamadas de red, avisa que no hubo revisión jurídica y no escribe', async () => {
    const cms = fakeCms()
    const logs: string[] = []
    const r = await run({ deps: { env, fetch: cms.fetch, log: (m: string) => logs.push(m) } })
    expect(r.dryRun).toBe(true)
    expect(cms.calls).toHaveLength(0)
    expect(logs.join('\n')).toContain(AVISO_LEGAL)
  })

  it('con --apply crea los dos globals en los cuatro idiomas', async () => {
    const cms = fakeCms()
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 2, omitidos: 0, errores: 0 })
    for (const slug of ['politica-privacidad', 'declaracion-accesibilidad']) expect(Object.keys(cms.store[slug]).sort()).toEqual([...LOCALES].sort())
    expect(cms.store['declaracion-accesibilidad'].en.descripcion).toBe(SEED.accesibilidad.descripcion.en)
    expect((cms.store['politica-privacidad'].gn.secciones as unknown[]).length).toBe(7)
  })

  it('repetirla omite todo y no escribe nada más', async () => {
    const cms = fakeCms()
    await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    const posts = cms.calls.filter((c) => c.method === 'POST' && c.url.includes('/globals/')).length
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 0, omitidos: 2, errores: 0 })
    expect(cms.calls.filter((c) => c.method === 'POST' && c.url.includes('/globals/')).length).toBe(posts)
  })

  it('un global con contenido editado en español no se modifica', async () => {
    const editado = { secciones: [{ titulo: 'Editado por la institución', contenido: 'Texto propio' }] }
    const cms = fakeCms({ existentes: { 'politica-privacidad': editado } })
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toEqual({ creados: 1, omitidos: 1, errores: 0 })
    expect(cms.store['politica-privacidad'].es).toEqual(editado)
    expect(cms.calls.filter((c) => c.method === 'POST' && c.url.includes('/globals/politica-privacidad'))).toHaveLength(0)
  })

  it('nunca borra ni reemplaza por otro método que POST/GET', async () => {
    const cms = fakeCms()
    await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(new Set(cms.calls.map((c) => c.method))).toEqual(new Set(['POST', 'GET']))
  })

  it('un error de escritura se cuenta, se informa y detiene ese global sin tocar el otro', async () => {
    const cms = fakeCms()
    const failing = async (url: string, init: { method?: string; body?: string } = {}) =>
      url.includes('/globals/politica-privacidad') && init.method === 'POST' && url.includes('locale=en')
        ? new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), { status: 400 })
        : cms.fetch(url, init)
    const logs: string[] = []
    const r = await run({ apply: true, deps: { env, fetch: failing, log: (m: string) => logs.push(m) } })
    expect(r.counts).toEqual({ creados: 1, omitidos: 0, errores: 1 })
    expect(logs.join('\n')).toMatch(/HTTP 400/)
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
