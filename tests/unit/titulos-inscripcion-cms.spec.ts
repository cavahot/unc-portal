// TITULOS-01 (T1): global `titulos-inscripcion` del CMS — esquema, acceso, validadores, hooks y migración
// (spec docs/specs/portal/TITULOS.md §2.1 y §3; tarea odd/tasks/titulos-cms.md, S1, S2 y S6).
// Amenazas: (1) escritura por roles sin permiso de global; (2) un `acento` libre que inyecte CSS; (3) una URL del
// CONES hacia otro host (phishing con la marca UNC); (4) plazos incoherentes; (5) tipos de universidad duplicados;
// (6) monto del arancel escrito a mano (segunda fuente que diverge de `aranceles-rectorado`); (7) cambios sin
// rastro de auditoría; (8) migración no registrada, destructiva o no idempotente.
// Límite: CMS simulado; no ejecuta Payload ni la base de datos (la migración se prueba además con `up` en una BD sintética).
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  getPayload: async () => ({}),
  APIError: class APIError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
}))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => '10.0.0.1' }))

import { TitulosInscripcion } from '../../apps/cms/src/globals/TitulosInscripcion'
import { canUpdateGlobal } from '../../apps/cms/src/access/roles'
import { CONES_HOSTS as CMS_CONES_HOSTS } from '../../apps/cms/src/utilities/validators'
import { ACENTOS, CONES_HOSTS as PORTAL_CONES_HOSTS } from '../../lib/cms/titulos'

type F = {
  name?: string
  type?: string
  required?: boolean
  min?: number
  maxLength?: number
  relationTo?: string
  options?: Array<{ value: string }>
  fields?: F[]
  validate?: (v: unknown, o?: unknown) => unknown
  admin?: { description?: string }
}
const root = process.cwd()
const fields = TitulosInscripcion.fields as F[]
const f = (n: string, list: F[] = fields) => list.find((x) => x.name === n)
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('TITULOS-01: acceso y metadatos', () => {
  it('slug, grupo y acceso: lectura pública, escritura con canUpdateGlobal', async () => {
    expect(TitulosInscripcion.slug).toBe('titulos-inscripcion')
    expect(TitulosInscripcion.admin?.group).toBeTruthy()
    expect(TitulosInscripcion.access?.update).toBe(canUpdateGlobal)
    const readAccess = TitulosInscripcion.access?.read as (a: unknown) => unknown
    expect(await readAccess({ req: { user: null } })).toBe(true)
    const update = TitulosInscripcion.access?.update as (a: unknown) => unknown
    expect(await update({ req: { user: null } })).toBe(false)
    expect(await update({ req: { user: { role: 'editor' } } })).toBe(false)
    expect(await update({ req: { user: { role: 'web-admin' } } })).toBe(true)
  })
})

describe('TITULOS-01: campos', () => {
  it('textos principales obligatorios, con tope y descripción para el editor', () => {
    for (const n of ['titulo', 'descripcion', 'unidad']) {
      expect(f(n)?.required, n).toBe(true)
      expect(f(n)?.maxLength, n).toBeGreaterThan(0)
      expect(f(n)?.admin?.description, n).toMatch(/\S{3,}/)
    }
  })

  it('el arancel es una relación a aranceles-rectorado y NO existe un campo de monto', () => {
    expect(f('arancel')).toMatchObject({ type: 'relationship', relationTo: 'aranceles-rectorado' })
    const names = JSON.stringify(fields)
    expect(names).not.toMatch(/"name":"(monto|arancelMonto|precio)"/)
  })

  it('plazo: enteros ≥ 1 y el máximo no puede ser menor que el mínimo', () => {
    for (const n of ['plazoMinHoras', 'plazoMaxHoras']) {
      expect(f(n)).toMatchObject({ type: 'number', required: true, min: 1 })
    }
    const max = f('plazoMaxHoras')!.validate!
    expect(max(5, { siblingData: { plazoMinHoras: 8 } })).toEqual(expect.stringMatching(/\S/))
    expect(max(8, { siblingData: { plazoMinHoras: 8 } })).toBe(true)
    expect(max(24, { siblingData: { plazoMinHoras: 8 } })).toBe(true)
    expect(max(8.5, { siblingData: { plazoMinHoras: 8 } })).toEqual(expect.stringMatching(/entero/i))
  })

  it('nota del CONES: texto y URL de host exacto permitido', () => {
    const group = f('notaCones')!
    const url = f('url', group.fields)!.validate!
    expect(f('texto', group.fields)?.maxLength).toBeGreaterThan(0)
    expect(url('https://www.cones.gov.py/')).toBe(true)
    expect(url('https://cones.gov.py/tramites')).toBe(true)
    for (const bad of [
      'http://www.cones.gov.py/',
      'https://cones.gov.py.evil.example/',
      'https://evil.example/?u=https://www.cones.gov.py/',
      'javascript:alert(1)',
    ]) {
      expect(url(bad), bad).toEqual(expect.stringMatching(/\S/))
    }
  })

  it('tipos: acento de lista cerrada, requisitos con tope y slug obligatorio', () => {
    const tipos = f('tipos')!
    expect(tipos.type).toBe('array')
    const acento = f('acento', tipos.fields)!
    expect(acento.options?.map((o) => o.value)).toEqual(['verde', 'azul', 'violeta'])
    expect(acento.required).toBe(true)
    expect(f('slug', tipos.fields)?.required).toBe(true)
    const requisitos = f('requisitos', tipos.fields)!
    expect(requisitos.type).toBe('array')
    expect(f('texto', requisitos.fields)).toMatchObject({ required: true, maxLength: 600 })
  })

  it('tipos: no admite dos tipos con el mismo slug', () => {
    const validate = f('tipos')!.validate!
    expect(validate([{ slug: 'extranjera' }, { slug: 'publica' }])).toBe(true)
    expect(validate([{ slug: 'publica' }, { slug: 'Publica' }])).toEqual(expect.stringMatching(/slug/i))
  })

  it('pasos: responsable y descripción obligatorios', () => {
    const pasos = f('pasos')!
    expect(pasos.type).toBe('array')
    for (const n of ['responsable', 'descripcion']) expect(f(n, pasos.fields)?.required, n).toBe(true)
  })
})

