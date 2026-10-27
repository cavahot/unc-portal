import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DEP-SEC-01: guardia de versiones mínimas de dependencias de producción.
 *
 * Amenaza: volver (por un merge, un `npm install` con rango laxo o un rollback parcial) a versiones
 * con advisories conocidos de payload/@payloadcms/*, next, @sentry/nextjs, sharp, nodemailer y zod
 * (ver docs/specs/security/DEP-SEC-01-actualizacion-dependencias.md, evidencia RDD).
 * Además, Payload exige que todos los paquetes @payloadcms/* compartan exactamente la misma versión:
 * una mezcla rompe el panel en tiempo de ejecución sin que typecheck lo detecte.
 *
 * Límite: compara versiones declaradas en package.json y resueltas en package-lock.json; no prueba
 * que los advisories no apliquen ni sustituye `npm audit --omit=dev`, que sigue siendo la evidencia.
 */

const ROOT = path.resolve(__dirname, '../..')

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
type Lock = { packages: Record<string, { version?: string }> }

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8')) as T

const rootPkg = readJson<Manifest>('package.json')
const cmsPkg = readJson<Manifest>('apps/cms/package.json')
const lock = readJson<Lock>('package-lock.json')

/** Mínimos que cierran los advisories registrados en la línea base de DEP-SEC-01. */
const MINIMUMS: Record<string, string> = {
  payload: '3.91.0',
  '@payloadcms/storage-s3': '3.91.0',
  next: '16.4.3',
  '@sentry/nextjs': '10.75.2',
  sharp: '0.35.5',
  nodemailer: '10.1.4',
  zod: '4.6.7',
}

/** Compara x.y.z numéricamente; las etiquetas pre-release se tratan como menores que la versión final. */
function compareSemver(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre] = v.split('-')
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10)), pre }
  }
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0)
    if (d !== 0) return d
  }
  if (pa.pre && !pb.pre) return -1
  if (!pa.pre && pb.pre) return 1
  return 0
}

/** Versión mínima que admite un rango declarado simple (`3.91.0`, `^3.91.0`, `~3.91.0`, `>=3.91.0`). */
function rangeFloor(range: string): string {
  const m = range.trim().match(/^(?:\^|~|>=)?\s*(\d+\.\d+\.\d+(?:-[\w.]+)?)$/)
  if (!m) throw new Error(`rango no soportado por la guardia: "${range}"`)
  return m[1]
}

function declared(name: string): Array<{ where: string; range: string }> {
  const out: Array<{ where: string; range: string }> = []
  for (const [where, pkg] of [
    ['package.json', rootPkg],
    ['apps/cms/package.json', cmsPkg],
  ] as const) {
    const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]
    if (range) out.push({ where, range })
  }
  return out
}

/** Todas las copias instaladas de un paquete según el lockfile (incluidas las anidadas). */
function lockedCopies(name: string): Array<{ key: string; version: string }> {
  return Object.entries(lock.packages)
    .filter(([key, meta]) => key.endsWith(`node_modules/${name}`) && meta.version)
    .map(([key, meta]) => ({ key, version: meta.version as string }))
}

describe('DEP-SEC-01: versiones mínimas de dependencias de producción', () => {
  for (const [name, min] of Object.entries(MINIMUMS)) {
    it(`${name} declarado >= ${min} donde se declare`, () => {
      for (const { where, range } of declared(name)) {
        expect(compareSemver(rangeFloor(range), min), `${where}: ${name}@${range}`).toBeGreaterThanOrEqual(0)
      }
    })

    it(`${name}: toda copia en package-lock.json >= ${min}`, () => {
      const copies = lockedCopies(name)
      expect(copies.length, `${name} no aparece en package-lock.json`).toBeGreaterThan(0)
      const below = copies.filter((c) => compareSemver(c.version, min) < 0)
      expect(below, `copias vulnerables de ${name}`).toEqual([])
    })
  }

  it('todos los @payloadcms/* y payload declarados en el CMS comparten la misma versión exacta', () => {
    const deps = { ...cmsPkg.dependencies }
    const family = Object.entries(deps).filter(([n]) => n === 'payload' || n.startsWith('@payloadcms/'))
    expect(family.length).toBeGreaterThan(1)
    const versions = new Set(family.map(([, r]) => r))
    expect([...versions], 'rangos de la familia Payload').toHaveLength(1)
    expect(compareSemver(rangeFloor([...versions][0]), MINIMUMS.payload)).toBeGreaterThanOrEqual(0)
  })

  it('todas las copias de payload/@payloadcms/* en el lockfile tienen la misma versión', () => {
    const versions = new Set(
      Object.entries(lock.packages)
        .filter(([key]) => /node_modules\/(payload|@payloadcms\/[^/]+)$/.test(key))
        .map(([, meta]) => meta.version),
    )
    expect([...versions]).toHaveLength(1)
  })
})
