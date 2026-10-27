import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DEP-SEC-01 (regresión de Next 16.4): toda `page.tsx` del CMS debe tener un `layout.tsx` raíz en su cadena
 * de carpetas dentro de `apps/cms/src/app`. Next 16.4.3 valida esto al compilar y, si una sola página
 * (p. ej. `dashboard/` o `monitoring/`) no lo tiene, responde 500 en TODAS las rutas del CMS en desarrollo
 * (panel, /api/health, /api/users/me). Límite: comprueba la existencia del archivo, no que renderice <html>.
 */

const APP_DIR = path.resolve(__dirname, '../../apps/cms/src/app')

function findPages(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...findPages(full))
    else if (/^page\.(tsx|ts|jsx|js)$/.test(entry)) out.push(full)
  }
  return out
}

function hasLayoutUpTo(pageFile: string): boolean {
  let dir = path.dirname(pageFile)
  while (dir.startsWith(APP_DIR)) {
    if (['layout.tsx', 'layout.ts', 'layout.jsx', 'layout.js'].some((f) => existsSync(path.join(dir, f)))) return true
    if (dir === APP_DIR) break
    dir = path.dirname(dir)
  }
  return false
}

describe('CMS: cada página tiene layout raíz (Next 16.4)', () => {
  it('ninguna page.tsx queda sin layout en su cadena', () => {
    const orphans = findPages(APP_DIR)
      .filter((p) => !hasLayoutUpTo(p))
      .map((p) => path.relative(APP_DIR, p))
    expect(orphans).toEqual([])
  })
})