describe('TITULOS-01: paridad portal ↔ CMS', () => {
  it('las listas cerradas del portal (acentos y hosts del CONES) coinciden con las del CMS', () => {
    const acento = f('acento', f('tipos')!.fields)!
    expect([...ACENTOS]).toEqual(acento.options!.map((o) => o.value))
    expect([...PORTAL_CONES_HOSTS]).toEqual([...CMS_CONES_HOSTS])
  })
})

describe('TITULOS-01: hooks de revalidación y auditoría', () => {
  beforeEach(() => {
    revalidatePortalTag.mockClear()
    logAudit.mockClear()
  })
  const run = async () => {
    const hooks = (TitulosInscripcion.hooks?.afterChange ?? []) as Array<(a: unknown) => unknown>
    for (const hook of hooks) {
      await hook({ doc: { id: 1 }, previousDoc: {}, req: { user: { email: 'ed@example.test', role: 'web-admin' }, payload: {} } })
    }
  }

  it('revalida la etiqueta titulos-inscripcion al guardar', async () => {
    await run()
    expect(revalidatePortalTag).toHaveBeenCalledWith('titulos-inscripcion')
  })

  it('escribe una fila de auditoría con el usuario y la colección', async () => {
    await run()
    expect(logAudit).toHaveBeenCalledTimes(1)
    expect(logAudit.mock.calls[0][0]).toMatchObject({
      usuario: 'ed@example.test',
      rol: 'web-admin',
      accion: 'actualizar',
      coleccion: 'titulos-inscripcion',
      resultado: 'exito',
    })
  })

  it('un fallo de auditoría no bloquea al editor', async () => {
    logAudit.mockRejectedValueOnce(new Error('boom'))
    await expect(run()).resolves.not.toThrow()
  })
})

describe('TITULOS-01: registro, etiqueta del portal y migración', () => {
  it('el global está registrado en payload.config.ts', () => {
    const config = read('apps/cms/src/payload.config.ts')
    expect(config).toContain('TitulosInscripcion')
    expect(config).toMatch(/globals:\s*\[[^\]]*TitulosInscripcion/)
  })

  it('el portal acepta revalidar la etiqueta titulos-inscripcion', () => {
    expect(read('app/api/revalidate/route.ts')).toContain("'titulos-inscripcion'")
  })

  it('existe la migración, está registrada en index.ts y es idempotente y segura', () => {
    const name = '20261106_012429_titulos_01_inscripcion'
    const dir = 'apps/cms/src/migrations'
    expect(existsSync(resolve(root, `${dir}/${name}.ts`))).toBe(true)
    expect(existsSync(resolve(root, `${dir}/${name}.json`))).toBe(true)
    expect(read(`${dir}/index.ts`)).toContain(`name: '${name}'`)
    const sql = read(`${dir}/${name}.ts`)
    expect(sql).toMatch(/IF NOT EXISTS/)
    expect(sql).not.toMatch(/DROP\s+TABLE(?![^;]*IF EXISTS)/i)
    // `down` solo hacia adelante: se niega a correr si hay datos (patrón del repo).
    expect(sql).toMatch(/export async function down[\s\S]*(RAISE EXCEPTION|throw new Error)/)
    expect(read(`${dir}/README.md`)).toContain(name)
  })
})
