// DEP-SEC-01 / DEP-16: los archivos .env.example deben documentar el requisito del PAYLOAD_SECRET
// (mínimo 32 caracteres, cómo generarlo) y su valor de ejemplo debe ser rechazado por el validador.
// Amenaza que evita: que alguien copie el ejemplo tal cual (o invente un secreto corto) y el CMS arranque
// con un secreto adivinable, o que el error de longitud llegue sin que la documentación lo anticipe.
// Límite: revisa solo los ejemplos versionados; NO lee el .env real de nadie ni imprime valores.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { MIN_SECRET_LENGTH, isStrongSecret } from '../../apps/cms/src/config/secrets'

const ROOT = path.resolve(__dirname, '..', '..')
const EXAMPLES = ['.env.example', 'apps/cms/.env.example', 'infrastructure/docker/.env.prod.example']

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8')
}

/** Líneas de comentario contiguas inmediatamente anteriores a PAYLOAD_SECRET (su documentación). */
function secretDoc(text: string): string {
  const lines = text.split(/\r?\n/)
  const i = lines.findIndex((l) => /^PAYLOAD_SECRET=/.test(l))
  expect(i, 'PAYLOAD_SECRET debe existir en el ejemplo').toBeGreaterThanOrEqual(0)
  const doc: string[] = []
  for (let j = i - 1; j >= 0 && lines[j].trim().startsWith('#'); j--) doc.unshift(lines[j])
  return doc.join('\n')
}

describe('PAYLOAD_SECRET en los .env.example', () => {
  it.each(EXAMPLES)('%s documenta longitud mínima y cómo generarlo', (rel) => {
    const doc = secretDoc(read(rel))
    expect(doc).toContain(String(MIN_SECRET_LENGTH))
    expect(doc).toContain('openssl rand -hex 32')
  })

  it.each(EXAMPLES)('%s: el valor de ejemplo es rechazado por el validador', (rel) => {
    const line = read(rel).split(/\r?\n/).find((l) => /^PAYLOAD_SECRET=/.test(l)) ?? ''
    // Sin el valor en el mensaje: solo se informa el archivo.
    expect(isStrongSecret(line.slice('PAYLOAD_SECRET='.length)), `${rel}: el ejemplo no debe ser un secreto válido`).toBe(false)
  })
})
