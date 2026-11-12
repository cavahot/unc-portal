// TITULO-01: el título de la pestaña lleva la marca de la universidad una sola vez.
// Qué comprueba: (S1) la plantilla raíz (app/layout.tsx) agrega « — UNC» a todos los títulos; (S2) ningún título de página
//   en los textos traducidos (messages/<idioma>/*.json: claves meta.title, meta.*.title y pageTitle*) trae ya su propio
//   sufijo (« | UNC», « — Universidad Nacional de Concepción», etc.); (S3) tampoco los títulos armados en el código.
// Por qué existe: la suma de ambos producía «Autoridades | Universidad Nacional de Concepción — UNC» o «Noticia — UNC — UNC».
// Límite: revisa el texto fuente; un título nuevo con sufijo propio en otra clave no queda cubierto.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')
const SUFFIX = /\s(\||—|–|-)\s(UNC|Universidad Nacional de Concepción)\s*$/
const TITLE_KEY = /(^|\.)(meta(\.[\w-]+)*\.title|pageTitle\w*)$/

function titleEntries(): string[] {
  const out: string[] = []
  for (const locale of readdirSync(path.join(ROOT, 'messages'))) {
    const dir = path.join(ROOT, 'messages', locale)
    if (!statSync(dir).isDirectory()) continue
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const walk = (node: unknown, prefix: string) => {
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
          const keyPath = prefix ? `${prefix}.${key}` : key
          if (typeof value === 'string' && TITLE_KEY.test(keyPath) && SUFFIX.test(value)) out.push(`${locale}/${file}: ${keyPath} = ${value}`)
          else if (value && typeof value === 'object') walk(value, keyPath)
        }
      }
      walk(JSON.parse(readFileSync(path.join(dir, file), 'utf8')), '')
    }
  }
  return out
}

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'prototipos' ? [] : sourceFiles(rel)
    return /\.tsx?$/.test(e.name) ? [rel] : []
  })
}

describe('Título de la pestaña', () => {
  it('S1: la plantilla raíz agrega la marca', () => {
    expect(read('app/layout.tsx')).toMatch(/template: '%s — UNC'/)
  })

  it('S2: los títulos traducidos no traen su propio sufijo', () => {
    expect(titleEntries()).toEqual([])
  })

  it('S3: los títulos armados en el código no agregan la marca otra vez', () => {
    const offenders = [...sourceFiles('app'), ...sourceFiles('components')].filter((f) =>
      /title: `[^`]*(\| UNC|— UNC)`/.test(read(f)),
    )
    expect(offenders).toEqual([])
  })
})
