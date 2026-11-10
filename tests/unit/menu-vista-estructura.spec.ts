// MENU-CMS-03: vista de la estructura del menú en el panel del CMS (spec: docs/specs/portal/MENU-PAGINAS.md §6).
// Qué comprueba: (S1) el árbol que dibuja la vista a partir de los datos del formulario; (S2) el texto de cada fila;
//   (S3) las etiquetas en español y que la vista y las etiquetas de fila estén conectadas en el global; (S4) que no se
//   agregan campos que guarden datos. Por qué: el apartado existía pero era ilegible («Link 01», «Link 02»).
// Límite: la lógica se prueba pura; el dibujo en el panel se verificó en el CMS local.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildNavTree, rowLabelFor } from '../../apps/cms/src/utilities/navegacionTree'
import { Navegacion } from '../../apps/cms/src/globals/Navegacion'

const ROOT = path.resolve(__dirname, '..', '..')

describe('S1 — árbol de la vista', () => {
  it('respeta el orden, anida subenlaces y describe el destino de cada uno', () => {
    const tree = buildNavTree([
      { label: 'Inicio', type: 'manual', url: '/' },
      {
        label: 'Academia',
        type: 'manual',
        url: '#',
        children: [
          { label: 'Investigación', type: 'manual', url: '/investigacion' },
          { label: 'Tesis Académicas', type: 'relationship', page: 12 },
          { label: 'Sin destino', type: 'manual', url: '' },
          { label: 'Relación sin página', type: 'relationship', page: null },
        ],
      },
    ])
    expect(tree).toEqual([
      { label: 'Inicio', destination: '/', children: [] },
      {
        label: 'Academia',
        destination: 'Grupo sin página propia',
        children: [
          { label: 'Investigación', destination: '/investigacion', children: [] },
          { label: 'Tesis Académicas', destination: 'Página vinculada', children: [] },
          { label: 'Sin destino', destination: 'sin destino', children: [] },
          { label: 'Relación sin página', destination: 'sin destino', children: [] },
        ],
      },
    ])
  })

  it('tolera datos incompletos del formulario mientras se edita', () => {
    expect(buildNavTree(undefined)).toEqual([])
    expect(buildNavTree([{}] as never)).toEqual([{ label: 'Enlace sin nombre', destination: 'sin destino', children: [] }])
  })
})

describe('S2 — texto de cada fila', () => {
  it('muestra el texto y, en un enlace principal, cuántos subenlaces tiene', () => {
    expect(rowLabelFor({ label: 'Academia', children: [{}, {}, {}, {}, {}, {}, {}] })).toBe('Academia · 7 subenlaces')
    expect(rowLabelFor({ label: 'Contactos', children: [{}] })).toBe('Contactos · 1 subenlace')
    expect(rowLabelFor({ label: 'Inicio', children: [] })).toBe('Inicio')
    expect(rowLabelFor({ label: 'Tesis Académicas' })).toBe('Tesis Académicas')
    expect(rowLabelFor({ label: '   ' })).toBe('Enlace sin nombre')
    expect(rowLabelFor(undefined)).toBe('Enlace sin nombre')
  })
})

describe('S3 / S4 — configuración del global', () => {
  const fields = Navegacion.fields as any[]
  const links = fields.find((f) => f.name === 'links')
  const children = links.fields.find((f: any) => f.name === 'children')
  const byName = (list: any[], name: string) => list.find((f) => f.name === name)

  it('la vista del menú va primero y es un campo de interfaz (no guarda datos)', () => {
    expect(fields[0].type).toBe('ui')
    expect(fields[0].admin.components.Field).toEqual({ path: './admin/components/NavegacionPreview', exportName: 'NavegacionPreview' })
    expect(fields.filter((f) => f.type !== 'ui').map((f) => f.name)).toEqual(['links'])
  })

  it('las filas de ambos niveles usan la etiqueta con su texto', () => {
    const rowLabel = { path: './admin/components/NavegacionRowLabel', exportName: 'NavegacionRowLabel' }
    expect(links.admin.components.RowLabel).toEqual(rowLabel)
    expect(children.admin.components.RowLabel).toEqual(rowLabel)
  })

  it('etiquetas en español', () => {
    expect(links.labels).toEqual({ singular: 'Enlace', plural: 'Enlaces del menú' })
    expect(children.labels).toEqual({ singular: 'Subenlace', plural: 'Subenlaces' })
    for (const list of [links.fields, children.fields]) {
      expect(byName(list, 'label').label).toBe('Texto')
      expect(byName(list, 'type').label).toBe('Tipo de destino')
      expect(byName(list, 'url').label).toBe('Dirección (URL)')
      expect(byName(list, 'page').label).toBe('Página')
      expect(byName(list, 'newTab').label).toBe('Abrir en una pestaña nueva')
    }
  })

  it('los componentes existen, son de cliente y están en el mapa de importación del panel', () => {
    for (const name of ['NavegacionPreview', 'NavegacionRowLabel']) {
      const src = readFileSync(path.join(ROOT, `apps/cms/src/admin/components/${name}.tsx`), 'utf8')
      expect(src.startsWith("'use client'")).toBe(true)
    }
    const importMap = readFileSync(path.join(ROOT, 'apps/cms/src/app/(payload)/accesoSeguro/importMap.js'), 'utf8')
    expect(importMap).toContain('./admin/components/NavegacionPreview#NavegacionPreview')
    expect(importMap).toContain('./admin/components/NavegacionRowLabel#NavegacionRowLabel')
  })
})

