// INST-09: modelo de /mapa-sitio. Puro, sin red ni React.
// Qué hace: convierte el global `navegacion` del CMS (el mismo que arma el menú) en las secciones del mapa del sitio: cada
// elemento del menú con hijos es una sección y los elementos sin hijos se juntan en «principal».
// Por qué: el mapa anterior tenía los enlaces escritos en el código; cinco apuntaban a rutas que no existen
// (`/institucional/historia`, etc. devolvían «Página no encontrada») y omitía unas 15 páginas del menú. Derivarlo de la
// navegación hace que el mapa y el menú nunca diverjan y que el equipo lo edite desde el CMS.
// Amenazas: (1) un href hostil del CMS (`javascript:`, `//host`) llegando al mapa (se resuelve con el mismo saneado del menú:
// `mapCmsNavigation`); (2) una etiqueta sin destino (`#`) mostrada como enlace (se descarta); (3) enlaces repetidos.
// Límite: no comprueba que el destino exista; una página borrada que siga en el menú también seguirá en el mapa.
import type { Navegacion } from '@unc/cms-types'
import { mapCmsNavigation } from '@/lib/cms/navegacion'

export interface MapaEnlace {
  label: string
  href: string
}
export interface MapaSeccion {
  /** `principal` para los elementos sin hijos; el índice del elemento del menú en los demás. */
  key: string
  /** Título de la sección; vacío en `principal` (lo pone la página con su texto de interfaz). */
  title: string
  /** Destino del propio elemento del menú, si lo tiene (`#` o vacío no son un destino). */
  href?: string
  links: MapaEnlace[]
}

const usable = (href: string | undefined): href is string => typeof href === 'string' && href.trim() !== '' && href !== '#'
const clean = (s: unknown): string => (typeof s === 'string' ? s.trim() : '')

export function armarMapa(navigation: Navegacion | null | undefined): MapaSeccion[] {
  if (!navigation || !Array.isArray(navigation.links) || navigation.links.length === 0) return []
  const principal: MapaEnlace[] = []
  const secciones: MapaSeccion[] = []

  mapCmsNavigation(navigation).forEach((item, i) => {
    const label = clean(item.label)
    if (!label) return
    const seen = new Set<string>()
    const links: MapaEnlace[] = []
    for (const child of item.children ?? []) {
      const l = clean(child.label)
      if (!l || !usable(child.href) || seen.has(child.href)) continue
      seen.add(child.href)
      links.push({ label: l, href: child.href })
    }
    if (links.length > 0) {
      secciones.push({ key: `menu-${i}`, title: label, href: usable(item.href) ? item.href : undefined, links })
    } else if (usable(item.href)) {
      principal.push({ label, href: item.href })
    }
  })

  return principal.length > 0 ? [{ key: 'principal', title: '', links: principal }, ...secciones] : secciones
}
