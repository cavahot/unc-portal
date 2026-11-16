// INST-08 (T1): migración `legales_01`, los dos globals y la activación de la localización (spec docs/specs/portal/LEGALES.md §2.1-2.5).
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push en desarrollo; (2) un `down`
// ciego borraría los textos legales ya cargados; (3) la localización tocando datos existentes más allá de columnas nuevas y
// nulas; (4) un correo sin forma llegando a un `mailto:`; (5) escribir sin rol o guardar sin refrescar el portal.
// Límite: contrato sobre el texto del SQL, el snapshot y el `down` con una BD simulada; el SQL real se probó aparte en una
// base sintética (ver odd/tasks/legales-cms.md, log de verificación).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}), APIError: class APIError extends Error {} }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag: vi.fn() }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => '10.0.0.1' }))
import { PoliticaPrivacidad } from '../../apps/cms/src/globals/PoliticaPrivacidad'
import { DeclaracionAccesibilidad } from '../../apps/cms/src/globals/DeclaracionAccesibilidad'
import { down as migrationDown } from '../../apps/cms/src/migrations/20261107_191247_legales_01_globals'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261107_182316_calendario_01_coleccion'
const NAME = '20261107_191247_legales_01_globals'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
const upSql = src.split('export async function up')[1].split('export async function down')[0]
const cfg = readFileSync(resolve(process.cwd(), 'apps/cms/src/payload.config.ts'), 'utf8')

