// DEP-SEC-01: la migración que añade `users.reset_password_requested_at` (requerida por Payload >= 3.90).
// Spec: docs/specs/security/DEP-SEC-01-actualizacion-dependencias.md (§2, §5) | DEP-07 (reglas de migración).
// Amenaza: desplegar Payload 3.90+ sin la columna rompe toda lectura de `users` (login incluido) en producción;
// una migración con NOT NULL/DEFAULT o destructiva bloquearía o dañaría las cuentas existentes.
// Límite: análisis de texto y del snapshot; la ejecución real se probó aparte en una BD sintética (ver la spec).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { down as resetDown } from '../../apps/cms/src/migrations/20261026_220000_dep_sec_01_users_reset_password'

const DIR = resolve(process.cwd(), 'apps/cms/src/migrations')
const names = () =>
  readdirSync(DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()
const NAME = () => names().find((n) => /dep_sec_01_users_reset_password/.test(n))
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('DEP-SEC-01: migración de reset_password_requested_at', () => {
  it('existe, es la última de la cadena y está registrada en index.ts', () => {
    const name = NAME()
    expect(name, 'archivo *_dep_sec_01_users_reset_password.ts').toBeDefined()
    expect(names().at(-1)).toBe(name)
    const index = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
    expect(index).toContain(`name: '${name}'`)
    expect(readdirSync(DIR)).toContain(`${name}.json`)
    const registered = [...index.matchAll(/name: '([^']+)'/g)].map((m) => m[1])
    expect(registered.at(-1)).toBe(name)
  })

  it('up añade la columna timestamptz idempotente, NULLABLE y sin DEFAULT', () => {
    const src = readFileSync(resolve(DIR, `${NAME()}.ts`), 'utf8')
    expect(src).toContain('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;')
    const c = code(src)
    expect(c).not.toMatch(/\bNOT NULL\b/i)
    expect(c).not.toMatch(/\bDEFAULT\b/i)
    expect(c).not.toMatch(/\bDROP\b/i)
    expect(c).not.toMatch(/\b(DELETE\s+FROM|UPDATE\s+"|TRUNCATE)\b/i)
  })

  it('down no hace nada destructivo (convención DEP-03: solo hacia adelante)', async () => {
    const executed: unknown[] = []
    await resetDown({ db: { execute: async (q: unknown) => executed.push(q) } } as never)
    expect(executed).toEqual([])
  })

  it('tiene cabecera en español con tarea, amenaza y límite', () => {
    const head = readFileSync(resolve(DIR, `${NAME()}.ts`), 'utf8').split('\n').slice(0, 12).join('\n')
    expect(head).toMatch(/^\/\/ DEP-SEC-01/)
    expect(head).toMatch(/RDD/)
    expect(head).toMatch(/NULLABLE/)
  })

  it('el snapshot encadena con el anterior e incluye la columna en users', () => {
    const name = NAME()!
    const snap = JSON.parse(readFileSync(resolve(DIR, `${name}.json`), 'utf8'))
    const prevName = names().at(-2)!
    const prev = JSON.parse(readFileSync(resolve(DIR, `${prevName}.json`), 'utf8'))
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
    expect(snap.tables['public.users'].columns.reset_password_requested_at).toEqual({
      name: 'reset_password_requested_at',
      type: 'timestamp(3) with time zone',
      primaryKey: false,
      notNull: false,
    })
    expect(Object.keys(snap.tables['public.users'].columns).length).toBe(Object.keys(prev.tables['public.users'].columns).length + 1)
    expect(Object.keys(snap.tables)).toEqual(Object.keys(prev.tables))
  })

  it('la cadena de snapshots sigue lineal (cada prevId apunta al id del anterior, sin ids repetidos)', () => {
    const snaps = names().map((n) => JSON.parse(readFileSync(resolve(DIR, `${n}.json`), 'utf8')))
    for (let i = 1; i < snaps.length; i++) expect(snaps[i].prevId, names()[i]).toBe(snaps[i - 1].id)
    expect(new Set(snaps.map((s) => s.id)).size).toBe(snaps.length)
  })

  it('media no necesita _object_key: ninguna colección usa clientUploads', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(cfg).not.toMatch(/clientUploads/)
    expect(readFileSync(resolve(process.cwd(), 'apps/cms/src/payload-types.ts'), 'utf8')).not.toMatch(/_objectKey|objectKey/)
  })
})
