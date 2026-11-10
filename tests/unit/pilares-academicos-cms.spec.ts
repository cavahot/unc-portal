// PILARES-01 (T1): global `pilares-academicos` del CMS — esquema, acceso, validaciones, hooks y migración
// (spec docs/specs/portal/PILARES-ACADEMICOS.md; tarea odd/tasks/pilares-academicos.md, S3 y S4).
// Amenazas: (1) escritura por roles sin permiso de global; (2) un ícono o un estado libres que el portal no conoce;
// (3) una cifra cargada a mano sin fuente (dato institucional inventado); (4) cambios sin rastro de auditoría; (5) el
// portal sin refrescar tras un guardado; (6) migración no registrada o destructiva.
// Límite: CMS simulado; no ejecuta Payload ni la base de datos.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
const logAudit = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit, getClientIP: () => '10.0.0.1' }))

import { PilaresAcademicos } from '../../apps/cms/src/globals/PilaresAcademicos'
import { canUpdateGlobal } from '../../apps/cms/src/access/roles'
import { ESTADISTICAS, ESTADOS, ICONOS, PILARES } from '../../lib/cms/pilares'

type F = {
  name?: string
  type?: string
  required?: boolean
  maxRows?: number
  maxLength?: number
  defaultValue?: unknown
  options?: Array<{ value: string }>
  fields?: F[]
  tabs?: F[]
  validate?: (v: unknown, o?: unknown) => unknown
}
const root = process.cwd()
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const tabs = (PilaresAcademicos.fields as F[]).find((f) => f.type === 'tabs')?.tabs ?? []
const tab = (name: string) => tabs.find((t) => t.name === name)
const field = (list: F[] | undefined, name: string) => list?.find((f) => f.name === name)
const values = (f?: F) => (f?.options ?? []).map((o) => o.value)

describe('PILARES-01: global pilares-academicos', () => {
  beforeEach(() => {
    revalidatePortalTag.mockReset()
    logAudit.mockReset()
  })

  it('slug y acceso: lectura pública, escritura solo con canUpdateGlobal', async () => {
    expect(PilaresAcademicos.slug).toBe('pilares-academicos')
    expect(await (PilaresAcademicos.access?.read as () => unknown)()).toBe(true)
    expect(PilaresAcademicos.access?.update).toBe(canUpdateGlobal)
  })

  it('una pestaña por pilar, en el orden del portal', () => {
    expect(tabs.map((t) => t.name)).toEqual([...PILARES])
  })

  it.each([...PILARES])('%s: campos de la tarjeta y de la página', (pilar) => {
    const fields = tab(pilar)?.fields
    expect(field(fields, 'titulo')).toMatchObject({ type: 'text', required: true })
    expect(field(fields, 'bajada')?.type).toBe('text')
    expect(field(fields, 'descripcion')).toMatchObject({ type: 'textarea', required: true })
    expect(values(field(fields, 'icono'))).toEqual([...ICONOS])
    expect(field(fields, 'metricas')).toMatchObject({ type: 'array', maxRows: 2 })
    expect(field(fields, 'enlaceTexto')).toMatchObject({ type: 'text', required: true })
    const pagina = field(fields, 'pagina')?.fields
    expect(values(field(pagina, 'estado'))).toEqual([...ESTADOS])
    expect(field(pagina, 'estado')?.defaultValue).toBe('construccion')
    expect(field(pagina, 'contenido')?.type).toBe('richText')
    expect(field(pagina, 'estadisticas')?.type).toBe('array')
  })

  it('métrica: «Estadísticas» exige elegir la cifra; «a mano» exige valor y fuente', () => {
    const metrica = field(tab('docencia')?.fields, 'metricas')?.fields
    expect(values(field(metrica, 'estadistica'))).toEqual([...ESTADISTICAS])
    const est = field(metrica, 'estadistica')!.validate!
    const valor = field(metrica, 'valor')!.validate!
    const fuente = field(metrica, 'fuente')!.validate!
    const ctx = (origen: string) => ({ siblingData: { origen } })

    expect(est(undefined, ctx('estadistica'))).toMatch(/estadística/i)
    expect(est('totalEstudiantes', ctx('estadistica'))).toBe(true)
    expect(est(undefined, ctx('manual'))).toBe(true)

    expect(valor('', ctx('manual'))).toMatch(/valor/i)
    expect(valor('45', ctx('manual'))).toBe(true)
    expect(valor(undefined, ctx('estadistica'))).toBe(true)

    expect(fuente('', ctx('manual'))).toMatch(/fuente/i)
    expect(fuente('Informe anual de la Dirección de Investigación 2025', ctx('manual'))).toBe(true)
    expect(fuente(undefined, ctx('estadistica'))).toBe(true)
  })

  it('al guardar: refresca el portal y deja rastro en la auditoría', async () => {
    const hooks = PilaresAcademicos.hooks?.afterChange ?? []
    for (const hook of hooks) {
      await (hook as (a: unknown) => unknown)({ doc: {}, previousDoc: {}, req: { user: { email: 'a@example.invalid', role: 'web-admin' }, headers: new Headers() }, global: PilaresAcademicos })
    }
    expect(revalidatePortalTag).toHaveBeenCalledWith('pilares-academicos')
    expect(logAudit).toHaveBeenCalled()
  })

  it('registrado en el CMS, con su migración y su etiqueta de revalidación', () => {
    expect(read('apps/cms/src/payload.config.ts')).toMatch(/PilaresAcademicos,/)
    const migration = readdirSync(resolve(root, 'apps/cms/src/migrations')).find((f) => /pilares_academicos_01\.ts$/.test(f))
    expect(migration).toBeDefined()
    expect(existsSync(resolve(root, `apps/cms/src/migrations/${migration!.replace(/\.ts$/, '.json')}`))).toBe(true)
    expect(read('apps/cms/src/migrations/index.ts')).toMatch(/pilares_academicos_01/)
    const sql = read(`apps/cms/src/migrations/${migration}`)
    // Solo objetos propios: ningún DROP ni ALTER sobre tablas que no sean del global.
    expect(sql.match(/DROP TABLE IF EXISTS "(?!pilares)/g)).toBeNull()
    expect(sql.match(/ALTER TABLE "(?!pilares)/g)).toBeNull()
    // El down se niega con datos cargados.
    expect(sql).toMatch(/EXISTS \(SELECT 1 FROM "pilares"\) THEN\s+RAISE EXCEPTION/)
    expect(read('app/api/revalidate/route.ts')).toMatch(/'pilares-academicos'/)
  })
})
