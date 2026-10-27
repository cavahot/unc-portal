// ARR-01 (regresión): una página de servidor no puede LLAMAR funciones exportadas por un módulo 'use client'.
// Qué evita: en el servidor esas exportaciones son referencias de cliente; llamarlas lanza «Attempted to call X()
// from the server» y la página cae en el error boundary («Algo salió mal»). Pasó en /aranceles-rectorado con
// `grupoId`. Regla comprobada: desde un módulo 'use client' una página solo importa componentes (PascalCase) o
// tipos. Límite: análisis estático de imports `@/…` en app/**/page.tsx y layout.tsx; no cubre reexportaciones.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/^(page|layout)\.tsx$/.test(name)) out.push(p)
  }
  return out
}

function resolveAlias(spec: string): string | null {
  const base = resolve(ROOT, spec.slice(2))
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) if (existsSync(base + ext)) return base + ext
  return null
}

const isClientModule = (file: string) => /^\s*(['"])use client\1/.test(readFileSync(file, 'utf8'))

/** Nombres de valor (no tipos) que un archivo importa de un módulo 'use client' y no son componentes. */
export function badClientImports(source: string, isClient: (spec: string) => boolean): string[] {
  const bad: string[] = []
  const re = /import\s+(type\s+)?([^'";]*?)\s+from\s+['"](@\/[^'"]+)['"]/g
  for (const m of source.matchAll(re)) {
    if (m[1] || !isClient(m[3])) continue
    const named = m[2].match(/\{([^}]*)\}/)?.[1] ?? ''
    for (const part of named.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (part.startsWith('type ')) continue
      const local = part.split(/\s+as\s+/).pop()!.trim()
      if (!/^[A-Z]/.test(local)) bad.push(`${local} (de ${m[3]})`)
    }
  }
  return bad
}

describe('frontera servidor/cliente en páginas', () => {
  it('el detector marca funciones y deja pasar componentes y tipos', () => {
    const src = "import Browser, { grupoId, type Labels, Other } from '@/components/x'"
    expect(badClientImports(src, () => true)).toEqual(['grupoId (de @/components/x)'])
  })

  it('ninguna página o layout de servidor importa funciones de un módulo cliente', () => {
    const offenders: string[] = []
    for (const file of walk(resolve(ROOT, 'app'))) {
      const src = readFileSync(file, 'utf8')
      if (isClientModule(file)) continue
      const bad = badClientImports(src, (spec) => {
        const target = resolveAlias(spec)
        return !!target && isClientModule(target)
      })
      for (const b of bad) offenders.push(`${file.slice(ROOT.length + 1)}: ${b}`)
    }
    expect(offenders).toEqual([])
  })
})
