/**
 * SEC-MINIO-01: credencial de MinIO fuera del código versionado, lint sin `next lint` y
 * política pública del bucket acotada.
 *
 * Amenazas: (1) una clave S3 literal en git es legible por cualquiera con acceso al repo; (2) un
 * helper de desarrollo que publica TODO el bucket normaliza una política demasiado amplia;
 * (3) `next lint` no existe en Next 16 y dejaba el gate de lint roto.
 * Límite: la prueba solo ve archivos versionados; la clave sigue en el historial de git y debe
 * rotarse (ver docs/specs/security/SEC-MINIO-01.md). Nunca imprime el valor filtrado: ante un
 * hallazgo solo informa la ruta.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

/**
 * Valor filtrado: se toma del commit público que lo introdujo (c331a50, SEC-MINIO-01); nunca se imprime.
 * Por qué no HEAD: una vez corregido el helper, HEAD contiene la plantilla `${MINIO_SECRET_KEY:?...}` y esa
 * cadena se tomaría por «secreto» y coincidiría consigo misma (falso positivo). Límite: en un clon superficial
 * sin ese commit no hay valor que buscar y la comprobación del .env local sigue activa.
 */
function leakedSecrets(): string[] {
  const values = new Set<string>()
  const old = spawnSync('git', ['show', 'c331a50:scripts/minio/setup-bucket.sh'], { cwd: ROOT, encoding: 'utf8', shell: false })
  const m = old.status === 0 ? /MINIO_SECRET_KEY="([^"$][^"]{15,})"/.exec(old.stdout) : null
  if (m) values.add(m[1])
  const envPath = path.join(ROOT, 'apps/cms/.env')
  if (existsSync(envPath)) {
    const e = /^S3_SECRET_ACCESS_KEY=(.{16,})$/m.exec(readFileSync(envPath, 'utf8'))
    if (e) values.add(e[1].trim().replace(/^["']|["']$/g, ''))
  }
  return [...values]
}

describe('SEC-MINIO-01 A: lint', () => {
  it('el script lint no usa `next lint` (eliminado en Next 16)', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.scripts.lint).toBeTruthy()
    expect(pkg.scripts.lint).not.toMatch(/next\s+lint/)
    expect(pkg.scripts.lint).toMatch(/\beslint\b/)
  })
})

describe('SEC-MINIO-01 B: sin secretos de MinIO en archivos versionados', () => {
  const tracked = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', shell: false })
    .stdout.split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('node_modules/') && /\.(sh|ps1|md|ya?ml|json|ts|tsx|mjs|js|env|example|conf)$/.test(f))

  // SEC-REVIEW: antes, sin valor conocido el test hacía `return` y pasaba en vacío (falso verde). Ahora se OMITE con
  // motivo explícito y solo cuando no hay ninguna fuente (ni el commit c331a50 en el clon ni apps/cms/.env). La
  // garantía determinista sin fuentes la da el test siguiente (sin literales largos asignados a la clave).
  const secretsAvailable = leakedSecrets().length > 0
  it.skipIf(!secretsAvailable)('ningún archivo versionado contiene el valor filtrado (OMITIDO si no hay commit c331a50 ni apps/cms/.env: sin valor conocido no hay qué buscar)', () => {
    const secrets = leakedSecrets()
    expect(secrets.length).toBeGreaterThan(0)
    const hits = tracked.filter((f) => {
      const full = path.join(ROOT, f)
      if (!existsSync(full)) return false
      const text = readFileSync(full, 'utf8')
      return secrets.some((s) => text.includes(s))
    })
    expect(hits).toEqual([])
    // Lee todos los archivos versionados: con la máquina cargada supera los 5 s por defecto de vitest (falso rojo
    // observado en harness --quick). El límite amplio no debilita el control: solo evita el corte por tiempo.
  }, 60_000)

  it('ningún script versionado asigna un literal largo a MINIO_SECRET_KEY / SecretKey', () => {
    const literal = /(MINIO_SECRET_KEY|S3_SECRET_ACCESS_KEY|\$SecretKey|AWS_SECRET_ACCESS_KEY)\s*=\s*["'][A-Za-z0-9+/_-]{16,}["']/
    const hits = tracked.filter((f) => /\.(sh|ps1|md|ya?ml)$/.test(f) && existsSync(path.join(ROOT, f)) && literal.test(read(f)))
    expect(hits).toEqual([])
  })

  it('los helpers exigen credenciales por entorno y fallan con mensaje claro', () => {
    expect(read('scripts/minio/setup-bucket.sh')).toMatch(/MINIO_SECRET_KEY:\?/)
    expect(read('scripts/minio/setup-bucket.sh')).toMatch(/MINIO_ACCESS_KEY:\?/)
    expect(read('scripts/minio/check-minio.ps1')).toMatch(/env:MINIO_SECRET_KEY/)
    expect(read('scripts/minio/check-minio.ps1')).not.toMatch(/Login:/)
  })
})

describe('SEC-MINIO-01 C: política pública acotada', () => {
  const stripShellComments = (t: string) => t.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')

  it('el helper de desarrollo no publica el bucket salvo MINIO_PUBLIC_READ=1', () => {
    const text = stripShellComments(read('scripts/minio/setup-bucket.sh'))
    const lines = text.split('\n')
    const idx = lines.findIndex((l) => /mc\s+(policy\s+set\s+public|anonymous\s+set\s+(download|public))/.test(l))
    expect(idx).toBeGreaterThan(-1)
    const before = lines.slice(Math.max(0, idx - 6), idx).join('\n')
    expect(before).toMatch(/MINIO_PUBLIC_READ/)
    expect(text).toMatch(/ADVERTENCIA|WARNING/i)
  })

  it('la inicialización de producción acota la lectura anónima a un prefijo explícito', () => {
    const text = stripShellComments(read('scripts/setup/init-minio.sh'))
    const policyLine = text.split('\n').find((l) => /mc\s+anonymous\s+set\s+download/.test(l)) ?? ''
    expect(policyLine).not.toBe('')
    // No debe terminar en el bucket pelado: exige el opt-in y un prefijo.
    expect(text).toMatch(/MINIO_PUBLIC_MEDIA_PREFIX/)
    expect(policyLine).toMatch(/\$S3_BUCKET\/\$\{?MINIO_PUBLIC_MEDIA_PREFIX/)
    expect(text).toMatch(/MINIO_PUBLIC_READ/)
  })
})
