// R4 MEDIUM-1 / ISR: toda página del portal que lee el CMS debe declarar `revalidate` literal.
// Qué hace: enumera app/[locale]/**/page.tsx que importan lib/cms y exige `export const revalidate = <número>`
// (literal estático: Next lo analiza en build, una expresión se ignora o falla).
// Amenaza que evita: el Dockerfile construye sin CMS alcanzable; sin revalidate la página prerenderizada puede
// quedar horneada en «no disponible»/«vacío» hasta una revalidación por etiqueta o el timer de 3600 s del fetch.
// Límite: análisis estático; no ejecuta Next. Las exenciones son páginas dinámicas por searchParams/cookies
// (se renderizan por petición, no se prerenderizan) o que ya definen su propio revalidate.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', 'app', '[locale]')

// Exenciones documentadas: dinámicas por request API (searchParams/cookies) -> sin prerender estático.
const EXEMPT = new Set([
  '[...slug]/page.tsx', // usa cookies()
  'buscar/page.tsx', // searchParams
  'biblioteca/page.tsx', // searchParams
  'noticias/page.tsx', // searchParams (paginación)
])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : n === 'page.tsx' ? [p] : []
  })
}

const pages = walk(ROOT)
  .map((p) => ({ rel: relative(ROOT, p).replace(/\\/g, '/'), src: readFileSync(p, 'utf8') }))
  .filter((p) => /from\s+['"]@\/lib\/cms|lib\/cms\/queries/.test(p.src))

describe('ISR en páginas con datos del CMS', () => {
  it('encuentra páginas CMS (sanidad del enumerador)', () => {
    expect(pages.length).toBeGreaterThan(15)
  })

  for (const { rel, src } of pages) {
    it(`${rel} declara revalidate numérico o está exenta`, () => {
      if (EXEMPT.has(rel)) return
      const ok =
        /^export const revalidate = \d+\s*(\/\/.*)?$/m.test(src) ||
        /^export const dynamic = ['"]force-dynamic['"]/m.test(src)
      expect(ok, `${rel} necesita export const revalidate = <literal>`).toBe(true)
    })
  }
})
