// INST-07 (T1): migración de la colección `calendario-academico`, la colección, sus validaciones y su acceso
// (spec docs/specs/portal/CALENDARIO.md §2.1-2.3).
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push en desarrollo; (2) un
// `down` ciego borraría las fechas que Secretaría ya cargó; (3) un período con las fechas invertidas, o un evento sin
// descripción cuando es «otro»; (4) un anónimo leyendo bloques inactivos o escribiendo sin rol; (5) guardar o borrar sin
// refrescar el portal.
// Límite: contrato sobre el texto del SQL, el snapshot y el `down` con una BD simulada; el SQL real se prueba aparte en una
// base sintética (ver odd/tasks/calendario-cms.md, log de verificación).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))
import { CalendarioAcademico } from '../../apps/cms/src/collections/CalendarioAcademico'
import { down as migrationDown } from '../../apps/cms/src/migrations/20261107_182316_calendario_01_coleccion'
import {
  CALENDARIO_EVENTOS,
  validateCalendarioDescripcion,
  validateCalendarioEvento,
  validateCalendarioFin,
} from '../../apps/cms/src/utilities/validators'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261107_172140_tramites_01_coleccion'
const NAME = '20261107_182316_calendario_01_coleccion'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
const upSql = src.split('export async function up')[1].split('export async function down')[0]

