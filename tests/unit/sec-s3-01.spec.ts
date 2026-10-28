/**
 * SEC-MINIO-01 (renombrado sec-s3-01 en S3-SEAWEEDFS-01): credencial S3 fuera del código versionado, lint sin `next lint` y
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
  it('ningún script versionado asigna un literal largo a una clave secreta S3 / MinIO / SecretKey', () => {
    const literal = /(\w*(?:SECRET_ACCESS_KEY|SECRET_KEY)|MINIO_ROOT_PASSWORD|\$SecretKey)\s*=\s*["'][A-Za-z0-9+/_-]{16,}["']|"secretKey"\s*:\s*"[A-Za-z0-9+/_-]{16,}"/
    const hits = tracked.filter((f) => /\.(sh|ps1|md|ya?ml)$/.test(f) && existsSync(path.join(ROOT, f)) && literal.test(read(f)))
    expect(hits).toEqual([])
  })

  // S3-SEAWEEDFS-01: los scripts de MinIO se eliminaron; los equivalentes exigen las claves del entorno.
  it('los scripts de MinIO ya no existen y los nuevos exigen credenciales por entorno', () => {
    expect(existsSync(path.join(ROOT, 'scripts/minio'))).toBe(false)
    expect(existsSync(path.join(ROOT, 'scripts/setup/init-minio.sh'))).toBe(false)
    const setup = read('scripts/s3/setup-bucket.mjs')
    expect(setup).toMatch(/process\.env\.S3_ACCESS_KEY_ID/)
    expect(setup).toMatch(/process\.env\.S3_SECRET_ACCESS_KEY/)
    expect(setup).not.toMatch(/\$\{\s*(secretAccessKey|accessKeyId)\b|console\.\w+\(\s*(secretAccessKey|accessKeyId)\b/)
    const entry = read('infrastructure/docker/s3/entrypoint.sh')
    expect(entry).toMatch(/S3_ACCESS_KEY_ID:-/)
    expect(entry).toMatch(/S3_SECRET_ACCESS_KEY:-/)
  })
})

describe('SEC-MINIO-01 C: política pública acotada (ahora en el JSON de identidades de SeaweedFS)', () => {
  const stripShellComments = (t: string) => t.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')

  it('el entrypoint solo crea la identidad anónima con S3_PUBLIC_READ=1 y limitada a Read:<bucket>', () => {
    const text = stripShellComments(read('infrastructure/docker/s3/entrypoint.sh'))
    expect(text).toMatch(/S3_PUBLIC_READ:-0}" = "1"/)
    const anonLine = text.split('\n').find((l) => /"name":"anonymous"/.test(l)) ?? ''
    expect(anonLine).not.toBe('')
    expect(anonLine).toMatch(/"actions":\["Read:'"\$BUCKET"'"\]/)
    // La identidad anónima nunca recibe Write/List/Admin/Tagging.
    expect(anonLine).not.toMatch(/Write|List|Admin|Tagging/)
  })

  it('el script de bucket no escribe políticas públicas ni ACL', () => {
    const text = read('scripts/s3/setup-bucket.mjs').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
    expect(text).not.toMatch(/PutBucketPolicy|PutBucketAcl|public-read/)
  })
})