// MENU-CMS-04: «Tesis Académicas» dentro de Academia. Pedido (textual): «trata de enlazar bien tesis académica a una
// pagina que redireccione si la ahi si no la hay diseña uno con lo que tenemos en el cms». La página existe: /biblioteca es
// el repositorio de tesis (colección `tesis`, «Tesis Académicas» en el CMS); el enlace va a su lista con un ancla propia,
// para que el menú la traduzca por destino sin confundirla con «Biblioteca Digital».
describe('MENU-CMS-04 — Tesis Académicas en Academia', () => {
  const HREF = '/biblioteca#tesis'

  it('está en las tres copias del menú (respaldo del portal, siembra del CMS y MegaMenu), después de Biblioteca Digital', async () => {
    const { FALLBACK_NAVIGATION } = await import('../../lib/cms/queries/navigation')
    // @ts-expect-error módulo .mjs sin tipos
    const { NAVEGACION_SEED } = await import('../../scripts/lib/navegacionSeedData.mjs')
    const academiaUrls = [
      (FALLBACK_NAVIGATION.links ?? []).find((l: any) => l.label === 'Academia')?.children?.map((c: any) => [c.label, c.url]),
      NAVEGACION_SEED.find((l: any) => l.label === 'Academia')?.children?.map((c: any) => [c.label, c.url]),
    ]
    // MegaMenu es un componente de cliente: importarlo aquí arrastra `next/navigation`; se compara su código fuente.
    const mega = readFileSync(path.join(ROOT, 'components/navigation/MegaMenu.tsx'), 'utf8')
    const bib = mega.indexOf("{ label: 'Biblioteca Digital', href: '/biblioteca' },")
    const tesis = mega.indexOf("{ label: 'Tesis Académicas', href: '/biblioteca#tesis' },")
    expect(bib).toBeGreaterThan(-1)
    expect(tesis).toBeGreaterThan(bib)
    // Solo un comentario entre los dos: Tesis va inmediatamente después de Biblioteca Digital.
    expect(mega.slice(bib, tesis).split('{ label:').length).toBe(2)
    for (const list of academiaUrls) {
      const i = list!.findIndex(([, u]: string[]) => u === '/biblioteca')
      expect(list![i + 1]).toEqual(['Tesis Académicas', HREF])
    }
  })

  it('el destino existe en el portal y tiene traducción en los cuatro idiomas', async () => {
    const page = readFileSync(path.join(ROOT, 'app/[locale]/biblioteca/page.tsx'), 'utf8')
    // El ancla va en la sección que SIEMPRE se dibuja (también sin tesis cargadas o con el CMS caído), no en el título de
    // resultados, que solo existe en el estado `ok`.
    expect(page).toMatch(/<section id="tesis" className="[^"]*scroll-mt-/)
    expect(page.indexOf('id="tesis"')).toBeLessThan(page.indexOf("result.status === 'ok' ?"))
    const { menuLabelKey } = await import('../../lib/cms/navegacion')
    expect(menuLabelKey(HREF, 'Tesis Académicas')).toBe('academia.tesisAcademicas')
    const expected: Record<string, string> = { es: 'Tesis Académicas', en: 'Academic Theses', 'pt-BR': 'Teses Acadêmicas' }
    for (const l of ['es', 'en', 'pt-BR', 'gn']) {
      const nav = JSON.parse(readFileSync(path.join(ROOT, `messages/${l}/nav.json`), 'utf8'))
      expect(typeof nav.academia.tesisAcademicas, l).toBe('string')
      if (expected[l]) expect(nav.academia.tesisAcademicas).toBe(expected[l])
    }
  })
})

// MENU-CMS-03, verificación en el panel real (2026-11-09): (a) se guardó «Tesis Académicos» como «Manual» con la URL vacía
// (la vista lo mostró como «sin destino») porque solo se validaban los enlaces «Relación»; (b) las cabeceras de las listas
// seguían en inglés («Links», «Children»).
describe('MENU-CMS-03 — hallazgos de la verificación en el panel', () => {
  const lookup = async () => ({ _status: 'published' })
  const MSG = 'El enlace «Tesis Académicos» es de tipo «Manual» pero no tiene dirección. Escriba la ruta (por ejemplo, /biblioteca) o «#» si es un grupo sin página propia.'

  it('rechaza un enlace «Manual» sin dirección, también como subenlace y con solo espacios', async () => {
    const { validateNavegacionLinks } = await import('../../apps/cms/src/utilities/navegacionValidation')
    const sub = (url: string | null) => [{ label: 'Academia', type: 'manual', url: '#', children: [{ label: 'Tesis Académicos', type: 'manual', url }] }]
    expect(await validateNavegacionLinks(sub(''), lookup)).toBe(MSG)
    expect(await validateNavegacionLinks(sub('   '), lookup)).toBe(MSG)
    expect(await validateNavegacionLinks(sub(null), lookup)).toBe(MSG)
    expect(await validateNavegacionLinks([{ label: 'Tesis Académicos', url: '' }], lookup)).toBe(MSG) // tipo por defecto: Manual
  })

  it('acepta «#» (grupo) y rutas; los enlaces «Relación» siguen igual', async () => {
    const { validateNavegacionLinks } = await import('../../apps/cms/src/utilities/navegacionValidation')
    expect(await validateNavegacionLinks([{ label: 'Academia', type: 'manual', url: '#', children: [{ label: 'T', type: 'manual', url: '/biblioteca#tesis' }] }], lookup)).toBe(true)
    expect(await validateNavegacionLinks([{ label: 'P', type: 'relationship', page: 1 }], lookup)).toBe(true)
  })

  it('las cabeceras de las listas están en español', () => {
    const links = (Navegacion.fields as any[]).find((f) => f.name === 'links')
    const children = links.fields.find((f: any) => f.name === 'children')
    expect(links.label).toBe('Enlaces del menú')
    expect(children.label).toBe('Subenlaces')
  })
})
