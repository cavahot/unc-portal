// INST-11 (T1): migración `legalizaciones_01` y global `legalizaciones` (spec docs/specs/portal/LEGALIZACIONES.md §2.1-2.2).
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push; (2) un `down` ciego borra el
// contenido ya cargado; (3) el global y `titulos-inscripcion` divergiendo en reglas (los campos se comparten, no se copian);
// (4) la nota del CONES (propia de /titulos) filtrándose a legalizaciones; (5) escribir sin permiso o guardar sin refrescar
// el portal.
// Límite: contrato sobre el texto del SQL, el snapshot y el `down` con una BD simulada; el SQL real se probó aparte en una base
// sintética (ver odd/tasks/legalizaciones-cms.md, log de verificación).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => '10.0.0.1' }))
import { Legalizaciones } from '../../apps/cms/src/globals/Legalizaciones'
import { TRAMITE_FIELDS, TitulosInscripcion } from '../../apps/cms/src/globals/TitulosInscripcion'
import { down as migrationDown } from '../../apps/cms/src/migrations/20261107_200336_legalizaciones_01_global'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261107_191247_legales_01_globals'
const NAME = '20261107_200336_legalizaciones_01_global'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
const upSql = src.split('export async function up')[1].split('export async function down')[0]
const names = (fields: unknown[]) => fields.map((f) => (f as { name?: string }).name)

describe('INST-11 migración legalizaciones_01', () => {
  it('existe, va después de la anterior, está registrada y su snapshot se encadena con la anterior', () => {
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

  it('crea el global, sus tres listas y el enumerado del acento', () => {
    for (const t of ['legalizaciones', 'legalizaciones_tipos', 'legalizaciones_tipos_requisitos', 'legalizaciones_pasos']) {
      expect(upSql).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    }
    expect(upSql).toContain(`CREATE TYPE "public"."enum_legalizaciones_tipos_acento" AS ENUM('verde', 'azul', 'violeta')`)
    expect(upSql).toContain('"arancel_id" integer')
    expect(upSql).toContain('REFERENCES "public"."aranceles_rectorado"("id") ON DELETE set null')
  })

  it('es idempotente y aditiva: ningún CREATE/ADD sin protección y sin tocar tablas existentes', () => {
    expect(upSql).not.toMatch(/CREATE TABLE "/)
    expect(upSql).not.toMatch(/CREATE INDEX "/)
    expect(upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/CREATE TYPE|ADD CONSTRAINT/g)).toBeNull()
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bTRUNCATE\b/i)
    const alters = new Set([...upSql.matchAll(/ALTER TABLE "(\w+)"/g)].map((m) => m[1]))
    expect([...alters].every((t) => t.startsWith('legalizaciones'))).toBe(true)
  })

  it('el esquema coincide con el global: obligatorios y plazo numérico', () => {
    for (const col of ['titulo', 'descripcion', 'unidad']) expect(upSql).toMatch(new RegExp(`"${col}" varchar NOT NULL`))
    expect(upSql).toMatch(/"plazo_min_horas" numeric NOT NULL/)
    expect(upSql).toMatch(/"plazo_max_horas" numeric NOT NULL/)
    expect(upSql).toMatch(/"acento" "enum_legalizaciones_tipos_acento" DEFAULT 'verde' NOT NULL/)
  })

  it('el down se niega a correr si hay filas y, si no, borra solo lo propio', async () => {
    const calls: string[] = []
    const db = { execute: async (q: unknown) => void calls.push(JSON.stringify(q)) }
    await migrationDown({ db } as never)
    const text = calls.join(' ')
    expect(text).toContain('RAISE EXCEPTION')
    expect(text).toContain('EXISTS (SELECT 1 FROM \\"legalizaciones\\")')
    expect(text).toContain('DROP TABLE IF EXISTS \\"legalizaciones_pasos\\"')
    expect(text).not.toMatch(/DROP TABLE IF EXISTS \\"(titulos_inscripcion|aranceles_rectorado|politica_privacidad|users)\\"/)
  })
})

describe('INST-11 global legalizaciones', () => {
  it('comparte los campos con titulos-inscripcion, sin la nota del CONES', () => {
    expect(Legalizaciones.slug).toBe('legalizaciones')
    const comunes = names(TRAMITE_FIELDS).filter((n) => n !== 'notaCones')
    expect(names(Legalizaciones.fields)).toEqual(comunes)
    expect(names(TitulosInscripcion.fields)).toEqual(names(TRAMITE_FIELDS))
    expect(names(TitulosInscripcion.fields)).toContain('notaCones')
    expect(names(Legalizaciones.fields)).not.toContain('notaCones')
  })

  it('mantiene las validaciones de los campos compartidos (plazo, slug único, acento de lista cerrada)', () => {
    const f = (g: { fields: unknown[] }, name: string) => g.fields.find((x) => (x as { name?: string }).name === name) as Record<string, unknown>
    for (const name of ['plazoMinHoras', 'plazoMaxHoras', 'tipos']) expect(f(Legalizaciones, name).validate).toBe(f(TitulosInscripcion, name).validate)
    const tipos = f(Legalizaciones, 'tipos').fields as Array<Record<string, unknown>>
    const acento = tipos.find((x) => x.name === 'acento')!
    expect((acento.options as Array<{ value: string }>).map((o) => o.value)).toEqual(['verde', 'azul', 'violeta'])
    expect(f(Legalizaciones, 'arancel')).toMatchObject({ type: 'relationship', relationTo: 'aranceles-rectorado' })
    expect(names(Legalizaciones.fields)).not.toContain('monto') // el monto sale de la fila enlazada
  })

  it('los textos de ayuda hablan de legalizaciones, no de títulos ni del CONES', () => {
    const f = (name: string) => Legalizaciones.fields.find((x) => (x as { name?: string }).name === name) as { label?: string; admin?: { description?: string } }
    expect(f('tipos').label).toBe('Categorías de documentos')
    expect(f('arancel').admin?.description).toContain('Legalizaciones')
    expect(f('arancel').admin?.description).not.toMatch(/Inscripción de Títulos/)
  })

  it('lectura pública, escritura solo con permiso de global, y se audita y revalida cada cambio', async () => {
    const access = Legalizaciones.access as Record<string, unknown>
    expect(typeof access.read).toBe('function')
    expect(access.update).toBe((TitulosInscripcion.access as Record<string, unknown>).update)
    expect((Legalizaciones.hooks as { afterChange: unknown[] }).afterChange).toHaveLength(2)
    const { revalidatePortalTag } = await import('../../apps/cms/src/utilities/revalidation')
    await (Legalizaciones.hooks as { afterChange: Array<() => Promise<void>> }).afterChange[0]()
    expect(revalidatePortalTag).toHaveBeenCalledWith('legalizaciones')
    expect(readFileSync(resolve(process.cwd(), 'app/api/revalidate/route.ts'), 'utf8')).toContain("'legalizaciones',")
  })

  it('está registrado en la configuración de Payload', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(cfg).toContain("import { Legalizaciones } from './globals/Legalizaciones'")
    expect(cfg).toMatch(/\n\s+Legalizaciones,\n/)
  })
})
