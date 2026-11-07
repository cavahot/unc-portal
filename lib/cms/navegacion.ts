// INST-09: conversión del global `navegacion` del CMS a elementos de menú con hrefs saneados (DEP-19b). Puro, sin React.
// Qué hace: resuelve cada enlace del CMS a un href del portal: `relationship` -> `/<slug>` de la página relacionada;
// `manual` -> la URL guardada. Siempre pasa por `safeHref`.
// Por qué vive aquí y no en `MegaMenu.tsx`: ese archivo es un componente de cliente y un componente de servidor (el mapa del
// sitio) no puede llamar funciones de un módulo de cliente. Así el menú y el mapa comparten UNA sola fuente y UN solo saneado.
// Amenaza que evita: quien edite el global Navegación (o una cuenta comprometida) guarda `javascript:`/`data:`/`//host` y el
// clic ejecuta código o sale a otro origen.
// Límite: no valida que el destino exista; una ruta relativa sin barra queda en `#`.
import type { Navegacion } from '@unc/cms-types'
import { safeHref } from '@/lib/security/safeUrl'

export interface MenuItem {
  label: string
  href: string
  description?: string
  children?: MenuItem[]
}

function resolveHref(link: { type: 'manual' | 'relationship'; url?: string | null; page?: number | { slug: string } | null }): string {
  if (link.type === 'relationship' && link.page && typeof link.page === 'object') {
    return safeHref(`/${link.page.slug}`)
  }
  return safeHref(link.url)
}

/** Convierte el global Navegación en elementos de menú con hrefs saneados (DEP-19b). */
export function mapCmsNavigation(navigation: Navegacion): MenuItem[] {
  return (navigation.links || []).map((link) => ({
    label: link.label,
    href: resolveHref(link),
    children: (link.children || []).map((child) => ({
      label: child.label,
      href: resolveHref(child),
    })),
  }))
}
