// DEP-07 (C6): comportamiento real del `down` del baseline con una BD simulada (sin Postgres).
// Amenaza: borrar 64 tablas con datos por un migrate:down/reset accidental.
// Límite: simula db.execute; no prueba el SQL contra Postgres (eso exige BD sintética autorizada).
import { describe, expect, it } from 'vitest'
import { down, DEP07_DATA_TABLES } from '../../apps/cms/src/migrations/20261017_021341_arch_db_02_baseline'

/** Reconstruye el texto SQL de un objeto `sql` de drizzle (solo cadenas estáticas). */
function textOf(q: unknown): string {
  const chunks = (q as { queryChunks?: Array<{ value?: string[] }> }).queryChunks ?? []
  return chunks.map((c) => (Array.isArray(c.value) ? c.value.join('') : '')).join('')
}

/** db simulada: `rowsByTable` define cuántas filas tiene cada tabla; registra todo el SQL. */
function fakeDb(rowsByTable: Record<string, number>, missing: string[] = []) {
  const log: string[] = []
  return {
    log,
    db: {
      async execute(q: unknown) {
        const t = textOf(q)
        log.push(t)
        const name = (t.match(/"public"\."([^"]+)"/) ?? t.match(/public\."([^"]+)"/) ?? [])[1]
        if (t.includes('to_regclass')) return { rows: [{ ok: !missing.includes(name) }] }
        if (t.includes('count(*)')) return { rows: [{ n: rowsByTable[name] ?? 0 }] }
        return { rows: [] }
      },
    },
  }
}

describe('DEP-07: down del baseline solo sobre BD vacía', () => {
  it('lanza error y no ejecuta ningún DROP si una tabla de datos tiene filas', async () => {
    const f = fakeDb({ noticias: 3 })
    await expect(down({ db: f.db } as never)).rejects.toThrow(/noticias/)
    expect(f.log.some((l) => /DROP\s+TABLE/i.test(l))).toBe(false)
  })

  it('procede con los DROP si todas las tablas de datos están vacías', async () => {
    const f = fakeDb({})
    await down({ db: f.db } as never)
    expect(f.log.filter((l) => /DROP\s+TABLE/i.test(l)).length).toBe(1) // un solo execute con los 64 DROP
    expect(f.log.join('\n')).toContain('DROP TABLE "users_sessions" CASCADE')
  })

  it('ignora tablas inexistentes (BD parcial) sin fallar', async () => {
    const f = fakeDb({}, [...DEP07_DATA_TABLES])
    await expect(down({ db: f.db } as never)).resolves.toBeUndefined()
  })

  it('la lista de tablas protegidas son tablas que el propio baseline crea', async () => {
    const src = (await import('node:fs')).readFileSync(
      new URL('../../apps/cms/src/migrations/20261017_021341_arch_db_02_baseline.ts', import.meta.url),
      'utf8',
    )
    for (const t of DEP07_DATA_TABLES) expect(src).toContain(`CREATE TABLE "${t}"`)
  })
})
