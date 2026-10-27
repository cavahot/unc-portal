// PRA-02: integración estática en la portada y paridad del catálogo i18n.
// Amenaza: sección fuera de orden (no desemboca en la franja verde), consulta serial que añade latencia,
// o claves ausentes en algún idioma (MISSING_MESSAGE en producción). Límite: análisis de texto de fuente.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const page = readFileSync(path.join(ROOT, 'app', '[locale]', 'page.tsx'), 'utf8')

describe('portada', () => {
  it('incluye la sección entre #transparencia y #institucional', () => {
    const t = page.indexOf('id="transparencia"')
    const s = page.indexOf('<AwardsAccreditationsSection')
    const i = page.indexOf('id="institucional"')
    expect(t).toBeGreaterThan(-1)
    expect(s).toBeGreaterThan(t)
    expect(i).toBeGreaterThan(s)
  })
  it('pide los datos dentro del Promise.all existente (sin latencia serial)', () => {
    const start = page.indexOf('await Promise.all([')
    const all = page.slice(start, page.indexOf(']);', start))
    expect(all).toContain('getRecognitions()')
    expect(all).toContain('getAccreditations()')
  })
})

type Json = { [k: string]: Json | string }
function keys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)))
}
const load = (loc: string) =>
  JSON.parse(readFileSync(path.join(ROOT, 'messages', loc, 'pages.home.json'), 'utf8')) as Json

describe('i18n awards.*', () => {
  const es = keys((load('es').awards ?? {}) as Json)
  it('existe el bloque awards en es', () => {
    expect(es.length).toBeGreaterThan(15)
  })
  it.each(['en', 'gn', 'pt-BR'])('%s tiene las mismas claves que es y ninguna vacía', (loc) => {
    const other = load(loc).awards as Json
    expect(keys(other).sort()).toEqual([...es].sort())
    for (const k of keys(other)) {
      const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], other)
      expect(String(v).trim().length).toBeGreaterThan(0)
    }
  })
})
