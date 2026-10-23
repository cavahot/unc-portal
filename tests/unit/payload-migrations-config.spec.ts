import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ARCH-DB-02: contrato de migraciones Payload', () => {
  it('declara un directorio de migraciones versionable y estable', () => {
    const configPath = resolve(process.cwd(), 'apps/cms/src/payload.config.ts')
    const source = readFileSync(configPath, 'utf8')

    // ARCH-DB-02: evita que el adaptador dependa de autodetección distinta entre
    // desarrollo, build y producción; el test protege el contrato revisable.
    expect(source).toContain("migrationDir: path.resolve(dirname, 'migrations')")
  })

  // DEP-07 (C11): invariante real índice <-> directorio. Un archivo de migración no exportado por
  // index.ts (o sin snapshot .json) se aplicaría en dev pero no en producción, o al revés.
  it('index.ts, archivos .ts y snapshots .json de migraciones coinciden', () => {
    const dir = resolve(process.cwd(), 'apps/cms/src/migrations')
    const files = readdirSync(dir)
    const onDisk = files.filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, '')).sort()
    const index = readFileSync(resolve(dir, 'index.ts'), 'utf8')
    const inIndex = [...index.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]).sort()
    expect(onDisk.length).toBeGreaterThanOrEqual(1)
    expect(inIndex).toEqual(onDisk)
    for (const name of onDisk) expect(files).toContain(`${name}.json`)
  })
})
