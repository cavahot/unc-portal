// MIG-IMG fase 1: selector explícito y con falla cerrada del almacenamiento de `media`.
// Amenaza: activar S3/MinIO solo porque existen dos variables (decisión implícita y frágil: con el
// MinIO caído toda subida daba ECONNREFUSED), o guardar archivos en la capa efímera del contenedor.
// Límite: son pruebas de la función pura; no prueban permisos reales del volumen ni el plugin S3.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_MEDIA_MAX_BYTES,
  MEDIA_MAX_BYTES_CEILING,
  buildUploadOptions,
  resolveMaxBytes,
  resolveMediaStorage,
} from '../../apps/cms/src/config/mediaStorage'

const ROOT = path.resolve(__dirname, '..', '..')
const S3 = {
  S3_ACCESS_KEY_ID: 'clave-sintetica',
  S3_SECRET_ACCESS_KEY: 'secreto-sintetico-no-real',
  S3_BUCKET: 'unc-media',
  S3_ENDPOINT: 'http://127.0.0.1:9100',
}

describe('resolveMediaStorage: selector MEDIA_STORAGE', () => {
  it('sin MEDIA_STORAGE usa disco local aunque existan claves S3 (ya no es implícito)', () => {
    const r = resolveMediaStorage({ ...S3, NODE_ENV: 'development' })
    expect(r.mode).toBe('local')
  })

  it('valor inválido lanza y no filtra el valor recibido', () => {
    expect(() => resolveMediaStorage({ MEDIA_STORAGE: 'ftp-secreto-xyz' })).toThrow(/MEDIA_STORAGE/)
    try {
      resolveMediaStorage({ MEDIA_STORAGE: 'ftp-secreto-xyz' })
    } catch (e) {
      expect(String((e as Error).message)).not.toContain('ftp-secreto-xyz')
    }
  })

  it.each([
    ['sin clave de acceso', { ...S3, S3_ACCESS_KEY_ID: '' }],
    ['sin clave secreta', { ...S3, S3_SECRET_ACCESS_KEY: '   ' }],
    ['sin bucket', { ...S3, S3_BUCKET: '' }],
    ['sin endpoint', { ...S3, S3_ENDPOINT: '' }],
  ])("'s3' sin credenciales completas (%s) lanza y no imprime secretos", (_n, env) => {
    const full = { MEDIA_STORAGE: 's3', ...env }
    expect(() => resolveMediaStorage(full)).toThrow(/S3_/)
    try {
      resolveMediaStorage(full)
    } catch (e) {
      const msg = String((e as Error).message)
      expect(msg).not.toContain('secreto-sintetico-no-real')
      expect(msg).not.toContain('clave-sintetica')
    }
  })

  it("'s3' con todo presente devuelve modo s3 y sin staticDir", () => {
    const r = resolveMediaStorage({ MEDIA_STORAGE: 's3', ...S3 })
    expect(r).toMatchObject({ mode: 's3' })
    expect((r as { staticDir?: string }).staticDir).toBeUndefined()
  })

  it('local en desarrollo: por defecto `media` relativo', () => {
    const r = resolveMediaStorage({ NODE_ENV: 'development' })
    expect(r).toEqual({ mode: 'local', staticDir: 'media' })
  })

  it('local en producción exige MEDIA_DIR absoluto', () => {
    expect(() => resolveMediaStorage({ NODE_ENV: 'production' })).toThrow(/MEDIA_DIR/)
    expect(() => resolveMediaStorage({ NODE_ENV: 'production', MEDIA_DIR: 'media' })).toThrow(/absoluta|absoluto/)
    const ok = resolveMediaStorage({ NODE_ENV: 'production', MEDIA_DIR: '/app/media' })
    expect(ok).toEqual({ mode: 'local', staticDir: path.resolve('/app/media') })
  })

  it('durante `next build` no exige MEDIA_DIR (el build corre sin variables)', () => {
    const r = resolveMediaStorage({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })
    expect(r.mode).toBe('local')
  })

  it.each([
    ['vacío con espacios', '   '],
    ['con ..', '/app/../etc/media'],
    ['con NUL', '/app/media\u0000x'],
    ['raíz', '/'],
  ])('MEDIA_DIR inválido (%s) lanza', (_n, dir) => {
    expect(() => resolveMediaStorage({ NODE_ENV: 'production', MEDIA_DIR: dir })).toThrow(/MEDIA_DIR/)
  })

  it('en desarrollo MEDIA_DIR relativo se acepta pero con .. se rechaza', () => {
    expect(resolveMediaStorage({ NODE_ENV: 'development', MEDIA_DIR: 'uploads' })).toEqual({
      mode: 'local',
      staticDir: 'uploads',
    })
    expect(() => resolveMediaStorage({ NODE_ENV: 'development', MEDIA_DIR: '../fuera' })).toThrow(/MEDIA_DIR/)
  })
})

