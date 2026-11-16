// INST-01 (T1): globals `informacion-publica` e `institucional` del CMS — esquema, acceso, validadores, hooks y migración
// (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1, §2.2 y §3; tarea odd/tasks/transparencia-institucional-cms.md, S1, S2 y S4).
// Amenazas: (1) escritura por roles sin permiso de global; (2) un enlace editable con `javascript:`, `http:`, «//host» o
// un host ajeno al portal oficial; (3) un destino de tarjeta fuera de la lista cerrada (ruta inexistente o sitio ajeno);
// (4) vías o destinos repetidos; (5) cambios sin rastro de auditoría; (6) migración no registrada, destructiva o no
// idempotente. Límite: CMS simulado; la migración se prueba además con `up` en una base sintética.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => '10.0.0.1' }))

import { InformacionPublica } from '../../apps/cms/src/globals/InformacionPublica'
import { Institucional, DESTINOS } from '../../apps/cms/src/globals/Institucional'
import { canUpdateGlobal } from '../../apps/cms/src/access/roles'
import { validateInfoPublicaUrl } from '../../apps/cms/src/utilities/validators'

type F = { name?: string; type?: string; required?: boolean; options?: Array<{ value: string }>; fields?: F[]; validate?: (v: unknown) => unknown; maxRows?: number }
const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const f = (list: unknown, n: string) => (list as F[]).find((x) => x.name === n)!

describe.each([
  ['informacion-publica', InformacionPublica, 'InformacionPublica'],
  ['institucional', Institucional, 'Institucional'],
])('INST-01 global %s: acceso, hooks y registro', (slug, global, symbol) => {
  it('slug, lectura pública y escritura solo con canUpdateGlobal', async () => {
    expect(global.slug).toBe(slug)
    expect(global.access?.update).toBe(canUpdateGlobal)
    expect(await (global.access?.read as (a: unknown) => unknown)({ req: { user: null } })).toBe(true)
    const update = global.access?.update as (a: unknown) => unknown
    expect(await update({ req: { user: null } })).toBe(false)
    expect(await update({ req: { user: { role: 'editor' } } })).toBe(false)
    expect(await update({ req: { user: { role: 'web-admin' } } })).toBe(true)
  })

  it('revalida su etiqueta al guardar y audita el cambio', async () => {
    const hooks = global.hooks?.afterChange as Array<(a: unknown) => Promise<unknown>>
    expect(hooks).toHaveLength(2) // revalidación + auditoría
    await hooks[0]({})
    expect(revalidatePortalTag).toHaveBeenCalledWith(slug)
  })

  it('está registrado en payload.config.ts y su etiqueta figura en ALLOWED_TAGS del portal', () => {
    expect(read('apps/cms/src/payload.config.ts')).toMatch(new RegExp(`globals:\\s*\\[[^\\]]*\\b${symbol}\\b`))
    expect(read('app/api/revalidate/route.ts')).toContain(`'${slug}'`)
  })
})

describe('INST-01 validateInfoPublicaUrl: ruta interna o https del portal oficial', () => {
  it.each(['/contacto', '/es/ley-5282#solicitud', 'https://informacionpublica.paraguay.gov.py/#!/'])('acepta %s', (u) => {
    expect(validateInfoPublicaUrl(u)).toBe(true)
  })
  it.each([
    'javascript:alert(1)',
    'http://informacionpublica.paraguay.gov.py/',
    '//evil.example/x',
    'https://informacionpublica.paraguay.gov.py.evil.example/',
    'https://evil.example/?u=https://informacionpublica.paraguay.gov.py/',
    '/\\evil.example',
    'mailto:a@b.c',
    '',
  ])('rechaza %s', (u) => {
    expect(validateInfoPublicaUrl(u)).not.toBe(true)
  })
})

describe('INST-01 informacion-publica: campos y reglas', () => {
  const fields = InformacionPublica.fields
  it('campos obligatorios y correo como tipo email', () => {
    for (const n of ['titulo', 'descripcion', 'leyReferencia', 'correo']) expect(f(fields, n).required, n).toBe(true)
    expect(f(fields, 'correo').type).toBe('email')
  })

  it('cada vía tiene identificador válido y único, y su enlace pasa por el validador', () => {
    const vias = f(fields, 'vias')
    expect(vias.validate!([{ slug: 'a' }, { slug: 'A' }])).toMatch(/repetido/)
    expect(vias.validate!([{ slug: 'a' }, { slug: 'b' }])).toBe(true)
    expect(vias.validate!(Array.from({ length: 7 }, (_, i) => ({ slug: `v${i}` })))).toMatch(/Máximo/)
    const slug = f(vias.fields, 'slug')
    expect(slug.validate!('Con Espacios')).not.toBe(true)
    expect(slug.validate!('solicitud-online')).toBe(true)
    const url = f(f(vias.fields, 'accion').fields, 'url')
    expect(url.validate!('javascript:alert(1)')).not.toBe(true)
    expect(url.validate!('/contacto')).toBe(true)
  })

  it('el portal oficial solo acepta el host del Gobierno y puede quedar vacío', () => {
    const url = f(f(fields, 'portalOficial').fields, 'url')
    expect(url.validate!('')).toBe(true)
    expect(url.validate!('https://informacionpublica.paraguay.gov.py/#!/')).toBe(true)
    expect(url.validate!('https://evil.example/')).not.toBe(true)
  })
})

describe('INST-01 institucional: lista cerrada de destinos', () => {
  const secciones = f(Institucional.fields, 'secciones')

  it('el destino es un select con la lista cerrada y no una URL libre', () => {
    const destino = f(secciones.fields, 'destino')
    expect(destino.type).toBe('select')
    expect(destino.options!.map((o) => o.value)).toEqual([...DESTINOS])
  })

  it('rechaza destinos repetidos', () => {
    expect(secciones.validate!([{ destino: 'historia' }, { destino: 'historia' }])).toMatch(/repetido/)
    expect(secciones.validate!([{ destino: 'historia' }, { destino: 'organigrama' }])).toBe(true)
  })

  it('limita filas: 1 a 4 datos clave, 1 a 8 secciones y valores', () => {
    expect(secciones.maxRows).toBe(8)
    expect(f(f(Institucional.fields, 'sobre').fields, 'datos').maxRows).toBe(4)
    expect(f(Institucional.fields, 'valores').maxRows).toBe(8)
  })
})

describe('INST-01 migración', () => {
  const name = '20261106_224807_transparencia_institucional_01'

  it('existe, está registrada en index.ts y encadenada tras la de títulos', () => {
    expect(existsSync(resolve(root, `apps/cms/src/migrations/${name}.ts`))).toBe(true)
    expect(read('apps/cms/src/migrations/index.ts')).toContain(`name: '${name}'`)
    const snap = JSON.parse(read(`apps/cms/src/migrations/${name}.json`))
    const prev = JSON.parse(read('apps/cms/src/migrations/20261106_012429_titulos_01_inscripcion.json'))
    expect(snap.prevId).toBe(prev.id)
  })

  it('up es idempotente y down no borra contenido sin respaldo', () => {
    const sqlText = read(`apps/cms/src/migrations/${name}.ts`)
    expect(sqlText).not.toMatch(/CREATE TABLE "/)
    expect(sqlText).not.toMatch(/CREATE INDEX "/)
    expect(sqlText).toMatch(/RAISE EXCEPTION/)
    expect(sqlText).toMatch(/DROP TABLE IF EXISTS/)
  })
})