describe('INST-07 migración calendario_01', () => {
  it('existe, va después de la anterior, está registrada en index.ts y su snapshot se encadena con la anterior', () => {
    expect(NAME > PREVIOUS).toBe(true)
    expect(readdirSync(DIR)).toContain(`${NAME}.ts`)
    expect(readdirSync(DIR)).toContain(`${NAME}.json`)
    const index = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
    expect(index).toContain(`name: '${NAME}'`)
    expect(index.indexOf(PREVIOUS)).toBeLessThan(index.indexOf(NAME))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${PREVIOUS}.json`), 'utf8'))
    const cur = JSON.parse(readFileSync(resolve(DIR, `${NAME}.json`), 'utf8'))
    expect(cur.prevId).toBe(prev.id) // migrate:create deja el UUID nulo si no se corrige
  })

  it('crea las dos tablas, los dos enumerados y la columna de bloqueo, todo con protección', () => {
    for (const t of ['calendario_academico', 'calendario_academico_entradas']) expect(upSql).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    for (const e of ['enum_calendario_academico_tipo', 'enum_calendario_academico_entradas_evento']) expect(upSql).toContain(`CREATE TYPE "public"."${e}"`)
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "calendario_academico_id" integer')
  })

  it('es idempotente: ningún CREATE/ADD sin protección', () => {
    expect(upSql).not.toMatch(/CREATE TABLE "/)
    expect(upSql).not.toMatch(/CREATE INDEX "/)
    expect(upSql).not.toMatch(/ADD COLUMN "/)
    const unprotected = upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/CREATE TYPE|ADD CONSTRAINT/g)
    expect(unprotected).toBeNull()
  })

  it('el up es aditivo: sin DROP, DELETE, UPDATE ni TRUNCATE y solo toca tablas nuevas o la columna de bloqueo', () => {
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bTRUNCATE\b/i)
    const alters = [...upSql.matchAll(/ALTER TABLE "(\w+)"/g)].map((m) => m[1])
    expect(new Set(alters)).toEqual(new Set(['payload_locked_documents_rels', 'calendario_academico_entradas']))
  })

  it('el esquema coincide con la colección: obligatorios, valores por defecto y los valores de los enumerados', () => {
    expect(upSql).toMatch(/"titulo" varchar NOT NULL/)
    expect(upSql).toMatch(/"anio" numeric NOT NULL/)
    expect(upSql).toMatch(/"tipo" "enum_calendario_academico_tipo" DEFAULT 'semestre' NOT NULL/)
    expect(upSql).toMatch(/"orden" numeric DEFAULT 99/)
    expect(upSql).toMatch(/"activa" boolean DEFAULT true/)
    expect(upSql).toMatch(/"inicio" timestamp\(3\) with time zone NOT NULL/)
    expect(upSql).toMatch(/"fin" timestamp\(3\) with time zone(?!\s+NOT NULL)/)
    for (const e of CALENDARIO_EVENTOS) expect(upSql).toContain(`'${e}'`)
  })

  it('el down se niega a correr si hay bloques y, si no, borra solo lo propio', async () => {
    const calls: string[] = []
    const db = { execute: async (q: unknown) => void calls.push(JSON.stringify(q)) }
    await migrationDown({ db } as never)
    const text = calls.join(' ')
    expect(text).toContain('RAISE EXCEPTION')
    expect(text).toContain('EXISTS (SELECT 1 FROM \\"calendario_academico\\")')
    expect(text).toContain('DROP TABLE IF EXISTS \\"calendario_academico_entradas\\"')
    expect(text).not.toMatch(/DROP TABLE IF EXISTS \\"(facultades|carreras|users|tramites)\\"/)
  })
})

describe('INST-07 colección CalendarioAcademico', () => {
  const field = (name: string) => CalendarioAcademico.fields.find((f) => 'name' in f && f.name === name) as Record<string, unknown>
  const entrada = (name: string) => ((field('entradas').fields as Array<Record<string, unknown>>).find((f) => f.name === name) as Record<string, unknown>)

  it('tiene el slug, el título y el año obligatorios y el tipo con sus dos valores', () => {
    expect(CalendarioAcademico.slug).toBe('calendario-academico')
    expect(field('titulo')).toMatchObject({ type: 'text', required: true, maxLength: 120 })
    expect(field('anio')).toMatchObject({ type: 'number', required: true, min: 2000, max: 2100 })
    expect(field('tipo')).toMatchObject({ type: 'select', required: true, defaultValue: 'semestre' })
    expect((field('tipo').options as Array<{ value: string }>).map((o) => o.value)).toEqual(['semestre', 'examenes'])
  })

  it('por defecto el bloque está activo y con orden 99; las entradas son una lista acotada con fechas de día completo', () => {
    expect(field('activa')).toMatchObject({ type: 'checkbox', defaultValue: true })
    expect(field('orden')).toMatchObject({ defaultValue: 99, min: 0 })
    expect(field('entradas')).toMatchObject({ type: 'array', required: true, minRows: 1, maxRows: 40 })
    expect(entrada('inicio')).toMatchObject({ type: 'date', required: true })
    expect(entrada('fin')).toMatchObject({ type: 'date' })
    expect((entrada('inicio').admin as { date: { pickerAppearance: string } }).date.pickerAppearance).toBe('dayOnly')
    expect((entrada('fin').admin as { date: { pickerAppearance: string } }).date.pickerAppearance).toBe('dayOnly')
  })

  it('los eventos del selector coinciden con la lista que usa el portal', () => {
    expect((entrada('evento').options as Array<{ value: string }>).map((o) => o.value)).toEqual([...CALENDARIO_EVENTOS])
  })

  it('las validaciones de la colección son las de validators.ts', () => {
    expect(entrada('fin').validate).toBe(validateCalendarioFin)
    expect(entrada('evento').validate).toBe(validateCalendarioEvento)
    expect(entrada('descripcion').validate).toBe(validateCalendarioDescripcion)
  })

  it('el acceso de lectura pública depende de «activa» y escribir exige el rol institucional', () => {
    const access = CalendarioAcademico.access as Record<string, unknown>
    for (const k of ['read', 'create', 'update', 'delete']) expect(typeof access[k]).toBe('function')
    const text = readFileSync(resolve(process.cwd(), 'apps/cms/src/collections/CalendarioAcademico.ts'), 'utf8')
    expect(text).toContain("read: readFlagOrInstitutional('activa')")
    for (const k of ['create', 'update', 'delete']) expect(text).toContain(`${k}: canWriteInstitutional`)
  })

  it('guardar y borrar revalidan la etiqueta del portal, y esa etiqueta está permitida', async () => {
    const hooks = CalendarioAcademico.hooks as { afterChange: Array<() => Promise<void>>; afterDelete: Array<() => Promise<void>> }
    const { revalidatePortalTag } = await import('../../apps/cms/src/utilities/revalidation')
    await hooks.afterChange[0]()
    await hooks.afterDelete[0]()
    expect(revalidatePortalTag).toHaveBeenCalledWith('calendario-academico')
    expect(revalidatePortalTag).toHaveBeenCalledTimes(2)
    expect(readFileSync(resolve(process.cwd(), 'app/api/revalidate/route.ts'), 'utf8')).toContain("'calendario-academico',")
  })

  it('está registrada en la configuración de Payload', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(cfg).toContain("import { CalendarioAcademico } from './collections/CalendarioAcademico'")
    expect(cfg).toMatch(/\n\s+CalendarioAcademico,\n/)
  })
})

describe('INST-07 validaciones del CMS', () => {
  it('fin: opcional; si existe debe ser válida y no anterior al inicio', () => {
    const sib = { siblingData: { inicio: '2026-03-16T12:00:00.000Z' } }
    expect(validateCalendarioFin(undefined, sib)).toBe(true)
    expect(validateCalendarioFin(null, sib)).toBe(true)
    expect(validateCalendarioFin('', sib)).toBe(true)
    expect(validateCalendarioFin('2026-03-27T12:00:00.000Z', sib)).toBe(true)
    expect(validateCalendarioFin('2026-03-16T12:00:00.000Z', sib)).toBe(true) // un solo día
    expect(validateCalendarioFin('2026-03-15T12:00:00.000Z', sib)).toMatch(/anterior/)
    expect(validateCalendarioFin('no-es-fecha', sib)).toMatch(/no es válida/)
    expect(validateCalendarioFin(new Date('2026-03-20T12:00:00Z'), sib)).toBe(true)
  })

  it('fin sin inicio disponible no bloquea (lo exige el campo obligatorio de inicio)', () => {
    expect(validateCalendarioFin('2026-03-15T12:00:00.000Z', {})).toBe(true)
    expect(validateCalendarioFin('2026-03-15T12:00:00.000Z', { siblingData: {} })).toBe(true)
  })

  it('evento: obligatorio y válido en un semestre; libre en las mesas de exámenes', () => {
    const sem = { data: { tipo: 'semestre' } }
    expect(validateCalendarioEvento('inicio-clases', sem)).toBe(true)
    expect(validateCalendarioEvento('otro', sem)).toBe(true)
    expect(validateCalendarioEvento(undefined, sem)).toMatch(/Elija un evento/)
    expect(validateCalendarioEvento('inventado', sem)).toMatch(/Elija un evento/)
    expect(validateCalendarioEvento(undefined, { data: { tipo: 'examenes' } })).toBe(true)
    expect(validateCalendarioEvento(undefined, {})).toBe(true)
  })

  it('descripción: obligatoria si el evento es «otro» y de hasta 160 caracteres', () => {
    expect(validateCalendarioDescripcion('', { siblingData: { evento: 'otro' } })).toMatch(/Escriba la descripción/)
    expect(validateCalendarioDescripcion('   ', { siblingData: { evento: 'otro' } })).toMatch(/Escriba la descripción/)
    expect(validateCalendarioDescripcion('Feriado', { siblingData: { evento: 'otro' } })).toBe(true)
    expect(validateCalendarioDescripcion('', { siblingData: { evento: 'inicio-clases' } })).toBe(true)
    expect(validateCalendarioDescripcion(undefined, {})).toBe(true)
    expect(validateCalendarioDescripcion('x'.repeat(161), {})).toMatch(/160/)
    expect(validateCalendarioDescripcion('x'.repeat(160), {})).toBe(true)
  })
})
