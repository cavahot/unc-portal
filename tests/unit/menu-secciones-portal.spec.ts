// MENU-CMS-06: selector de secciones del portal en los enlaces «Manual» de Navegación (docs/specs/portal/MENU-PAGINAS.md §9).
// Qué comprueba: que la lista de secciones solo tenga rutas que existen en el portal y cubra todas las que el menú sabe
// traducir; que el combo ofrezca solo las que ningún otro enlace usa; que elegir una complete dirección y texto; y que el
// campo esté conectado en el panel. Por qué: las secciones programadas no son Páginas del CMS y había que escribir la ruta
// a mano (así se guardó un enlace sin dirección). Límite: el dibujo del combo se verifica en el panel local.
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PORTAL_SECTIONS, availableSections, applySection } from '../../apps/cms/src/config/portalSections'
import { Navegacion } from '../../apps/cms/src/globals/Navegacion'

const ROOT = path.resolve(__dirname, '..', '..')

describe('lista de secciones', () => {
  it('cada sección existe como página del portal (sin rutas inventadas ni duplicadas)', () => {
    const paths = PORTAL_SECTIONS.map((s) => s.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const { path: p, label } of PORTAL_SECTIONS) {
      expect(label.trim().length, p).toBeGreaterThan(0)
      const route = p.split('#')[0].replace(/^\//, '')
      const file = path.join(ROOT, 'app/[locale]', route, 'page.tsx')
      expect(existsSync(file), `${p} → ${file}`).toBe(true)
    }
  })

  it('incluye todas las secciones que el menú sabe traducir', async () => {
    const src = readFileSync(path.join(ROOT, 'lib/cms/navegacion.ts'), 'utf8')
    const block = src.slice(src.indexOf('const MENU_LABEL_KEYS'), src.indexOf('const MENU_GROUP_KEYS'))
    const keys = [...block.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1])
    expect(keys.length).toBeGreaterThan(30)
    const paths = new Set(PORTAL_SECTIONS.map((s) => s.path))
    for (const k of keys) expect(paths.has(k), k).toBe(true)
  })
})

describe('availableSections / applySection', () => {
  const links = [
    { label: 'Inicio', type: 'manual', url: '/' },
    { label: 'Academia', type: 'manual', url: '#', children: [{ label: 'Biblioteca', type: 'manual', url: '/biblioteca' }] },
    { label: 'P', type: 'relationship', url: '/historia', page: 3 }, // url residual de un enlace «Relación»: no cuenta
  ]

  it('excluye las secciones que usa otro enlace manual, en cualquier nivel; conserva la de la fila', () => {
    const paths = availableSections(links, '/biblioteca').map((s) => s.path)
    expect(paths).not.toContain('/')
    expect(paths).toContain('/biblioteca')
    expect(paths).toContain('/historia')
    expect(availableSections(links, '').map((s) => s.path)).not.toContain('/biblioteca')
    expect(availableSections(undefined, '').length).toBe(PORTAL_SECTIONS.length)
  })

  it('elegir una sección completa la dirección y, si el texto está vacío, también el texto', () => {
    const tesis = PORTAL_SECTIONS.find((s) => s.path === '/biblioteca#tesis')!
    expect(applySection(tesis, '')).toEqual({ url: '/biblioteca#tesis', label: 'Tesis Académicas' })
    expect(applySection(tesis, '   ')).toEqual({ url: '/biblioteca#tesis', label: 'Tesis Académicas' })
    expect(applySection(tesis, 'Repositorio')).toEqual({ url: '/biblioteca#tesis' })
  })
})

describe('conexión en el panel', () => {
  it('el campo «Dirección (URL)» de ambos niveles usa el componente con el selector', () => {
    const links = (Navegacion.fields as any[]).find((f) => f.name === 'links')
    const children = links.fields.find((f: any) => f.name === 'children')
    for (const list of [links.fields, children.fields]) {
      const url = list.find((f: any) => f.name === 'url')
      expect(url.admin.components.Field).toEqual({ path: './admin/components/NavegacionUrlField', exportName: 'NavegacionUrlField' })
    }
    const src = readFileSync(path.join(ROOT, 'apps/cms/src/admin/components/NavegacionUrlField.tsx'), 'utf8')
    expect(src.startsWith("'use client'")).toBe(true)
    const importMap = readFileSync(path.join(ROOT, 'apps/cms/src/app/(payload)/accesoSeguro/importMap.js'), 'utf8')
    expect(importMap).toContain('./admin/components/NavegacionUrlField#NavegacionUrlField')
  })
})

// Verificación en el panel real (2026-11-10): en el estado del formulario, un enlace SIN subenlaces trae `children` como el
// número de filas (0), no como lista. `link.children ?? []` lanzaba «is not iterable» y rompía el formulario.
describe('datos del formulario: children como número de filas', () => {
  const formLinks = [{ label: 'Inicio', type: 'manual', url: '/', children: 0 }, { label: 'A', type: 'relationship', page: 3, children: 0 }] as never

  it('availableSections no falla y sigue excluyendo lo usado', () => {
    expect(availableSections(formLinks, '').map((s) => s.path)).not.toContain('/')
  })

  it('el filtro de páginas del combo tampoco falla', async () => {
    const { pagesNotInMenuFilter } = await import('../../apps/cms/src/utilities/navegacionValidation')
    expect(pagesNotInMenuFilter(formLinks, null)).toEqual({ and: [{ _status: { equals: 'published' } }, { id: { not_in: [3] } }] })
  })
})
