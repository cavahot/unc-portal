// S3-AGN: el almacenamiento S3 opcional ya no es MinIO (imágenes comunitarias retiradas; ahora SeaweedFS).
// Amenaza/riesgo: (1) una sonda de salud que apunta a una ruta propia de MinIO da «caído» permanente contra
// SeaweedFS (o, peor, se cambia a `GET /`, que devuelve 403); (2) puertos/nombres de la consola vieja
// (9101) en CSP/imágenes ensanchan el origen permitido sin servicio que lo justifique.
// Límite: análisis estático del texto fuente; no prueba el comportamiento contra un SeaweedFS vivo.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git'])
// Archivos generados (tipos de Payload): no se editan a mano.
const GENERATED = new Set(['payload-types.ts'])
const EXT = /\.(ts|tsx|mjs|js|jsx|json|example)$/

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (EXT.test(name) && !GENERATED.has(name)) out.push(full)
  }
  return out
}

// «dominio» contiene «minio»: se exige que no vaya precedido de una letra.
const MINIO = /(?<![a-záéíóúñ])minio/i

describe('ningún resto de MinIO en código ni ejemplos de entorno', () => {
  const files = [
    ...walk(path.join(ROOT, 'apps', 'cms', 'src')),
    ...walk(path.join(ROOT, 'lib')),
    ...walk(path.join(ROOT, 'app')),
    ...walk(path.join(ROOT, 'components')),
    path.join(ROOT, 'next.config.mjs'),
    path.join(ROOT, 'apps', 'cms', 'next.config.mjs'),
    path.join(ROOT, '.env.example'),
    path.join(ROOT, 'apps', 'cms', '.env.example'),
  ].filter(existsSync)

  it('revisa un conjunto no vacío de archivos', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('no menciona minio (sin lista de excepciones: los incidentes históricos viven en docs/)', () => {
    const offenders = files
      .filter((f) => MINIO.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f))
    expect(offenders).toEqual([])
  })

  it('CSP, configuración de imágenes y ejemplos no usan el puerto 9101 de la consola retirada', () => {
    const targets = [
      'lib/csp.ts',
      'lib/images/nextImagesConfig.mjs',
      'next.config.mjs',
      '.env.example',
      'apps/cms/.env.example',
    ]
    for (const t of targets) {
      expect(readFileSync(path.join(ROOT, t), 'utf8'), t).not.toMatch(/9101/)
    }
  })
})

describe('sonda de salud del almacén S3', () => {
  const src = readFileSync(path.join(ROOT, 'apps/cms/src/app/api/health/route.ts'), 'utf8')

  it('consulta /healthz del endpoint y nunca la raíz ni rutas de MinIO', () => {
    expect(src).toMatch(/\$\{[^}]+\}\/healthz/)
    expect(src).not.toMatch(/health\/live/)
  })

  it('el servicio se llama s3 en la respuesta', () => {
    expect(src).toMatch(/\bs3:\s*\{/)
    expect(src).not.toMatch(/services\.minio/)
  })
})
