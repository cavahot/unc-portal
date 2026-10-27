/**
 * DEP-05: JSON-LD seguro contra XSS almacenado.
 * Amenaza: un título/descripcion del CMS con `</script>` cierra el bloque
 * <script type="application/ld+json"> e inyecta HTML/JS. Límite: se prueba el
 * texto serializado y el código fuente; no se ejecuta un navegador.
 * Evidencia: RDD-DEP-04 / RDD-DEP-13. Spec: docs/specs/deploy/DEP-05-jsonld-seguro.md
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import * as jsonld from '@/lib/seo/jsonld'

const ROOT = process.cwd()
const HOSTILE = '</script><script>alert(1)</script>'
const safe = (v: unknown): string => (jsonld as any).safeJsonLd(v)

/** Simula el HTML que produce React para el bloque y extrae el cuerpo. */
const asHtml = (body: string) => `<script type="application/ld+json">${body}</script>`

describe('safeJsonLd (helper)', () => {
  it('existe y está exportado', () => {
    expect(typeof (jsonld as any).safeJsonLd).toBe('function')
  })

  it('G1: un título con </script><script> queda inerte', () => {
    const body = safe({ headline: HOSTILE })
    expect(body.toLowerCase()).not.toContain('</script')
    expect(body.toLowerCase()).not.toContain('<script')
    const html = asHtml(body)
    expect(html.match(/<\/script>/gi)).toHaveLength(1)
  })

  it('G2/G3: <!-- y ]]> quedan neutralizados', () => {
    const body = safe({ a: '<!-- x -->', b: ']]>' })
    expect(body).not.toContain('<!--')
    expect(body).not.toContain(']]>')
  })

  it('G4: U+2028 y U+2029 no salen crudos', () => {
    const body = safe({ a: 'x\u2028y\u2029z' })
    expect(body).not.toContain('\u2028')
    expect(body).not.toContain('\u2029')
    expect(body).toContain('\\u2028')
    expect(body).toContain('\\u2029')
  })

  it('G5: & se escapa', () => {
    const body = safe({ a: 'a&b' })
    expect(body).not.toContain('&')
    expect(body).toContain('\\u0026')
  })

  it('G6: objetos anidados y arrays sin <, >, & crudos (claves y valores)', () => {
    const body = safe({ '<k>': [{ n: [HOSTILE, '&'] }, '>'], deep: { deeper: { v: '<' } } })
    expect(body).not.toMatch(/[<>&]/)
  })

  it('G7: JSON.parse devuelve un valor idéntico al original', () => {
    const value = {
      s: HOSTILE, amp: 'a&b', q: 'comilla " y \\ barra', u: 'ñ áé 日本 😀 \u2028\u2029',
      n: 1.5, b: true, nul: null, arr: [1, 'x', { y: '<>&' }], '<clave>': 'v',
    }
    expect(JSON.parse(safe(value))).toEqual(JSON.parse(JSON.stringify(value)))
  })

  it('G8: valores no serializables no lanzan y dan JSON válido', () => {
    expect(safe(undefined)).toBe('null')
    expect(JSON.parse(safe({ n: BigInt(10) }))).toEqual({ n: '10' })
    const circular: any = {}
    circular.self = circular
    expect(() => safe(circular)).not.toThrow()
    expect(safe(circular)).toBe('null')
    expect(JSON.parse(safe({ a: undefined, b: [undefined] }))).toEqual({ b: [null] })
  })

  it('G9: esquemas reales con datos hostiles no dejan < crudo', () => {
    const article = jsonld.buildNewsArticleSchema({ title: HOSTILE, description: HOSTILE, slug: 's', author: HOSTILE })
    const course = jsonld.buildCourseSchema({ name: HOSTILE, description: HOSTILE, slug: 'c' })
    const crumbs = jsonld.buildBreadcrumbSchema([{ name: HOSTILE, url: 'https://x.test/?a=1&b=2' }])
    for (const schema of [article, course, crumbs]) {
      const body = safe(schema)
      expect(body).not.toContain('<')
      expect(body).not.toContain('>')
      expect(JSON.parse(body)).toEqual(JSON.parse(JSON.stringify(schema)))
    }
  })
})

/** Recorre directorios devolviendo archivos .ts/.tsx (posix, relativos a la raíz). */
function sources(dir: string): string[] {
  const full = path.join(ROOT, dir)
  const out: string[] = []
  for (const name of readdirSync(full)) {
    if (name === 'node_modules' || name === '.next') continue
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sources(rel))
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel)
  }
  return out
}

describe('G10: uso obligatorio de safeJsonLd (estático)', () => {
  const files = ['app', 'components', 'lib'].flatMap(sources)
  const withSink = files.filter((f) => readFileSync(path.join(ROOT, f), 'utf8').includes('dangerouslySetInnerHTML'))

  it('el alcance conocido son los 3 archivos de página/layout (6 sitios)', () => {
    const real = withSink.filter((f) => f !== 'lib/seo/jsonld.ts')
    expect(real.sort()).toEqual([
      'app/[locale]/carreras/[slug]/page.tsx',
      'app/[locale]/layout.tsx',
      'app/[locale]/noticias/[slug]/page.tsx',
    ])
  })

  it('cada dangerouslySetInnerHTML (fuera de comentarios) usa safeJsonLd y no JSON.stringify directo', () => {
    let sites = 0
    const bad: string[] = []
    for (const file of withSink) {
      const lines = readFileSync(path.join(ROOT, file), 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (!line.includes('dangerouslySetInnerHTML') || /^\s*(\*|\/\/|\/\*)/.test(line)) return
        sites++
        const window = lines.slice(i, i + 3).join(' ')
        if (window.includes('JSON.stringify') || !window.includes('safeJsonLd(')) bad.push(`${file}:${i + 1}`)
      })
    }
    expect(sites).toBe(6)
    expect(bad).toEqual([])
  })
})
