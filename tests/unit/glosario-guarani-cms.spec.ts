// GLO-GN-01: colección privada `glosario-guarani`, validadores de fuente oficial, migración y registro.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §2, §4 y escenarios 1–7.
// Amenazas: (1) lectura anónima o por roles no institucionales de una herramienta interna; (2) un corpus o un
// sitio cualquiera presentado como fuente oficial; (3) URL http:/con credenciales/host parecido; (4) entradas
// duplicadas por fuente; (5) cambios sin rastro; (6) migración no idempotente o que borre filas del PO.
// Límite: contratos con Payload simulado; no ejecuta la BD (el índice único lo prueba la siembra en local).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => 'x' }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))

import { GlosarioGuarani } from '../../apps/cms/src/collections/GlosarioGuarani'
import { canWriteInstitutional } from '../../apps/cms/src/access/roles'
import { GLOSARIO_OFFICIAL_HOSTS, validateOfficialSourceUrl } from '../../apps/cms/src/utilities/validators'
import { OFFICIAL_HOSTS as SCRIPT_OFFICIAL_HOSTS } from '../../scripts/lib/glosarioSources.mjs'

const ROOT = process.cwd()
type F = {
  name?: string
  type?: string
  defaultValue?: unknown
  required?: boolean
  index?: boolean
  maxLength?: number
  options?: Array<{ value: string } | string>
  fields?: F[]
  validate?: (v: unknown, o?: unknown) => unknown
}
const flat = (list: F[]): F[] => list.flatMap((f) => (f.type === 'row' ? flat(f.fields ?? []) : [f]))
const fields = flat(GlosarioGuarani.fields as F[])
const field = (name: string) => fields.find((f) => f.name === name)
const optionValues = (f?: F) => (f?.options ?? []).map((o) => (typeof o === 'string' ? o : o.value))

describe('GLO-GN-01: validador de URL oficial', () => {
  it('la lista de hosts es exacta y coincide con la del actualizador', () => {
    expect([...GLOSARIO_OFFICIAL_HOSTS].sort()).toEqual(
      ['datos.gov.py', 'repositorio.conacyt.gov.py', 'spl.gov.py', 'www.datos.gov.py', 'www.spl.gov.py'].sort(),
    )
    expect([...SCRIPT_OFFICIAL_HOSTS].sort()).toEqual([...GLOSARIO_OFFICIAL_HOSTS].sort())
  })

  it('acepta https en hosts oficiales y vacío cuando no es obligatorio', () => {
    expect(validateOfficialSourceUrl('https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD')).toBe(true)
    expect(validateOfficialSourceUrl('https://repositorio.conacyt.gov.py/handle/20.500.14066/2622')).toBe(true)
    expect(validateOfficialSourceUrl('')).toBe(true)
    expect(typeof validateOfficialSourceUrl('', { required: true })).toBe('string')
  })

  it('rechaza corpus, http, credenciales, subdominios y hosts parecidos (negativos)', () => {
    for (const bad of [
      'https://github.com/pln-fing-udelar/jojajovai',
      'https://dialnet.unirioja.es/descarga/articulo/7337861.pdf',
      'http://www.datos.gov.py/dataset/x',
      'https://u:p@www.datos.gov.py/x',
      'https://www.datos.gov.py.evil.example/x',
      'https://evil.example/?u=https://www.datos.gov.py',
      'https://otro.datos.gov.py/x',
      'javascript:alert(1)',
    ]) {
      expect(typeof validateOfficialSourceUrl(bad), bad).toBe('string')
    }
  })
})

describe('GLO-GN-01: acceso (escenarios 1–3)', () => {
  it('lectura y escritura solo institucional; anónimo y demás roles denegados', async () => {
    expect(GlosarioGuarani.slug).toBe('glosario-guarani')
    for (const op of ['read', 'create', 'update', 'delete'] as const) {
      expect(GlosarioGuarani.access?.[op]).toBe(canWriteInstitutional)
      const fn = GlosarioGuarani.access?.[op] as (a: unknown) => unknown
      expect(await fn({ req: { user: null } })).toBe(false)
      for (const role of ['editor', 'publisher', 'reviewer', 'correspondent', 'media-manager', 'auditor', 'viewer', 'desconocido']) {
        expect(await fn({ req: { user: { role } } }), `${op}:${role}`).toBe(false)
      }
      expect(await fn({ req: { user: { role: 'superadmin' } } })).toBe(true)
      expect(await fn({ req: { user: { role: 'web-admin' } } })).toBe(true)
    }
  })
})

