// PRA-01 (fase CMS): migración manual de reconocimientos, acreditaciones y campos de facultades.
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push en dev;
// (2) un `down` ciego borraría premios y acreditaciones cargados por el PO.
// Límite: contrato sobre el texto del SQL, su snapshot y el `down` con una BD simulada; el SQL real se
// probó aparte contra la BD local dentro de una transacción con ROLLBACK (ver spec §11).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { down as praDown } from '../../apps/cms/src/migrations/20261023_223448_pra_01_premios_acreditaciones'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261023_150000_perf_db_indexes'
const NAME = '20261023_223448_pra_01_premios_acreditaciones'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
const upSql = src.split('export async function up')[1].split('export async function down')[0]

describe('PRA-01: migración', () => {
  it('existe, va después de perf_db y está registrada en index.ts con su snapshot', () => {
    expect(NAME > PREVIOUS).toBe(true)
    expect(readdirSync(DIR)).toContain(`${NAME}.ts`)
    expect(readdirSync(DIR)).toContain(`${NAME}.json`)
    expect(readFileSync(resolve(DIR, 'index.ts'), 'utf8')).toContain(`name: '${NAME}'`)
  })

  it('crea las tres tablas y las columnas de facultades y de bloqueos con IF NOT EXISTS', () => {
    for (const t of ['reconocimientos', 'reconocimientos_ediciones', 'acreditaciones']) {
      expect(upSql).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    }
    expect(upSql).toContain('ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "siglas" varchar')
    expect(upSql).toContain('ALTER TABLE "facultades" ADD COLUMN IF NOT EXISTS "logo_path" varchar')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "reconocimientos_id" integer')
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS "acreditaciones_id" integer')
  })

  it('es idempotente: ningún CREATE/ADD sin protección', () => {
    expect(upSql).not.toMatch(/CREATE TABLE "/)
    expect(upSql).not.toMatch(/CREATE INDEX "/)
    expect(upSql).not.toMatch(/ADD COLUMN "/)
    // Tipos y restricciones solo dentro de DO ... EXCEPTION duplicate_object.
    const unprotected = upSql
      .replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/g, '')
      .match(/CREATE TYPE|ADD CONSTRAINT/g)
    expect(unprotected).toBeNull()
  })

  it('el up es aditivo: sin DROP, DELETE, UPDATE ni TRUNCATE', () => {
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bTRUNCATE\b/i)
  })

  it('los campos obligatorios y por defecto coinciden con las colecciones', () => {
    expect(upSql).toContain('"fuente_url" varchar NOT NULL')
    expect(upSql).toContain('"active" boolean DEFAULT false')
    expect(upSql).toContain('"verificado" boolean DEFAULT false')
    expect(upSql).toContain('"organismo" "enum_acreditaciones_organismo" DEFAULT \'aneaes\' NOT NULL')
  })

  it('el snapshot encadena con perf_db y añade las tres tablas', () => {
    const snap = JSON.parse(readFileSync(resolve(DIR, `${NAME}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${PREVIOUS}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    for (const t of ['reconocimientos', 'reconocimientos_ediciones', 'acreditaciones']) {
      expect(snap.tables[`public.${t}`], t).toBeDefined()
      expect(prev.tables[`public.${t}`]).toBeUndefined()
    }
    expect(snap.tables['public.facultades'].columns).toHaveProperty('siglas')
    expect(snap.tables['public.facultades'].columns).toHaveProperty('logo_path')
  })
})

describe('PRA-01: down seguro', () => {
  const fakeDb = (rows: Record<string, number>) => {
    const executed: string[] = []
    const db = {
      execute: async (q: unknown) => {
        // Texto SQL real: concatena los fragmentos de `sql`/`sql.raw` (JSON.stringify escaparía las comillas).
        const chunks = (q as { queryChunks?: Array<{ value?: string[] }> }).queryChunks ?? []
        const text = chunks.flatMap((c) => c.value ?? []).join('')
        executed.push(text)
        const hit = Object.keys(rows).find((t) => text.includes(`"${t}"`) && text.includes('count(*)'))
        if (hit) return { rows: [{ n: rows[hit] }] }
        if (text.includes('to_regclass')) return { rows: [{ ok: true }] }
        return { rows: [] }
      },
    }
    return { db, executed }
  }

  it('se niega a ejecutar si hay filas y no borra nada', async () => {
    const { db, executed } = fakeDb({ reconocimientos: 1, acreditaciones: 0 })
    await expect(praDown({ db } as never)).rejects.toThrow(/PRA-01.*reconocimientos/)
    expect(executed.some((q) => q.includes('DROP TABLE'))).toBe(false)
  })

  it('con tablas vacías retira solo lo añadido y conserva las columnas de facultades', async () => {
    const { db, executed } = fakeDb({ reconocimientos: 0, acreditaciones: 0 })
    await praDown({ db } as never)
    const all = executed.join('\n')
    expect(all).toContain('DROP TABLE IF EXISTS')
    expect(all).not.toMatch(/"facultades"/)
    expect(all).not.toContain('"siglas"')
  })
})
