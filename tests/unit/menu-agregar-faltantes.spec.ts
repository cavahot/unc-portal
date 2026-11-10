// MENU-CMS-07: agregar al menú guardado los subenlaces del menú base que faltan (spec docs/specs/portal/MENU-PAGINAS.md §10).
// Qué comprueba: (S1) «Docencia» se inserta bajo «Academia» antes de «Investigación»; (S2) nada existente se borra, mueve
//   ni cambia (ids y enlaces «Relación» intactos); (S3) un enlace que ya existe en cualquier grupo no se duplica; (S4) no
//   agrega enlaces principales ni supera el tope de subenlaces; (S5) aplicarlo dos veces no cambia nada.
// Límite: función pura; la escritura en la base la hace apps/cms/scripts/menu/agregar-enlaces-faltantes.ts (solo local).
import { describe, expect, it } from 'vitest'
import { mergeMissingSeedLinks } from '../../scripts/lib/navegacionMerge.mjs'
import { NAVEGACION_SEED } from '../../scripts/lib/navegacionSeedData.mjs'

const sinDocencia = () =>
  structuredClone(NAVEGACION_SEED).map((l: any, i: number) => ({
    id: `p${i}`,
    ...l,
    children: l.children?.filter((c: any) => c.url !== '/docencia').map((c: any, j: number) => ({ id: `c${i}-${j}`, ...c })),
  }))

const academia = (links: any[]) => links.find((l) => l.label === 'Academia')

describe('MENU-CMS-07: subenlaces faltantes del menú base', () => {
  it('S1: inserta Docencia en Academia, antes de Investigación', () => {
    const { links, added } = mergeMissingSeedLinks(sinDocencia(), NAVEGACION_SEED)
    expect(added).toEqual([{ parent: 'Academia', label: 'Docencia', url: '/docencia' }])
    const urls = academia(links).children.map((c: any) => c.url)
    expect(urls.indexOf('/docencia')).toBe(urls.indexOf('/investigacion') - 1)
  })

  it('S2: no borra, mueve ni cambia lo existente', () => {
    const saved = sinDocencia()
    saved[0].children = [{ id: 'rel', label: 'Página del CMS', type: 'relationship', page: 9 }]
    const before = JSON.stringify(saved)
    const { links } = mergeMissingSeedLinks(saved, NAVEGACION_SEED)
    expect(JSON.stringify(saved)).toBe(before)
    // Cada enlace con id conserva sus campos (sin contar la lista de hijos, que gana el subenlace nuevo) y su orden.
    const existentes = (l: any[]) =>
      l.flatMap((p) => [p, ...(p.children ?? [])]).filter((x) => x.id).map(({ children: _c, ...rest }) => rest)
    expect(existentes(links)).toEqual(existentes(saved))
  })

  it('S3: un enlace que ya está en otro grupo no se duplica', () => {
    const saved = sinDocencia()
    saved[1].children.push({ id: 'movido', label: 'Docencia', type: 'manual', url: '/docencia' })
    expect(mergeMissingSeedLinks(saved, NAVEGACION_SEED).added).toEqual([])
  })

  it('S4: no agrega enlaces principales y respeta el tope de subenlaces', () => {
    const soloInicio = [{ id: 'a', label: 'Inicio', type: 'manual', url: '/' }]
    expect(mergeMissingSeedLinks(soloInicio, NAVEGACION_SEED)).toMatchObject({ links: soloInicio, added: [] })
    const lleno = sinDocencia()
    const acad = academia(lleno)
    while (acad.children.length < 20) acad.children.push({ label: `x${acad.children.length}`, type: 'manual', url: `/x${acad.children.length}` })
    const r = mergeMissingSeedLinks(lleno, NAVEGACION_SEED)
    expect(r.added).toEqual([])
    expect(r.skipped[0]).toMatchObject({ parent: 'Academia', label: 'Docencia' })
  })

  it('S5: aplicarlo dos veces no cambia nada', () => {
    const once = mergeMissingSeedLinks(sinDocencia(), NAVEGACION_SEED).links
    const twice = mergeMissingSeedLinks(once, NAVEGACION_SEED)
    expect(twice.added).toEqual([])
    expect(twice.links).toEqual(once)
  })
})
