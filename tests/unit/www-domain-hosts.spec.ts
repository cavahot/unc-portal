// Decisión del dueño (2026-10-28): el VPS tiene UN certificado (Sectigo) válido solo para www.unc.edu.py.
// El portal público vive en https://www.unc.edu.py, el panel del CMS en cms.unc.edu.py y el host
// files.unc.edu.py desaparece (archivos públicos por la RUTA /api/media/file/** y, con S3, /archivos/**).
// Amenaza que evita: canonicals, sitemap, correos y CORS apuntando a hosts sin certificado ni DNS, o una lista
// CORS/CSP que conserve hosts muertos. Límite: revisa texto fuente y ejemplos de entorno; no el DNS real.
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const OLD_HOSTS = /portal\.unc\.edu\.py|files\.unc\.edu\.py/

/** Archivos de texto de código/configuración que no deben nombrar los hosts retirados. */
function collect(rel: string, out: string[] = []): string[] {
  const abs = path.join(ROOT, rel)
  if (!existsSync(abs)) return out
  if (statSync(abs).isFile()) {
    out.push(rel)
    return out
  }
  for (const entry of readdirSync(abs)) {
    if (entry === 'node_modules' || entry === '.next') continue
    collect(path.posix.join(rel.replace(/\\/g, '/'), entry), out)
  }
  return out
}

const SCOPE = [
  'app',
  'components',
  'lib',
  'apps/cms/src',
  'proxy.ts',
  'next.config.mjs',
  'apps/cms/next.config.mjs',
  '.env.example',
  'apps/cms/.env.example',
]

describe('hosts retirados (portal.unc.edu.py / files.unc.edu.py)', () => {
  const files = SCOPE.flatMap((s) => collect(s)).filter((f) => /\.(tsx?|mjs|js|json|example)$/.test(f))

  it('el alcance del barrido no está vacío', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('ningún archivo de código o ejemplo de entorno los menciona (ni siquiera en comentarios)', () => {
    const offenders = files.filter((f) => OLD_HOSTS.test(readFileSync(path.join(ROOT, f), 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('origen público por defecto', () => {
  it('el origen de producción por defecto de next/image es www', async () => {
    const mod = await import('../../lib/images/nextImagesConfig.mjs')
    expect(mod.PROD_CMS_ORIGIN_DEFAULT).toBe('https://www.unc.edu.py')
  })

  it('los ejemplos de entorno documentan www como NEXT_PUBLIC_SITE_URL de producción', () => {
    const env = readFileSync(path.join(ROOT, '.env.example'), 'utf8')
    expect(env).toMatch(/https:\/\/www\.unc\.edu\.py/)
  })

  it('el ejemplo del CMS documenta S3_PUBLIC_URL bajo /archivos', () => {
    const env = readFileSync(path.join(ROOT, 'apps/cms/.env.example'), 'utf8')
    expect(env).toMatch(/https:\/\/www\.unc\.edu\.py\/archivos/)
  })
})
