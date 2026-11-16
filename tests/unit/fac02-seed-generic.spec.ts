// FAC-02: sembrador genérico de facultades (scripts/seed-facultad.mjs).
// Amenazas: (1) duplicar filas al re-ejecutar; (2) pisar ediciones del PO; (3) escribir en un CMS equivocado o sin https;
// (4) sembrar datos con marcadores sin reemplazar; (5) cargar un módulo arbitrario por el nombre (path traversal).
// Límite: CMS simulado en proceso; no prueba el CMS real (eso lo hace el guion contra localhost con --apply).
import { describe, expect, it, vi } from 'vitest'
import { loadSeedData, run } from '../../scripts/seed-facultad.mjs'

const SRC = 'https://www.unc.edu.py/facultad-de-prueba/'
const baseData = () => ({
  FACULTAD_SLUG: 'facultad-de-prueba',
  FACULTAD_NOMBRE: 'Facultad de Prueba',
  FACULTAD_FIELDS: { siglas: { value: 'FP', sourceUrl: SRC }, historia: { value: 'Historia verificada.', sourceUrl: SRC } },
  CARRERAS: [{ slug: 'carrera-uno', nombre: 'Carrera Uno', tipo: 'grado', orden: 1, sede: 'Central', sourceUrl: SRC, resoluciones: [] }],
  ARANCELES: [{ grupo: 'servicios', concepto: 'Matrícula', monto: 100000, sourceUrl: SRC }],
})
const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'a@b.py', CMS_PASSWORD: 'una-clave-larga-segura' }

/** CMS simulado: login, GET con where[campo][equals], POST y PATCH sobre colecciones en memoria. */
function fakeCms(seed: Record<string, any[]> = {}) {
  const db: Record<string, any[]> = { facultades: [], carreras: [], 'aranceles-facultad': [], ...seed }
  let id = 100
  const fetch = vi.fn(async (url: string, init: any = {}) => {
    const u = new URL(url)
    const json = (body: any, status = 200) => ({ ok: status < 400, status, json: async () => body })
    if (u.pathname === '/api/users/login') return json({ token: 't' })
    const col = u.pathname.replace('/api/', '').split('/')[0]
    const docId = u.pathname.replace('/api/', '').split('/')[1]
    if (init.method === 'GET') {
      const filters = [...u.searchParams.entries()].filter(([k]) => k.startsWith('where['))
      const docs = db[col].filter((d) => filters.every(([k, v]) => String(d[k.match(/where\[(.+?)\]/)![1]]) === v))
      return json({ docs })
    }
    if (init.method === 'POST') {
      const doc = { id: ++id, ...JSON.parse(init.body) }
      db[col].push(doc)
      return json({ doc }, 201)
    }
    const doc = db[col].find((d) => String(d.id) === docId)!
    Object.assign(doc, JSON.parse(init.body))
    return json({ doc })
  })
  return { db, fetch }
}
const exec = (cms: ReturnType<typeof fakeCms>, extra: any = {}) =>
  run({ data: baseData(), dryRun: false, deps: { fetch: cms.fetch, env, log: () => {}, pace: async () => {} }, ...extra })

describe('módulo de datos', () => {
  it('carga el módulo de Odontología con el contrato de exportaciones', async () => {
    const d = await loadSeedData('odontologia')
    expect(d.FACULTAD_SLUG).toBe('facultad-de-odontologia')
    expect(Array.isArray(d.CARRERAS) && Array.isArray(d.ARANCELES)).toBe(true)
  })
  it('rechaza una facultad desconocida o un nombre con ruta', async () => {
    await expect(loadSeedData('noexiste')).rejects.toThrow(/desconocid|no existe/i)
    await expect(loadSeedData('../cmsTarget')).rejects.toThrow(/inválido|desconocid/i)
  })
  it('rechaza datos con marcadores REEMPLAZAR o example.com antes de cualquier solicitud', async () => {
    for (const bad of ['REEMPLAZAR con el dato real', 'https://example.com/x']) {
      const data = baseData()
      data.FACULTAD_FIELDS.historia.value = bad
      const cms = fakeCms()
      await expect(run({ data, dryRun: false, deps: { fetch: cms.fetch, env, log: () => {}, pace: async () => {} } })).rejects.toThrow(/marcador/i)
      expect(cms.fetch).not.toHaveBeenCalled()
    }
  })
})

describe('siembra', () => {
  it('crea facultad, carrera y arancel; la segunda ejecución crea 0 (idempotente)', async () => {
    const cms = fakeCms()
    const first = await exec(cms)
    expect(first.counts.creados).toBe(3)
    const second = await exec(cms)
    expect(second.counts.creados).toBe(0)
    expect(cms.db.facultades).toHaveLength(1)
    expect(cms.db.carreras).toHaveLength(1)
    expect(cms.db['aranceles-facultad']).toHaveLength(1)
  })
  it('no pisa un campo editado por el PO y completa solo los vacíos', async () => {
    const cms = fakeCms({ facultades: [{ id: 1, slug: 'facultad-de-prueba', siglas: 'EDITADO', historia: '' }] })
    const r = await exec(cms)
    expect(cms.db.facultades[0].siglas).toBe('EDITADO')
    expect(cms.db.facultades[0].historia).toBe('Historia verificada.')
    expect(r.counts.conDiferencias).toBeGreaterThan(0)
  })
  it('--dry-run (predeterminado) no usa la red', async () => {
    const cms = fakeCms()
    const r = await run({ data: baseData(), dryRun: true, deps: { fetch: cms.fetch, env: {}, log: () => {} } })
    expect(cms.fetch).not.toHaveBeenCalled()
    expect(r.plan).toEqual({ facultadCampos: 2, carreras: 1, aranceles: 1 })
  })
  it('rechaza un CMS remoto sin --allow-remote y uno http con --allow-remote, sin solicitudes', async () => {
    const cms = fakeCms()
    const remote = { ...env, CMS_URL: 'https://cms.unc.edu.py' }
    await expect(exec(cms, { deps: { fetch: cms.fetch, env: remote, log: () => {} } })).rejects.toThrow(/solo escribe en un CMS local/)
    await expect(exec(cms, { allowRemote: true, deps: { fetch: cms.fetch, env: { ...env, CMS_URL: 'http://cms.example' }, log: () => {} } })).rejects.toThrow(/https/)
    expect(cms.fetch).not.toHaveBeenCalled()
  })
})
