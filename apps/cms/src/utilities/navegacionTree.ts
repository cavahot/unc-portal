// MENU-CMS-03: lógica pura de la vista de estructura del menú en el panel (spec: docs/specs/portal/MENU-PAGINAS.md §6).
// Qué hace: convierte los datos del formulario de Navegación (mientras se editan) en un árbol con el destino de cada
//   enlace, y arma el texto de cada fila del formulario.
// Por qué existe: el apartado existía pero cada fila se veía como «Link 01» y no había forma de ver el menú completo antes
//   de guardar. Separada de los componentes para probarla sin el panel.
// Límite: no consulta el título ni el slug de las páginas vinculadas (el formulario solo tiene su id).

type LinkData = {
  label?: string | null
  type?: string | null
  url?: string | null
  page?: unknown
  children?: LinkData[] | null
}

export type NavTreeNode = { label: string; destination: string; children: NavTreeNode[] }

const UNNAMED = 'Enlace sin nombre'

function labelOf(link: LinkData | undefined): string {
  const text = typeof link?.label === 'string' ? link.label.trim() : ''
  return text || UNNAMED
}

/** Destino legible: ruta, grupo sin página propia (`#`), página vinculada o «sin destino». */
function destinationOf(link: LinkData): string {
  if (link.type === 'relationship') {
    const page = link.page
    if (page && typeof page === 'object' && typeof (page as { slug?: unknown }).slug === 'string') {
      return `/${(page as { slug: string }).slug}`
    }
    return page ? 'Página vinculada' : 'sin destino'
  }
  const url = typeof link.url === 'string' ? link.url.trim() : ''
  if (url === '#') return 'Grupo sin página propia'
  return url || 'sin destino'
}

/** Árbol del menú en el orden del portal. Tolera filas a medio completar. */
export function buildNavTree(links: LinkData[] | null | undefined): NavTreeNode[] {
  if (!Array.isArray(links)) return []
  return links.map((link) => ({
    label: labelOf(link),
    destination: destinationOf(link ?? {}),
    children: buildNavTree(link?.children),
  }))
}

/** Texto de una fila: su etiqueta y, si tiene subenlaces, cuántos («Academia · 7 subenlaces»). */
export function rowLabelFor(data: LinkData | undefined): string {
  const label = labelOf(data)
  const count = Array.isArray(data?.children) ? data.children.length : 0
  if (count === 0) return label
  return `${label} · ${count} ${count === 1 ? 'subenlace' : 'subenlaces'}`
}
