// REDISEÑO menú principal por idioma: las etiquetas del menú y del mapa del sitio salen del catálogo `nav` según el destino del
// enlace, en lugar de mostrar siempre el texto en español del CMS.
// Amenazas: (1) /en, /pt-BR y /gn con el menú en español; (2) una clave del catálogo ausente en algún idioma (el menú mostraría la
// clave); (3) romper el menú editable: el español conserva el texto del CMS y un destino desconocido conserva su etiqueta; (4) tocar
// los destinos (el menú solo cambia etiquetas, nunca `href`).
// Límite: traduce por el destino conocido; un enlace nuevo creado en el CMS aparece con su etiqueta hasta que se agregue su clave.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/cms/client', () => ({ cmsFetch: vi.fn() }))

import { FALLBACK_NAVIGATION } from '../../lib/cms/queries/navigation'
import { armarMapa } from '../../lib/cms/mapaSitio'
import { mapCmsNavigation, menuLabelKey, translateMenu, type MenuItem } from '../../lib/cms/navegacion'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const nav = (loc: string) => JSON.parse(read(`messages/${loc}/nav.json`)) as Record<string, unknown>
const get = (obj: Record<string, unknown>, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj)

/** Menú de respaldo del componente (cliente): se lee del archivo para no cargar React en la prueba. */
function megaMenuFallback(): MenuItem[] {
  const src = read('components/navigation/MegaMenu.tsx')
  const block = src.slice(src.indexOf('export const fallbackMenuData'), src.indexOf('interface MenuItem') > 0 ? undefined : undefined)
  const items: MenuItem[] = []
  for (const m of block.matchAll(/label: '([^']+)'(?:,\s*href: '([^']+)')?/g)) items.push({ label: m[1], href: m[2] ?? '#' })
  return items
}

const principal = (): MenuItem[] => mapCmsNavigation(FALLBACK_NAVIGATION)
const flat = (items: MenuItem[]): MenuItem[] => items.flatMap((i) => [i, ...(i.children ?? [])])

describe('claves del menú', () => {
  it('todo destino del menú de respaldo (portal y componente) tiene clave de catálogo', () => {
    const todos = [...flat(principal()), ...megaMenuFallback()]
    expect(todos.length).toBeGreaterThan(30)
    const sinClave = todos.filter((i) => !menuLabelKey(i.href, i.label)).map((i) => `${i.label} -> ${i.href}`)
    expect(sinClave, `sin clave: ${sinClave.join(' | ')}`).toEqual([])
  })

  it.each(['es', 'gn', 'en', 'pt-BR'])('%s: cada clave existe en nav.json con texto', (loc) => {
    const catalog = nav(loc)
    const keys = new Set([...flat(principal()), ...megaMenuFallback()].map((i) => menuLabelKey(i.href, i.label)).filter(Boolean) as string[])
    const faltan = [...keys].filter((k) => typeof get(catalog, k) !== 'string' || !(get(catalog, k) as string).trim())
    expect(faltan, `${loc} sin: ${faltan.join(', ')}`).toEqual([])
  })
})

describe('translateMenu', () => {
  const lookup = (loc: string) => (key: string) => {
    const v = get(nav(loc), key)
    return typeof v === 'string' ? v : undefined
  }

  it('en español no cambia nada (el texto del CMS manda)', () => {
    const items = principal()
    expect(translateMenu(items, 'es', lookup('es'))).toBe(items)
  })

  it('en inglés traduce etiquetas y grupos, conserva los destinos y los hijos', () => {
    const items = principal()
    const en = translateMenu(items, 'en', lookup('en'))
    expect(en.map((i) => i.href)).toEqual(items.map((i) => i.href))
    expect(en[0].label).toBe('Home')
    const inst = en.find((i) => i.href === '/institucional')!
    expect(inst.label).toBe('Institutional')
    expect(inst.children!.find((c) => c.href === '/historia')!.label).toBe('History')
    expect(flat(en).filter((i, n) => i.label === flat(items)[n].label && !/^\/?$/.test(i.href)).length).toBeLessThan(3)
  })

  it('un destino desconocido conserva su etiqueta y una clave ausente en el catálogo también', () => {
    const items: MenuItem[] = [{ label: 'Nuevo enlace', href: '/pagina-nueva' }, { label: 'Historia', href: '/historia' }]
    const out = translateMenu(items, 'pt-BR', (k) => (k === 'institutional.historia' ? undefined : 'X'))
    expect(out.map((i) => i.label)).toEqual(['Nuevo enlace', 'Historia'])
  })

  it('el mapa del sitio usa la misma traducción', () => {
    const secciones = armarMapa(FALLBACK_NAVIGATION, (items) => translateMenu(items, 'en', lookup('en')))
    const texto = JSON.stringify(secciones)
    expect(texto).toContain('History')
    expect(texto).not.toContain('"Historia"')
  })
})

describe('pie de página', () => {
  const footer = read('components/layout/Footer.tsx')
  const claves = [...footer.matchAll(/key: '(footer\.[a-zA-Z.]+)'/g)].map((m) => m[1])

  it('cada enlace del pie declara su clave y no trae etiquetas en español escritas', () => {
    expect(claves).toHaveLength(12)
    expect(footer).not.toMatch(/label: '(Autoridades|Historia|Misión y Visión|Organigrama|Carreras|Trámites|Transparencia|Contacto|Investigación|Extensión universitaria|Noticias|Calendario académico)'/)
  })

  it.each(['es', 'gn', 'en', 'pt-BR'])('%s: las 12 claves del pie existen en nav.json', (loc) => {
    const catalog = nav(loc)
    const faltan = claves.filter((k) => typeof get(catalog, k) !== 'string' || !(get(catalog, k) as string).trim())
    expect(faltan).toEqual([])
  })

  it('el pie traduce las etiquetas con el catálogo nav', () => {
    expect(footer).toContain("getT(locale, 'nav')")
  })
})

describe('integración', () => {
  it('el menú del cliente y el mapa del sitio aplican la traducción por idioma', () => {
    const menu = read('components/navigation/MegaMenu.tsx')
    expect(menu).toContain('translateMenu(')
    expect(menu).toContain('useLocale')
    expect(read('app/[locale]/mapa-sitio/page.tsx')).toContain('translateMenu(')
  })
})
