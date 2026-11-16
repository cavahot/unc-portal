// INST-12 (T1): migración `dependencias_01` y colección `dependencias-contacto` (spec docs/specs/portal/DEPENDENCIAS.md §2.1-2.2).
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push; (2) un `down` ciego borra los
// datos de contacto ya cargados; (3) escribir sin permiso, o guardar/borrar sin refrescar el portal; (4) un anónimo leyendo
// dependencias inactivas; (5) una etiqueta de revalidación no permitida (el portal rechazaría el aviso).
// Límite: contrato sobre el texto del SQL, el snapshot y el `down` con una BD simulada; el SQL real se probó aparte en una base
// sintética (ver odd/tasks/dependencias-cms.md, log de verificación).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
const revalidatePortalTag = vi.hoisted(() => vi.fn())
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => '10.0.0.1' }))
import { DependenciasContacto } from '../../apps/cms/src/collections/DependenciasContacto'
import { down as migrationDown } from '../../apps/cms/src/migrations/20261108_163903_dependencias_01'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261107_200336_legalizaciones_01_global'
const NAME = '20261108_163903_dependencias_01'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8').replace(/\r\n/g, '\n')
const upSql = src.split('export async function up')[1].split('export async function down')[0]

describe('INST-12 migración dependencias_01', () => {
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

  it('crea la colección y sus tres listas anidadas, con la dirección obligatoria y el slug único', () => {
    for (const t of ['dependencias_contacto', 'dependencias_contacto_sedes', 'dependencias_contacto_sedes_telefonos', 'dependencias_contacto_sedes_correos']) {
      expect(upSql).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    }
    expect(upSql).toMatch(/"direccion" varchar NOT NULL/)
    expect(upSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "dependencias_contacto_slug_idx"')
  })

  it('es idempotente y aditiva: ningún CREATE/ADD sin protección y sin tocar tablas ajenas', () => {
    expect(upSql).not.toMatch(/CREATE TABLE "/)
    expect(upSql).not.toMatch(/CREATE (UNIQUE )?INDEX "/)
    expect(upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/ADD CONSTRAINT/g)).toBeNull()
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bTRUNCATE\b/i)
    const alters = new Set([...upSql.matchAll(/ALTER TABLE "(\w+)"/g)].map((m) => m[1]))
    expect([...alters].every((t) => t.startsWith('dependencias_contacto') || t === 'payload_locked_documents_rels')).toBe(true)
  })

  it('el down se niega a correr si hay filas y, si no, borra solo lo propio', async () => {
    const calls: string[] = []
    const db = { execute: async (q: unknown) => void calls.push(JSON.stringify(q)) }
    await migrationDown({ db } as never)
    const text = calls.join(' ')
    expect(text).toContain('RAISE EXCEPTION')
    expect(text).toContain('EXISTS (SELECT 1 FROM \\"dependencias_contacto\\")')
    expect(text).toContain('DROP TABLE IF EXISTS \\"dependencias_contacto_sedes\\"')
    expect(text).not.toMatch(/DROP TABLE IF EXISTS \\"(calendario_academico|legalizaciones|users)\\"/)
  })

  it('está documentada en el README de migraciones', () => {
    expect(readFileSync(resolve(DIR, 'README.md'), 'utf8')).toContain('dependencias_01')
  })
})

describe('INST-12 colección dependencias-contacto', () => {
  const access = DependenciasContacto.access as Record<string, (a: unknown) => unknown>
  const as = (role?: string) => ({ req: { user: role ? { role, roles: [role] } : null } })

  it('anónimo y editor solo leen activas; solo el rol institucional escribe', async () => {
    expect(DependenciasContacto.slug).toBe('dependencias-contacto')
    expect(await access.read(as())).toEqual({ activa: { equals: true } })
    expect(await access.create(as())).toBeFalsy()
    expect(await access.update(as())).toBeFalsy()
    expect(await access.delete(as())).toBeFalsy()
    expect(await access.create(as('superadmin'))).toBe(true)
    expect(await access.update(as('web-admin'))).toBe(true)
  })

  it('refresca el portal al guardar y al borrar con una etiqueta permitida', async () => {
    revalidatePortalTag.mockClear()
    await (DependenciasContacto.hooks!.afterChange![0] as () => Promise<void>)()
    await (DependenciasContacto.hooks!.afterDelete![0] as () => Promise<void>)()
    expect(revalidatePortalTag.mock.calls).toEqual([['dependencias-contacto'], ['dependencias-contacto']])
    expect(readFileSync(resolve(process.cwd(), 'app/api/revalidate/route.ts'), 'utf8')).toContain("'dependencias-contacto'")
  })

  it('exige nombre, identificador único y al menos una sede con dirección', () => {
    const f = (name: string) => DependenciasContacto.fields.find((x) => (x as { name?: string }).name === name) as unknown as Record<string, unknown>
    expect(f('nombre').required).toBe(true)
    expect(f('slug')).toMatchObject({ required: true, unique: true })
    expect(f('sedes')).toMatchObject({ required: true, minRows: 1 })
  })
})
