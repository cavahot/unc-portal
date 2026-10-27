// DEP-15 (Frente C): fallback por archivo a `es` para namespaces i18n ausentes en otro locale.
// Amenaza: `/en/ley-5189` sin archivo -> MISSING_MESSAGE o caída de la página. Límite: el importador
// es simulado (no el import() del bundler) y NO hay fallback por clave dentro de un archivo existente.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { loadMessages } from '@/lib/i18n/loadMessages'

const ROOT = path.resolve(__dirname, '..', '..')

/** Importador simulado: lanza como lo haría `import()` ante un archivo inexistente. */
function fakeImporter(files: Record<string, unknown>) {
  return async (locale: string, ns: string) => {
    const key = `${locale}/${ns}`
    if (!(key in files)) throw new Error(`Cannot find module ${key}`)
    return { default: files[key] }
  }
}

describe('loadMessages', () => {
  const files = {
    'es/common': { hello: 'Hola' },
    'en/common': { hello: 'Hello' },
    'es/pages.ley-5189': { title: 'Ley 5189' },
    'es/pages.facultades.humanidades': { title: 'Humanidades' },
  }

  it('página faltante en /en muestra el texto es, sin lanzar', async () => {
    const m: any = await loadMessages('en', ['common', 'pages.ley-5189'], fakeImporter(files))
    expect(m.common.hello).toBe('Hello')
    expect(m.pages['ley-5189'].title).toBe('Ley 5189')
  })

  it('anida namespaces con puntos', async () => {
    const m: any = await loadMessages('gn', ['pages.facultades.humanidades'], fakeImporter(files))
    expect(m.pages.facultades.humanidades.title).toBe('Humanidades')
  })

  it('con el archivo presente usa el del locale, no el de es', async () => {
    const m: any = await loadMessages('en', ['common'], fakeImporter(files))
    expect(m.common.hello).toBe('Hello')
  })

  it('namespace ausente también en es se omite sin lanzar', async () => {
    const m: any = await loadMessages('en', ['pages.inexistente'], fakeImporter(files))
    expect(m.pages).toBeUndefined()
  })

  it('i18n/request.ts delega en loadMessages (el fallback probado es el que corre)', () => {
    const src = readFileSync(path.join(ROOT, 'i18n/request.ts'), 'utf8')
    expect(src).toMatch(/loadMessages\(/)
  })
})