describe('GLO-GN-01: campos', () => {
  it('terminoEs obligatorio con índice y tope 200; terminoGn admite vacío', () => {
    expect(field('terminoEs')).toMatchObject({ type: 'text', required: true, index: true, maxLength: 200 })
    expect(field('terminoEs')!.validate!('x'.repeat(201))).not.toBe(true)
    expect(field('terminoGn')!.required).not.toBe(true)
    expect(field('terminoGn')!.validate!('')).toBe(true)
  })

  it('variantesGn es un arreglo de { valor }', () => {
    const v = field('variantesGn')!
    expect(v.type).toBe('array')
    expect(v.fields!.map((x) => x.name)).toEqual(['valor'])
  })

  it('selects: tipo, categoria y confianza con los valores del CSV del PO', () => {
    expect(optionValues(field('tipo'))).toEqual(['diccionario', 'oficial', 'prestamo', 'neologismo', 'institucional', 'corpus', 'localizacion'])
    expect(field('tipo')!.required).toBe(true)
    expect(optionValues(field('categoria'))).toEqual(['universidad', 'academico', 'administrativo', 'tecnologia', 'general'])
    expect(field('categoria')!.required).not.toBe(true)
    expect(optionValues(field('confianza'))).toEqual(['A', 'B', 'C', 'X'])
    expect(field('confianza')!.required).toBe(true)
    expect(optionValues(field('origen'))).toEqual(['glosario-po', 'actualizador', 'panel'])
    expect(field('origen')!.defaultValue).toBe('panel')
  })

  it('fuente obligatoria; fuenteUrl solo oficial; evidenciaUrl https cualquiera', () => {
    expect(field('fuente')).toMatchObject({ type: 'text', required: true })
    expect(field('fuenteUrl')!.validate!('https://github.com/pln-fing-udelar/jojajovai')).not.toBe(true)
    expect(field('fuenteUrl')!.validate!('https://www.datos.gov.py/x')).toBe(true)
    expect(field('evidenciaUrl')!.validate!('https://github.com/pln-fing-udelar/jojajovai')).toBe(true)
    expect(field('evidenciaUrl')!.validate!('http://github.com/x')).not.toBe(true)
  })

  it('oficial=true exige fuenteUrl oficial (escenario 6)', () => {
    const v = field('oficial')!.validate!
    expect(typeof v(true, { siblingData: { fuenteUrl: '' } })).toBe('string')
    expect(typeof v(true, { siblingData: { fuenteUrl: 'https://github.com/x' } })).toBe('string')
    expect(v(true, { siblingData: { fuenteUrl: 'https://www.datos.gov.py/x' } })).toBe(true)
    expect(v(false, { siblingData: {} })).toBe(true)
  })

  it('revisado false y activo true por defecto; fechaConsulta es fecha', () => {
    expect(field('revisado')).toMatchObject({ type: 'checkbox', defaultValue: false })
    expect(field('activo')).toMatchObject({ type: 'checkbox', defaultValue: true })
    expect(field('oficial')).toMatchObject({ type: 'checkbox', defaultValue: false })
    expect(field('fechaConsulta')!.type).toBe('date')
    expect(field('nota')).toMatchObject({ type: 'textarea', maxLength: 2000 })
  })

  it('índice único compuesto terminoEs + fuente (escenario 7)', () => {
    expect(GlosarioGuarani.indexes).toEqual([{ fields: ['terminoEs', 'fuente'], unique: true }])
  })

  it('panel: grupo Traducción en español', () => {
    expect(GlosarioGuarani.admin?.group).toBe('Traducción')
    expect(GlosarioGuarani.admin?.useAsTitle).toBe('terminoEs')
    expect(GlosarioGuarani.labels).toMatchObject({ plural: 'Glosario guaraní' })
  })

  it('está registrada en payload.config.ts', () => {
    const src = readFileSync(resolve(ROOT, 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(src).toMatch(/import \{ GlosarioGuarani \} from '\.\/collections\/GlosarioGuarani'/)
    expect(src).toMatch(/\n\s+GlosarioGuarani,/)
  })
})

describe('GLO-GN-01: hooks', () => {
  beforeEach(() => {
    logAudit.mockReset()
    revalidatePortalTag.mockReset()
  })
  const req = { user: { email: 'a@example.invalid', role: 'web-admin' }, payload: {} }

  it('audita alta y borrado; no revalida el portal (no es contenido público)', async () => {
    for (const hook of GlosarioGuarani.hooks?.afterChange ?? []) await hook({ doc: { id: 7 }, operation: 'create', req } as never)
    for (const hook of GlosarioGuarani.hooks?.afterDelete ?? []) await hook({ doc: { id: 7 }, id: 7, req } as never)
    expect(logAudit.mock.calls.map((c) => c[0])).toEqual([
      expect.objectContaining({ coleccion: 'glosario-guarani', documento: '7', accion: 'crear' }),
      expect.objectContaining({ coleccion: 'glosario-guarani', accion: 'eliminar' }),
    ])
    expect(revalidatePortalTag).not.toHaveBeenCalled()
  })
})

describe('GLO-GN-01: migración', () => {
  const MIG = 'apps/cms/src/migrations/20261025_190000_glo_gn_01_glosario_guarani'
  const src = () => readFileSync(resolve(ROOT, `${MIG}.ts`), 'utf8')

  it('up idempotente: tabla, arreglo de variantes, enums, índice único y bloqueo de documentos', () => {
    const s = src()
    expect(s).toMatch(/CREATE TABLE IF NOT EXISTS "glosario_guarani"/)
    expect(s).toMatch(/CREATE TABLE IF NOT EXISTS "glosario_guarani_variantes_gn"/)
    expect(s).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "terminoEs_fuente_idx"/)
    expect(s).toMatch(/ADD COLUMN IF NOT EXISTS "glosario_guarani_id"/)
    expect(s).toMatch(/duplicate_object/)
    expect(s).not.toMatch(/DROP TABLE(?! IF EXISTS "glosario_guarani)/)
  })

  it('down se niega si hay filas', () => {
    expect(src()).toMatch(/down rechazado/)
  })

  it('registrada en index.ts y encadenada al último snapshot', () => {
    const idx = readFileSync(resolve(ROOT, 'apps/cms/src/migrations/index.ts'), 'utf8')
    expect(idx).toMatch(/20261025_190000_glo_gn_01_glosario_guarani/)
    const snap = JSON.parse(readFileSync(resolve(ROOT, `${MIG}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(ROOT, 'apps/cms/src/migrations/20261025_180000_arr_01_aranceles_rectorado.json'), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.tables['public.glosario_guarani']).toBeTruthy()
  })
})