describe('resolveMaxBytes / buildUploadOptions', () => {
  it('por defecto 10 MiB', () => {
    expect(DEFAULT_MEDIA_MAX_BYTES).toBe(10 * 1024 * 1024)
    expect(resolveMaxBytes({})).toBe(DEFAULT_MEDIA_MAX_BYTES)
  })

  it('acepta un entero positivo y rechaza basura o cero', () => {
    expect(resolveMaxBytes({ MEDIA_MAX_BYTES: '2048' })).toBe(2048)
    for (const bad of ['0', '-5', 'abc', '1.5', '99999999999999', String(MEDIA_MAX_BYTES_CEILING + 1)]) {
      expect(() => resolveMaxBytes({ MEDIA_MAX_BYTES: bad })).toThrow(/MEDIA_MAX_BYTES/)
    }
  })

  it('buildUploadOptions fija el tope por archivo y abortOnLimit=true (sin truncado silencioso)', () => {
    const o = buildUploadOptions({ MEDIA_MAX_BYTES: '4096' })
    expect(o.limits?.fileSize).toBe(4096)
    expect(o.abortOnLimit).toBe(true)
    expect(typeof o.responseOnLimit).toBe('string')
  })
})

describe('cableado en payload.config.ts y Media.ts', () => {
  const cfg = readFileSync(path.join(ROOT, 'apps/cms/src/payload.config.ts'), 'utf8')
  const media = readFileSync(path.join(ROOT, 'apps/cms/src/collections/Media.ts'), 'utf8')

  it('payload.config usa el selector y ya no activa S3 por mera presencia de claves', () => {
    expect(cfg).toContain('resolveMediaStorage')
    expect(cfg).toContain('buildUploadOptions')
    expect(cfg).not.toMatch(/process\.env\.S3_ACCESS_KEY_ID\s*&&\s*process\.env\.S3_SECRET_ACCESS_KEY/)
  })

  // Hallazgo en vivo (2026-10-23): el proxy de Next recorta el cuerpo a 10 MB por defecto
  // («Request body exceeded 10MB ... Only the first 10MB will be available»), busboy ve un multipart
  // incompleto y la respuesta es un 500 «Unexpected end of form» en lugar de un 413 limpio. El tope de Next
  // debe estar POR ENCIMA del máximo de archivo permitido (más sobrecarga multipart).
  it('next.config del CMS sube el tope del proxy por encima del máximo de archivo', () => {
    const next = readFileSync(path.join(ROOT, 'apps/cms/next.config.mjs'), 'utf8')
    const m = next.match(/proxyClientMaxBodySize:\s*'(\d+)mb'/)
    expect(m).not.toBeNull()
    const nextBytes = Number(m![1]) * 1024 * 1024
    expect(nextBytes).toBeGreaterThan(MEDIA_MAX_BYTES_CEILING)
    expect(MEDIA_MAX_BYTES_CEILING).toBeGreaterThanOrEqual(DEFAULT_MEDIA_MAX_BYTES)
  })

  // MIG-IMG fase 2a: la guardia de bytes ahora se invoca desde la tubería de subida (hooks/media/uploadPipeline.ts),
  // que Media.ts registra en beforeOperation.
  it('Media: sin SVG, con staticDir del selector y hook de bytes', () => {
    const pipeline = readFileSync(path.join(ROOT, 'apps/cms/src/hooks/media/uploadPipeline.ts'), 'utf8')
    expect(media).not.toContain('image/svg+xml')
    expect(media).toContain('staticDir')
    expect(media).toMatch(/beforeOperation:\s*\[prepareMediaUpload\]/)
    expect(pipeline).toContain('validateUploadFile')
  })
})
