// PRA-01 (fase CMS): datos y guion de siembra de reconocimientos, acreditaciones y facultades.
// Amenazas: (1) sembrar un dato sin fuente o inventado (resolución, vigencia, facultad sin respaldo);
// (2) publicar algo sin que el PO lo confirme; (3) escribir en un CMS que no sea el local; (4) pisar
// ediciones del PO al re-ejecutar. Límite: el CMS se simula en memoria; la corrida real contra
// localhost:3002 se documenta en la spec §11.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  ACREDITACIONES,
  FACULTADES,
  LOGO_PREMIO_PATH,
  RECONOCIMIENTOS,
  toCmsPayloadAcreditacion,
  toCmsPayloadReconocimiento,
} from '../../scripts/lib/premiosAcreditacionesData.mjs'
import { buildPlan, isLocalCmsUrl, run } from '../../scripts/seed-reconocimientos-acreditaciones.mjs'
import { validateFacultadLogoPath, validateHttpsUrl, validateReconocimientoLogoPath } from '../../apps/cms/src/utilities/validators'

const ROOT = path.resolve(__dirname, '..', '..')
const STRONG = 'Clave-Local-Segura-93'

describe('PRA-01 seed: reglas de los datos', () => {
  it('cada edición y cada acreditación tiene fuenteUrl https válida', () => {
    for (const r of RECONOCIMIENTOS) for (const e of r.ediciones) expect(validateHttpsUrl(e.fuenteUrl, { required: true })).toBe(true)
    for (const a of ACREDITACIONES) expect(validateHttpsUrl(a.fuenteUrl, { required: true }), a.programa).toBe(true)
  })

  it('no se inventan resoluciones ni vigencias', () => {
    for (const a of ACREDITACIONES) {
      expect(a).not.toHaveProperty('resolucion')
      expect(a).not.toHaveProperty('vigenciaDesde')
      expect(a).not.toHaveProperty('vigenciaHasta')
      const body = toCmsPayloadAcreditacion(a, 1)
      expect(body.resolucion).toBeUndefined()
      expect(body.vigenciaDesde).toBeUndefined()
      expect(body.vigenciaHasta).toBeUndefined()
    }
  })

  it('todo nace inactivo y sin verificar, también si el dato de origen dijera otra cosa', () => {
    for (const r of RECONOCIMIENTOS) {
      expect(r.active).toBe(false)
      expect(r.verificado).toBe(false)
      const body = toCmsPayloadReconocimiento({ ...r, active: true, verificado: true, ediciones: r.ediciones.map((e) => ({ ...e, verificado: true })) })
      expect(body.active).toBe(false)
      expect(body.verificado).toBe(false)
      for (const e of body.ediciones) expect(e.verificado).toBe(false)
    }
    for (const a of ACREDITACIONES) {
      const body = toCmsPayloadAcreditacion({ ...a, active: true, verificado: true }, 1)
      expect(body.active).toBe(false)
      expect(body.verificado).toBe(false)
    }
  })

  it('no hay duplicados (programa + sede, nombre de premio, año por premio, slug)', () => {
    const keys = ACREDITACIONES.map((a) => `${a.programa}|${a.sede}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(RECONOCIMIENTOS.map((r) => r.nombre)).size).toBe(RECONOCIMIENTOS.length)
    for (const r of RECONOCIMIENTOS) expect(new Set(r.ediciones.map((e) => e.anio)).size).toBe(r.ediciones.length)
    expect(new Set(FACULTADES.map((f) => f.slug)).size).toBe(FACULTADES.length)
  })

  it('solo hay facultad cuando la fuente la respalda (facultadSoporte), y ese slug existe', () => {
    const slugs = new Set(FACULTADES.map((f) => f.slug))
    for (const a of ACREDITACIONES) {
      if (a.facultadSlug) {
        expect(slugs.has(a.facultadSlug), a.programa).toBe(true)
        expect(a.facultadSoporte, a.programa).toMatch(/Boletín ANEAES 2020/)
      } else {
        expect(a.facultadSoporte).toBeNull()
      }
    }
    // Medicina (el boletín dice «Ciencias de la Salud») y los dos postgrados quedan sin facultad.
    const sinFacultad = ACREDITACIONES.filter((a) => !a.facultadSlug).map((a) => a.programa)
    expect(sinFacultad).toEqual(
      expect.arrayContaining(['Medicina', 'Maestría en Didáctica de las Ciencias Matemática, Física y Química', 'Especialización en Medicina Familiar y Comunitaria']),
    )
  })

  it('los metadatos del seed no viajan al CMS', () => {
    const body = toCmsPayloadAcreditacion(ACREDITACIONES[0], 9)
    expect(body).not.toHaveProperty('facultadSlug')
    expect(body).not.toHaveProperty('facultadSoporte')
    expect(body.facultad).toBe(9)
  })

  it('premio: 2016 mención especial Pública Grande y 2025 por confirmar (Sector Público)', () => {
    const [premio] = RECONOCIMIENTOS
    const by = Object.fromEntries(premio.ediciones.map((e) => [e.anio, e]))
    expect(Object.keys(by)).toEqual(['2016', '2025'])
    expect(by[2016]).toMatchObject({ distincion: 'mencion-especial', categoria: 'Pública Grande' })
    expect(by[2025]).toMatchObject({ distincion: 'por-confirmar', categoria: 'Sector Público' })
    expect(premio.entidad).toBe('CONACYT')
  })

  it('el logo del premio sigue la validación del CMS y la nota registra el origen y la confirmación del PO', () => {
    expect(validateReconocimientoLogoPath(LOGO_PREMIO_PATH)).toBe(true)
    expect(RECONOCIMIENTOS[0].nota).toContain('conacyt.gov.py/taxonomy/term/35')
    expect(RECONOCIMIENTOS[0].nota).toMatch(/Product Owner/)
  })

  it('facultades: logoPath válido, siglas solo con evidencia', () => {
    for (const f of FACULTADES) expect(validateFacultadLogoPath(f.logoPath), f.slug).toBe(true)
    const siglas = Object.fromEntries(FACULTADES.map((f) => [f.slug, f.siglas]))
    expect(siglas['facultad-de-ciencias-economicas-y-administrativas']).toBe('FCEA')
    expect(siglas['facultad-de-medicina']).toBeNull()
    expect(siglas['facultad-de-odontologia']).toBeNull()
    expect(siglas['facultad-de-ciencias-agrarias']).toBeNull()
  })

  it('no hay credenciales literales en el guion ni en los datos', () => {
    for (const f of ['scripts/seed-reconocimientos-acreditaciones.mjs', 'scripts/lib/premiosAcreditacionesData.mjs']) {
      const src = readFileSync(path.join(ROOT, f), 'utf8')
      expect(src).not.toMatch(/CMS_PASSWORD\s*(\|\||\?\?)/)
      expect(src).not.toMatch(/password\s*[:=]\s*['"][^'"]{6,}/i)
    }
  })
})

describe('PRA-01 seed: --dry-run sin red', () => {
  it('run({dryRun}) no llama a fetch ni exige credenciales y reporta el plan', async () => {
    const fetch = vi.fn(() => {
      throw new Error('red prohibida en dry-run')
    })
    const log = vi.fn()
    const out = await run({ dryRun: true, deps: { fetch, env: {}, log, logoExists: true } })
    expect(fetch).not.toHaveBeenCalled()
    expect(out.plan).toMatchObject({ reconocimientos: 1, ediciones: 2, acreditaciones: 7, facultades: 6 })
    expect(log.mock.calls.map((c) => c[0]).join('\n')).toMatch(/no se hace ninguna llamada de red/)
  })

  it('el proceso real con --dry-run termina en 0 sin CMS_PASSWORD', () => {
    const env = { ...process.env, CMS_URL: 'http://127.0.0.1:9' }
    delete env.CMS_PASSWORD
    const res = spawnSync(process.execPath, ['scripts/seed-reconocimientos-acreditaciones.mjs', '--dry-run'], { cwd: ROOT, env, encoding: 'utf8', timeout: 20000 })
    expect(res.status).toBe(0)
    expect(res.stdout).toMatch(/\[dry-run\] acreditaciones: 7/)
  })

  it('buildPlan marca el logo como pendiente si falta el archivo', () => {
    expect(buildPlan({ logoExists: false }).logoPremio).toMatch(/pendiente/)
  })
})

describe('PRA-01 seed: controles de ejecución', () => {
  it('solo acepta destinos locales', () => {
    expect(isLocalCmsUrl('http://localhost:3002')).toBe(true)
    expect(isLocalCmsUrl('http://127.0.0.1:3002')).toBe(true)
    expect(isLocalCmsUrl('https://cms.unc.edu.py')).toBe(false)
    expect(isLocalCmsUrl('http://localhost.evil.example')).toBe(false)
    expect(isLocalCmsUrl('no-url')).toBe(false)
  })

  it('rechaza un CMS remoto antes de cualquier llamada', async () => {
    const fetch = vi.fn()
    await expect(run({ deps: { fetch, env: { CMS_URL: 'https://cms.unc.edu.py', CMS_EMAIL: 'a@b.invalid', CMS_PASSWORD: STRONG }, log: () => {} } })).rejects.toThrow(/solo escribe en un CMS local/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('falla sin CMS_PASSWORD válida antes de la red', async () => {
    const fetch = vi.fn()
    await expect(run({ deps: { fetch, env: { CMS_EMAIL: 'a@b.invalid' }, log: () => {} } })).rejects.toThrow(/CMS_PASSWORD/)
    expect(fetch).not.toHaveBeenCalled()
  })
})

/** CMS simulado en memoria: soporta login, GET con where[campo][equals], POST y PATCH. */
function fakeCms(initial: { facultades?: Array<Record<string, unknown>> } = {}) {
  const db: Record<string, Array<Record<string, any>>> = { facultades: [...(initial.facultades ?? [])], reconocimientos: [], acreditaciones: [] }
  let nextId = 100
  const calls: string[] = []
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const u = new URL(url)
    const method = init.method ?? 'GET'
    calls.push(`${method} ${u.pathname}`)
    const json = (status: number, data: unknown) => ({ ok: status < 400, status, json: async () => data })
    if (u.pathname === '/api/users/login') return json(200, { token: 't' })
    const [, , collection, id] = u.pathname.split('/')
    if (method === 'GET') {
      const where = [...u.searchParams.entries()].filter(([k]) => k.startsWith('where'))
      const docs = db[collection].filter((d) => where.every(([k, v]) => d[k.match(/where\[(.+?)\]/)![1]] === v))
      return json(200, { docs: docs.slice(0, 1) })
    }
    const body = JSON.parse(init.body ?? '{}')
    if (method === 'POST') {
      // Como el hook beforeValidate de Facultades: el CMS genera el slug desde el nombre.
      const slug = collection === 'facultades' ? { slug: FACULTADES.find((f) => f.nombre === body.nombre)?.slug } : {}
      const doc = { id: nextId++, ...body, ...slug }
      db[collection].push(doc)
      return json(201, { doc })
    }
    const doc = db[collection].find((d) => String(d.id) === id)!
    Object.assign(doc, body)
    return json(200, { doc })
  }
  return { db, fetch, calls }
}

describe('PRA-01 seed: idempotencia y no pisar al PO (CMS simulado)', () => {
  const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
  const deps = (fetch: unknown) => ({ fetch, env, log: () => {}, pace: async () => {}, logoExists: true })

  it('primera corrida crea todo; la segunda crea 0', async () => {
    const cms = fakeCms()
    const first = await run({ deps: deps(cms.fetch) })
    expect(first.counts).toMatchObject({
      reconocimientos: { creados: 1, existentes: 0 },
      acreditaciones: { creadas: 7, existentes: 0 },
      facultades: { creadas: 6, actualizadas: 6 },
      errores: 0,
    })
    const second = await run({ deps: deps(cms.fetch) })
    expect(second.counts).toMatchObject({
      reconocimientos: { creados: 0, existentes: 1 },
      acreditaciones: { creadas: 0, existentes: 7 },
      facultades: { creadas: 0, actualizadas: 0, sinCambios: 6 },
    })
    expect(cms.db.reconocimientos).toHaveLength(1)
    expect(cms.db.acreditaciones).toHaveLength(7)
    expect(cms.db.facultades).toHaveLength(6)
  })

  it('todo lo creado queda inactivo y sin verificar; las acreditaciones respaldadas enlazan su facultad', async () => {
    const cms = fakeCms()
    await run({ deps: deps(cms.fetch) })
    for (const d of [...cms.db.reconocimientos, ...cms.db.acreditaciones]) {
      expect(d.active).toBe(false)
      expect(d.verificado).toBe(false)
    }
    expect(cms.db.reconocimientos[0].ediciones.every((e: { verificado: boolean }) => e.verificado === false)).toBe(true)
    const conFacultad = cms.db.acreditaciones.filter((a) => a.facultad)
    expect(conFacultad).toHaveLength(4)
    expect(cms.db.acreditaciones.find((a) => a.programa === 'Medicina')?.facultad).toBeUndefined()
  })

  it('no revierte lo que el PO ya activó ni sobrescribe siglas existentes', async () => {
    const cms = fakeCms({ facultades: [{ id: 1, slug: 'facultad-de-medicina', nombre: 'Facultad de Medicina', siglas: 'FM-PO', logoPath: '/images/facultades/medicina.png' }] })
    await run({ deps: deps(cms.fetch) })
    cms.db.reconocimientos[0].active = true
    cms.db.reconocimientos[0].verificado = true
    await run({ deps: deps(cms.fetch) })
    expect(cms.db.reconocimientos[0]).toMatchObject({ active: true, verificado: true })
    expect(cms.db.facultades.find((f) => f.slug === 'facultad-de-medicina')?.siglas).toBe('FM-PO')
  })

  it('si falta el archivo del logo no se envía logoPath y se informa el pendiente', async () => {
    const cms = fakeCms()
    const out = await run({ deps: { ...deps(cms.fetch), logoExists: false } })
    expect(out.counts.logoPremio).toBe('pendiente')
    expect(cms.db.reconocimientos[0].logoPath).toBeUndefined()
  })
})
