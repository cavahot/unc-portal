// MIG-IMG fase 2a: migración manual de `media.sha256` (único) y `media.source_path`.
// Amenazas: (1) una migración no idempotente falla al reaplicarse sobre un esquema creado por push en dev;
// (2) un índice único mal planteado rechazaría las filas anteriores (sha256 NULL); (3) un `down` ciego
// borraría las huellas con las que el cargador evita duplicados.
// Límite: contrato sobre el texto del SQL, el snapshot y el `down` con una BD simulada; no se ejecutó
// `payload migrate` sobre ninguna BD (el esquema equivalente lo aplicó el push del CMS en dev).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { down as migDown } from '../../apps/cms/src/migrations/20261024_120000_mig_img_02_media_provenance'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const PREVIOUS = '20261023_223448_pra_01_premios_acreditaciones'
const NAME = '20261024_120000_mig_img_02_media_provenance'
const src = readFileSync(resolve(DIR, `${NAME}.ts`), 'utf8')
const upSql = src.split('export async function up')[1].split('export async function down')[0]

describe('MIG-IMG-02: migración', () => {
  it('existe, va después de PRA-01 y está registrada después de ella en index.ts con su snapshot', () => {
    expect(NAME > PREVIOUS).toBe(true)
    expect(readdirSync(DIR)).toContain(`${NAME}.ts`)
    expect(readdirSync(DIR)).toContain(`${NAME}.json`)
    const index = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
    expect(index).toContain(`name: '${NAME}'`)
    expect(index.lastIndexOf(`name: '${NAME}'`)).toBeGreaterThan(index.lastIndexOf(`name: '${PREVIOUS}'`))
    expect(readFileSync(resolve(DIR, 'README.md'), 'utf8')).toContain(NAME)
  })

  it('añade las dos columnas e índice único con los nombres que genera Payload, todo con IF NOT EXISTS', () => {
    expect(upSql).toContain('ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sha256" varchar;')
    expect(upSql).toContain('ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source_path" varchar;')
    expect(upSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "media_sha256_idx" ON "media" USING btree ("sha256");')
    expect(upSql).not.toMatch(/ADD COLUMN "|CREATE (UNIQUE )?INDEX "/)
  })

  it('las columnas admiten NULL (filas anteriores) y el índice no usa NULLS NOT DISTINCT', () => {
    expect(upSql).not.toMatch(/NOT NULL/i)
    expect(upSql).not.toMatch(/NULLS NOT DISTINCT/i)
    expect(upSql).not.toMatch(/\bDEFAULT\b/i)
  })

  it('el up es aditivo: sin DROP, DELETE, UPDATE ni TRUNCATE', () => {
    expect(upSql).not.toMatch(/\bDROP\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bTRUNCATE\b/i)
  })

  it('el snapshot encadena con PRA-01 y solo añade las columnas y el índice de media', () => {
    const snap = JSON.parse(readFileSync(resolve(DIR, `${NAME}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${PREVIOUS}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    const media = snap.tables['public.media']
    expect(media.columns.sha256).toMatchObject({ type: 'varchar', notNull: false })
    expect(media.columns.source_path).toMatchObject({ type: 'varchar', notNull: false })
    expect(media.indexes.media_sha256_idx).toMatchObject({ isUnique: true })
    expect(prev.tables['public.media'].columns.sha256).toBeUndefined()
    // Fuera de media, el snapshot es idéntico al anterior.
    const strip = (s: { tables: Record<string, unknown> }) => JSON.stringify({ ...s.tables, 'public.media': null })
    expect(strip(snap)).toBe(strip(prev))
  })
})

describe('MIG-IMG-02: down seguro', () => {
  const fakeDb = (rowsWithProvenance: number) => {
    const executed: string[] = []
    const db = {
      execute: async (q: unknown) => {
        const chunks = (q as { queryChunks?: Array<{ value?: string[] }> }).queryChunks ?? []
        const text = chunks.flatMap((c) => c.value ?? []).join('')
        executed.push(text)
        if (text.includes('count(*)')) return { rows: [{ n: rowsWithProvenance }] }
        return { rows: [] }
      },
    }
    return { db, executed }
  }

  it('se niega si alguna fila tiene sha256 o source_path y no borra nada', async () => {
    const { db, executed } = fakeDb(1)
    await expect(migDown({ db } as never)).rejects.toThrow(/MIG-IMG-02/)
    expect(executed.some((q) => /DROP/.test(q))).toBe(false)
  })

  it('sin datos de procedencia retira solo el índice y las dos columnas', async () => {
    const { db, executed } = fakeDb(0)
    await migDown({ db } as never)
    const all = executed.join('\n')
    expect(all).toContain('DROP INDEX IF EXISTS "media_sha256_idx"')
    expect(all).toContain('DROP COLUMN IF EXISTS "source_path"')
    expect(all).toContain('DROP COLUMN IF EXISTS "sha256"')
    expect(all).not.toMatch(/DROP TABLE/)
  })
})