describe('INST-08 migración legales_01', () => {
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

  it('crea las tablas de los dos globals y el enumerado de idiomas con los cuatro códigos', () => {
    for (const t of ['politica_privacidad', 'politica_privacidad_secciones', 'declaracion_accesibilidad', 'declaracion_accesibilidad_caracteristicas', 'declaracion_accesibilidad_locales']) {
      expect(upSql).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    }
    expect(upSql).toContain(`CREATE TYPE "public"."_locales" AS ENUM('es', 'en', 'pt-BR', 'gn')`)
  })

  it('es idempotente: ningún CREATE/ADD sin protección', () => {
    expect(upSql).not.toMatch(/CREATE TABLE "/)
    expect(upSql).not.toMatch(/CREATE (UNIQUE )?INDEX "/)
    expect(upSql).not.toMatch(/ADD COLUMN "/)
    const unprotected = upSql.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '').match(/CREATE TYPE|ADD CONSTRAINT/g)
    expect(unprotected).toBeNull()
  })

  it('el up es aditivo: sin DROP, DELETE, UPDATE ni TRUNCATE; fuera de los globals solo agrega columnas nulas a las versiones', () => {
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bTRUNCATE\b/i)
    const alterTables = new Set([...upSql.matchAll(/ALTER TABLE "(\w+)"/g)].map((m) => m[1]))
    expect(alterTables).toEqual(
      new Set(['_noticias_v', '_paginas_v', 'politica_privacidad_secciones', 'declaracion_accesibilidad_caracteristicas', 'declaracion_accesibilidad_locales']),
    )
    // Las columnas agregadas a tablas existentes no llevan NOT NULL ni DEFAULT: no leen ni cambian filas.
    for (const m of upSql.matchAll(/ALTER TABLE "(_noticias_v|_paginas_v)" ADD COLUMN IF NOT EXISTS "[\w]+" [^;]+;/g)) expect(m[0]).not.toMatch(/NOT NULL|DEFAULT/)
  })

  it('el down se niega a correr si hay filas o datos y, si no, borra solo lo propio', async () => {
    const calls: string[] = []
    const db = { execute: async (q: unknown) => void calls.push(JSON.stringify(q)) }
    await migrationDown({ db } as never)
    const text = calls.join(' ')
    expect(text.match(/RAISE EXCEPTION/g)).toHaveLength(4)
    expect(text).toContain('EXISTS (SELECT 1 FROM \\"politica_privacidad\\")')
    expect(text).toContain('EXISTS (SELECT 1 FROM \\"declaracion_accesibilidad\\")')
    expect(text).toContain('DROP TABLE IF EXISTS \\"politica_privacidad\\"')
    expect(text).not.toMatch(/DROP TABLE IF EXISTS \\"(noticias|paginas|_noticias_v|_paginas_v|users|calendario_academico)\\"/)
  })
})

describe('INST-08 localización en la configuración de Payload', () => {
  it('declara los cuatro idiomas, el español por defecto y el respaldo al español', () => {
    expect(cfg).toMatch(/localization:\s*\{/)
    for (const code of ['es', 'en', 'pt-BR', 'gn']) expect(cfg).toContain(`code: '${code}'`)
    expect(cfg).toContain("defaultLocale: 'es'")
    expect(cfg).toMatch(/fallback:\s*true/)
  })

  it('registra los dos globals', () => {
    expect(cfg).toContain("import { PoliticaPrivacidad } from './globals/PoliticaPrivacidad'")
    expect(cfg).toContain("import { DeclaracionAccesibilidad } from './globals/DeclaracionAccesibilidad'")
    expect(cfg).toMatch(/\n\s+PoliticaPrivacidad,\n/)
    expect(cfg).toMatch(/\n\s+DeclaracionAccesibilidad,\n/)
  })
})

describe('INST-08 globals', () => {
  const field = (g: { fields: unknown[] }, name: string) => g.fields.find((f) => (f as { name?: string }).name === name) as Record<string, unknown>
  const sub = (f: Record<string, unknown>, name: string) => (f.fields as Array<Record<string, unknown>>).find((x) => x.name === name) as Record<string, unknown>

  it('política de privacidad: fecha de día completo no localizada y secciones localizadas, acotadas y obligatorias', () => {
    expect(PoliticaPrivacidad.slug).toBe('politica-privacidad')
    expect(field(PoliticaPrivacidad, 'ultimaActualizacion')).toMatchObject({ type: 'date', required: true })
    expect(field(PoliticaPrivacidad, 'ultimaActualizacion').localized).toBeUndefined()
    const s = field(PoliticaPrivacidad, 'secciones')
    expect(s).toMatchObject({ type: 'array', localized: true, required: true, minRows: 1, maxRows: 20 })
    expect(sub(s, 'titulo')).toMatchObject({ required: true, maxLength: 120 })
    expect(sub(s, 'contenido')).toMatchObject({ required: true, maxLength: 3000 })
  })

  it('declaración de accesibilidad: descripción y características localizadas; el correo no se localiza', () => {
    expect(DeclaracionAccesibilidad.slug).toBe('declaracion-accesibilidad')
    expect(field(DeclaracionAccesibilidad, 'descripcion')).toMatchObject({ type: 'textarea', localized: true, required: true, maxLength: 600 })
    const c = field(DeclaracionAccesibilidad, 'caracteristicas')
    expect(c).toMatchObject({ type: 'array', localized: true, required: true, minRows: 1, maxRows: 20 })
    expect(sub(c, 'titulo')).toMatchObject({ required: true, maxLength: 120 })
    expect(sub(c, 'descripcion')).toMatchObject({ required: true, maxLength: 400 })
    expect(field(DeclaracionAccesibilidad, 'correoContacto').localized).toBeUndefined()
  })

  it('el correo exige una forma válida en el servidor', () => {
    const v = field(DeclaracionAccesibilidad, 'correoContacto').validate as (x: unknown) => true | string
    expect(v('secgral@unc.edu.py')).toBe(true)
    for (const bad of [undefined, '', '  ', 'sin-arroba', 'a@b', 'a b@c.py', 'javascript:alert(1)@x.py<', 'x'.repeat(260) + '@unc.edu.py']) expect(v(bad), String(bad)).not.toBe(true)
  })

  it('lectura pública, escritura solo con permiso de global, y se audita y revalida cada cambio', async () => {
    for (const g of [PoliticaPrivacidad, DeclaracionAccesibilidad]) {
      const access = g.access as Record<string, unknown>
      expect(typeof access.read).toBe('function')
      expect(typeof access.update).toBe('function')
      expect(access.update).not.toBe(access.read)
      expect((g.hooks as { afterChange: unknown[] }).afterChange).toHaveLength(2)
    }
    const { revalidatePortalTag } = await import('../../apps/cms/src/utilities/revalidation')
    await (PoliticaPrivacidad.hooks as { afterChange: Array<() => Promise<void>> }).afterChange[0]()
    await (DeclaracionAccesibilidad.hooks as { afterChange: Array<() => Promise<void>> }).afterChange[0]()
    expect(revalidatePortalTag).toHaveBeenCalledWith('politica-privacidad')
    expect(revalidatePortalTag).toHaveBeenCalledWith('declaracion-accesibilidad')
    const route = readFileSync(resolve(process.cwd(), 'app/api/revalidate/route.ts'), 'utf8')
    expect(route).toContain("'politica-privacidad',")
    expect(route).toContain("'declaracion-accesibilidad',")
  })
})
