// DEP-03 F3: la migración que añade `createdBy` es solo hacia adelante, sin DROP, sin tocar datos.
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md (escenario 21) | DEP-07 (reglas de migración) | RDD-DEP-63.
// Amenaza: una migración destructiva o con NOT NULL que bloquee el despliegue con las 271 noticias existentes,
// o un índice/snapshot desalineados que hagan que `payload migrate:create` genere diferencias fantasma.
// Límite: análisis de texto y del snapshot; que el SQL se aplique en Postgres es hipótesis H6 (requiere BD sintética).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { down as depDown } from '../../apps/cms/src/migrations/20261022_134500_dep_03_created_by'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const BASELINE = '20261017_021341_arch_db_02_baseline'
const names = () =>
  readdirSync(DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()
const MIGRATION = () => names().find((n) => /dep_03_created_by/.test(n))

const TABLES = [
  { table: 'noticias', column: 'created_by_id', fk: 'noticias_created_by_id_users_id_fk', idx: 'noticias_created_by_idx' },
  { table: '_noticias_v', column: 'version_created_by_id', fk: '_noticias_v_version_created_by_id_users_id_fk', idx: '_noticias_v_version_version_created_by_idx' },
  { table: 'paginas', column: 'created_by_id', fk: 'paginas_created_by_id_users_id_fk', idx: 'paginas_created_by_idx' },
  { table: '_paginas_v', column: 'version_created_by_id', fk: '_paginas_v_version_created_by_id_users_id_fk', idx: '_paginas_v_version_version_created_by_idx' },
]

describe('DEP-03: migración de createdBy', () => {
  it('existe, se ordena después del baseline y está registrada en index.ts con su snapshot', () => {
    const name = MIGRATION()
    expect(name, 'archivo *_dep_03_created_by.ts').toBeDefined()
    expect(name! > BASELINE).toBe(true)
    const index = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
    expect(index).toContain(`name: '${name}'`)
    expect(readdirSync(DIR)).toContain(`${name}.json`)
  })

  it('añade columna nullable, FK ON DELETE set null e índice en las cuatro tablas', () => {
    const src = readFileSync(resolve(DIR, `${MIGRATION()}.ts`), 'utf8')
    for (const t of TABLES) {
      expect(src, `${t.table}.${t.column}`).toMatch(new RegExp(`ALTER TABLE "${t.table}" ADD COLUMN (IF NOT EXISTS )?"${t.column}" integer;`))
      expect(src).toContain(`ALTER TABLE "${t.table}" ADD CONSTRAINT "${t.fk}" FOREIGN KEY ("${t.column}") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`)
      expect(src).toMatch(new RegExp(`CREATE INDEX (IF NOT EXISTS )?"${t.idx}" ON "${t.table}" USING btree \\("${t.column}"\\)`))
    }
  })

  it('solo hacia adelante: sin DROP, sin NOT NULL, sin DELETE/UPDATE/TRUNCATE de datos', () => {
    const src = readFileSync(resolve(DIR, `${MIGRATION()}.ts`), 'utf8')
    // Se ignoran los comentarios (que pueden mencionar lo que NO se hace).
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bDROP\b/i)
    expect(code).not.toMatch(/\bNOT NULL\b/i)
    expect(code).not.toMatch(/\b(DELETE\s+FROM|UPDATE\s+"|TRUNCATE)\b/i)
  })

  it('el down no hace nada destructivo (el down del baseline protegido borra las tablas)', async () => {
    const executed: unknown[] = []
    await depDown({ db: { execute: async (q: unknown) => executed.push(q) } } as never)
    expect(executed).toEqual([])
  })

  it('el snapshot incluye las columnas, FK e índices con el mismo patrón que faculty', () => {
    const snap = JSON.parse(readFileSync(resolve(DIR, `${MIGRATION()}.json`), 'utf8'))
    const prev = JSON.parse(readFileSync(resolve(DIR, `${BASELINE}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    for (const t of TABLES) {
      const table = snap.tables[`public.${t.table}`]
      expect(table.columns[t.column], `${t.table}.${t.column}`).toMatchObject({ name: t.column, type: 'integer', primaryKey: false, notNull: false })
      expect(table.foreignKeys[t.fk]).toMatchObject({ tableTo: 'users', columnsFrom: [t.column], columnsTo: ['id'], onDelete: 'set null', onUpdate: 'no action' })
      expect(table.indexes[t.idx].columns[0]).toMatchObject({ expression: t.column })
      // Las demás tablas no cambian: el snapshot nuevo = baseline + estas columnas.
      const before = prev.tables[`public.${t.table}`]
      expect(Object.keys(table.columns).length).toBe(Object.keys(before.columns).length + 1)
    }
    expect(Object.keys(snap.tables)).toEqual(Object.keys(prev.tables))
  })

  it('el baseline conserva su down protegido (la migración nueva no lo debilita)', () => {
    const baseline = readFileSync(resolve(DIR, `${BASELINE}.ts`), 'utf8')
    expect(baseline).toContain('DEP07_DATA_TABLES')
    expect(baseline).toMatch(/throw new Error/)
  })
})
