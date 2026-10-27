/**
 * DEP-16 (RDD-DEP-38..40): validación de secretos, comparación segura y token de preview firmado.
 * Amenaza: arrancar/operar con secretos vacíos o de ejemplo, filtrar longitud/valor del secreto por
 * temporización o por mensajes, y dejar un secreto de larga vida en la URL de preview.
 * Límite: lógica pura con valores sintéticos; no prueba Payload ni nginx. El token firmado se verifica
 * con el signer del CMS y el verificador del portal (dos copias del mismo algoritmo, ver spec).
 * Spec: docs/specs/deploy/DEP-16-secretos-y-rutas-auxiliares.md
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import * as cmsSecrets from '../../apps/cms/src/config/secrets'
import * as portalSecrets from '../../lib/security/secrets'
import { safeEqual } from '../../lib/security/safeEqual'
import { verifyPreviewToken } from '../../lib/security/previewToken'
import { signPreviewToken } from '../../apps/cms/src/utilities/previewToken'

const ROOT = path.resolve(__dirname, '..', '..')
const STRONG = 'k9Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3'
const OTHER = 'zB5nR8vK2xQm7TcL4wYp9HsJd3GfUe6A'

describe('requireSecret (CMS)', () => {
  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '                                  '],
    ['< 32 caracteres', 'a1B2c3D4e5F6g7H8i9J0'],
    ['placeholder changeme', 'changeme-use-a-random-string-here-00'],
    ['placeholder change-this', 'change-this-payload-secret-min-32-chars'],
    ['placeholder REEMPLAZAR_', 'REEMPLAZAR_SECRETO_PAYLOAD_LARGO'],
    ['un solo carácter repetido', 'a'.repeat(40)],
  ])('rechaza secreto %s sin imprimir su valor', (_label, value) => {
    let message = ''
    try {
      cmsSecrets.requireSecret('PAYLOAD_SECRET', value)
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('PAYLOAD_SECRET')
    if (value && value.trim()) expect(message).not.toContain(value)
  })

  it('acepta un secreto fuerte y lo devuelve tal cual', () => {
    expect(cmsSecrets.requireSecret('PAYLOAD_SECRET', STRONG)).toBe(STRONG)
  })
})

describe('resolvePayloadSecret (CMS)', () => {
  it('en runtime aborta si falta el secreto', () => {
    expect(() => cmsSecrets.resolvePayloadSecret({})).toThrow(/PAYLOAD_SECRET/)
    expect(() => cmsSecrets.resolvePayloadSecret({ NEXT_PHASE: 'phase-production-server' })).toThrow(/PAYLOAD_SECRET/)
  })
  it('durante next build (NEXT_PHASE=phase-production-build) no aborta aunque falte', () => {
    expect(() => cmsSecrets.resolvePayloadSecret({ NEXT_PHASE: 'phase-production-build' })).not.toThrow()
  })
  it('con secreto fuerte lo devuelve en runtime y en build', () => {
    expect(cmsSecrets.resolvePayloadSecret({ PAYLOAD_SECRET: STRONG })).toBe(STRONG)
    expect(cmsSecrets.resolvePayloadSecret({ PAYLOAD_SECRET: STRONG, NEXT_PHASE: 'phase-production-build' })).toBe(STRONG)
  })
})

describe('validador del portal (lib/security/secrets)', () => {
  it('coincide con el del CMS: mismos marcadores y mismo mínimo (sin deriva entre copias)', () => {
    expect(portalSecrets.WEAK_SECRET_MARKERS).toEqual(cmsSecrets.WEAK_SECRET_MARKERS)
    expect(portalSecrets.MIN_SECRET_LENGTH).toBe(cmsSecrets.MIN_SECRET_LENGTH)
  })
  it('isStrongSecret rechaza débiles y acepta fuertes', () => {
    for (const bad of [undefined, '', 'corto', 'changeme-' + 'x7Q'.repeat(12), 'REEMPLAZAR_SECRETO_REVALIDACION', 'a'.repeat(40)]) {
      expect(portalSecrets.isStrongSecret(bad)).toBe(false)
    }
    expect(portalSecrets.isStrongSecret(STRONG)).toBe(true)
  })
  it('readStrongSecret devuelve null si falta/es débil y NO registra el valor', () => {
    const logs: string[] = []
    const spy = (...a: unknown[]) => logs.push(a.map(String).join(' '))
    expect(portalSecrets.readStrongSecret('PREVIEW_SECRET', 'changeme-secreto-de-prueba-largo-123', spy)).toBeNull()
    expect(portalSecrets.readStrongSecret('PREVIEW_SECRET', undefined, spy)).toBeNull()
    expect(portalSecrets.readStrongSecret('PREVIEW_SECRET', STRONG, spy)).toBe(STRONG)
    expect(logs.join('\n')).toContain('PREVIEW_SECRET')
    expect(logs.join('\n')).not.toContain('secreto-de-prueba')
  })
})

describe('safeEqual', () => {
  it('es true solo para cadenas idénticas y no lanza con longitudes distintas', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(() => safeEqual('abc', 'abcdef')).not.toThrow()
    expect(safeEqual('abc', 'abcdef')).toBe(false)
    expect(safeEqual('', '')).toBe(true)
    expect(safeEqual('x', '')).toBe(false)
  })
})

describe('token de preview firmado (CMS firma, portal verifica)', () => {
  const now = 1_800_000_000_000

  it('ida y vuelta: devuelve slug y tipo', () => {
    const token = signPreviewToken({ slug: 'mi-noticia', type: 'noticia' }, STRONG, now)
    expect(verifyPreviewToken(token, STRONG, now + 1000)).toEqual({ slug: 'mi-noticia', type: 'noticia' })
  })
  it('es compacto y base64url (sin +, / ni =) y no contiene el secreto', () => {
    const token = signPreviewToken({ slug: 'a/b-c', type: 'page' }, STRONG, now)
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(token).not.toContain(STRONG)
  })
  it('expira: a los 5 min exactos ya no sirve', () => {
    const token = signPreviewToken({ slug: 'x', type: 'noticia' }, STRONG, now)
    expect(verifyPreviewToken(token, STRONG, now + 299_000)).not.toBeNull()
    expect(verifyPreviewToken(token, STRONG, now + 300_000)).toBeNull()
  })
  it('rechaza firma de otro secreto, carga alterada, formato roto y vacío', () => {
    const token = signPreviewToken({ slug: 'x', type: 'noticia' }, OTHER, now)
    expect(verifyPreviewToken(token, STRONG, now)).toBeNull()
    const good = signPreviewToken({ slug: 'x', type: 'noticia' }, STRONG, now)
    const [payload, sig] = good.split('.')
    const forged = Buffer.from(JSON.stringify({ s: 'otro', t: 'noticia', e: Math.floor(now / 1000) + 300 })).toString('base64url')
    expect(verifyPreviewToken(`${forged}.${sig}`, STRONG, now)).toBeNull()
    expect(verifyPreviewToken(`${payload}.${sig}x`, STRONG, now)).toBeNull()
    for (const junk of ['', 'abc', 'a.b.c', '.', STRONG]) expect(verifyPreviewToken(junk, STRONG, now)).toBeNull()
  })
  it('rechaza un token con vida mayor al máximo aunque la firma sea válida', () => {
    const token = signPreviewToken({ slug: 'x', type: 'noticia' }, STRONG, now, 24 * 3600)
    expect(verifyPreviewToken(token, STRONG, now)).toBeNull()
  })
  it('rechaza si el secreto del verificador es débil o ausente', () => {
    const token = signPreviewToken({ slug: 'x', type: 'noticia' }, STRONG, now)
    expect(verifyPreviewToken(token, '', now)).toBeNull()
  })
})

describe('payload.config.ts y rutas auxiliares (análisis estático)', () => {
  const config = readFileSync(path.join(ROOT, 'apps/cms/src/payload.config.ts'), 'utf8')

  it('PAYLOAD_SECRET ya no cae a cadena vacía y usa el validador', () => {
    expect(config).not.toMatch(/PAYLOAD_SECRET\s*\|\|\s*''/)
    expect(config).toMatch(/resolvePayloadSecret\s*\(/)
  })
  it('livePreview ya no pone el secreto crudo en la URL y firma solo para sesiones con rol', () => {
    const block = config.slice(config.indexOf('livePreview'), config.indexOf('components:'))
    expect(block).not.toMatch(/secret=/)
    expect(block).not.toMatch(/PREVIEW_SECRET\s*\|\|\s*''/)
    expect(block).toMatch(/signPreviewToken/)
    expect(block).toMatch(/req\??\.user|hasRole/)
  })
  it('my-route (plantilla sin auth) fue eliminada', () => {
    expect(existsSync(path.join(ROOT, 'apps/cms/src/app/my-route'))).toBe(false)
  })
})
