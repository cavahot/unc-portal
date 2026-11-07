// INST-05 (T1): migración de la colección `tramites`, la colección y su acceso (spec docs/specs/portal/TRAMITES.md §2.1-2.3).
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push en desarrollo;
// (2) un `down` ciego borraría los trámites que el equipo institucional ya cargó; (3) un anónimo leyendo trámites
// inactivos o escribiendo sin rol; (4) guardar o borrar sin refrescar el portal.
// Límite: contrato sobre el texto del SQL, el snapshot y el `down` con una BD simulada; el SQL real se prueba aparte en una
// base sintética (ver odd/tasks/tramites-cms.md, L de verificación).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))
import { Tramites } from '../../apps/cms/src/collections/Tramites'
import { down as migrationDown } from '../../apps/cms/src/migrations/20261107_172140_tramites_01_coleccion'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261106_224807_transparencia_institucional_01'
const NAME = '20261107_172140_tramites_01_coleccion'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
const upSql = src.split('export async function up')[1].split('export async function down')[0]

describe('INST-05 migración tramites_01', () => {
  it('existe, va después de la anterior, está registrada en index.ts y tiene su snapshot', () => {
    expect(NAME > PREVIOUS).toBe(true)
    expect(readdirSync(DIR)).toContain(`${NAME}.ts`)
    expect(readdirSync(DIR)).toContain(`${NAME}.json`)
    const index = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
    expect(index).toContain(`name: '${NAME}'`)
    // Encadenada: el índice mantiene el orden cronológico.
    expect(index.indexOf(PREVIOUS)).toBeLessThan(index.indexOf(NAME))
  })

  it('crea las dos tablas y la columna de bloqueo con IF NOT EXISTS', () => {
    for (const t of ['tramites', 'tramites_requisitos']) expect(upSql).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "tramites_id" integer')
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
    expect(new Set(alters)).toEqual(new Set(['payload_locked_documents_rels', 'tramites_requisitos', 'tramites']))
  })

  it('el esquema coincide con la colección: obligatorios y valores por defecto', () => {
    expect(upSql).toMatch(/"facultad_id" integer NOT NULL/)
    expect(upSql).toMatch(/"titulo" varchar NOT NULL/)
    expect(upSql).toMatch(/"texto" varchar NOT NULL/)
    expect(upSql).toMatch(/"orden" numeric DEFAULT 99/)
    expect(upSql).toMatch(/"activa" boolean DEFAULT true/)
  })

  it('el down se niega a correr si hay trámites y, si no, borra solo lo propio', async () => {
    const calls: string[] = []
    const db = { execute: async (q: { queryChunks?: unknown[] } | string) => void calls.push(JSON.stringify(q)) }
    await migrationDown({ db } as never)
    const text = calls.join(' ')
    expect(text).toContain('RAISE EXCEPTION')
    expect(text).toContain('EXISTS (SELECT 1 FROM \\"tramites\\")')
    expect(text).toContain('DROP TABLE IF EXISTS \\"tramites_requisitos\\"')
    expect(text).not.toMatch(/DROP TABLE IF EXISTS \\"(facultades|carreras|users)\\"/)
  })
})

describe('INST-05 colección Tramites', () => {
  const field = (name: string) => Tramites.fields.find((f) => 'name' in f && f.name === name) as Record<string, unknown>

  it('tiene el slug, la facultad obligatoria, el título obligatorio y los requisitos como lista acotada', () => {
    expect(Tramites.slug).toBe('tramites')
    expect(field('facultad')).toMatchObject({ type: 'relationship', relationTo: 'facultades', required: true })
    expect(field('titulo')).toMatchObject({ type: 'text', required: true, maxLength: 200 })
    expect(field('requisitos')).toMatchObject({ type: 'array', maxRows: 30 })
    expect((field('requisitos').fields as Array<Record<string, unknown>>)[0]).toMatchObject({ name: 'texto', required: true, maxLength: 600 })
  })

  it('por defecto el trámite está activo y con orden 99; la etiqueta y la nota son opcionales y acotadas', () => {
    expect(field('activa')).toMatchObject({ type: 'checkbox', defaultValue: true })
    expect(field('orden')).toMatchObject({ defaultValue: 99, min: 0 })
    expect(field('etiqueta')).toMatchObject({ maxLength: 40 })
    expect(field('etiqueta').required).toBeUndefined()
    expect(field('nota').required).toBeUndefined()
  })

  it('el acceso de lectura pública depende de «activa» y escribir exige el rol institucional', () => {
    const access = Tramites.access as Record<string, unknown>
    for (const k of ['read', 'create', 'update', 'delete']) expect(typeof access[k]).toBe('function')
    const src2 = readFileSync(resolve(process.cwd(), 'apps/cms/src/collections/Tramites.ts'), 'utf8')
    expect(src2).toContain("read: readFlagOrInstitutional('activa')")
    for (const k of ['create', 'update', 'delete']) expect(src2).toContain(`${k}: canWriteInstitutional`)
  })

  it('guardar y borrar revalidan la etiqueta del portal, y esa etiqueta está permitida', async () => {
    const hooks = Tramites.hooks as { afterChange: Array<() => Promise<void>>; afterDelete: Array<() => Promise<void>> }
    const { revalidatePortalTag } = await import('../../apps/cms/src/utilities/revalidation')
    await hooks.afterChange[0]()
    await hooks.afterDelete[0]()
    expect(revalidatePortalTag).toHaveBeenCalledTimes(2)
    expect(revalidatePortalTag).toHaveBeenCalledWith('tramites')
    expect(readFileSync(resolve(process.cwd(), 'app/api/revalidate/route.ts'), 'utf8')).toContain("'tramites',")
  })

  it('está registrada en la configuración de Payload', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(cfg).toContain("import { Tramites } from './collections/Tramites'")
    expect(cfg).toMatch(/\n\s+Tramites,\n/)
  })
})
