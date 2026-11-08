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

/**
 * Clave del catálogo `nav` (`messages/<idioma>/nav.json`) de cada destino conocido del menú. El menú se traduce por el DESTINO del
 * enlace y no por su texto: el CMS guarda las etiquetas solo en español, así que /en, /pt-BR y /gn mostraban el menú en español
 * aunque el catálogo ya tenía las traducciones. Límite: un enlace nuevo creado en el CMS conserva su etiqueta hasta que se
 * agregue aquí su clave.
 */
const MENU_LABEL_KEYS: Record<string, string> = {
  '/': 'items.inicio',
  '/institucional': 'items.institucional',
  '/institucional#inst-sobre': 'institutional.quienesSomos',
  '/historia': 'institutional.historia',
  '/mision-vision-y-valores': 'institutional.misionVisionValores',
  '/marco-legal': 'institutional.marcoLegal',
  '/organigrama': 'institutional.organigrama',
  '/autoridades': 'institutional.autoridades',
  '/ley-5189': 'institutional.transparenciaLey5189',
  '/ley-5282': 'institutional.transparenciaLey5282',
  '/transparencia': 'institutional.transparencia',
  '/informacion-publica': 'institutional.informacionPublica',
  '/tramites': 'institutional.tramites',
  '/titulos': 'institutional.titulos',
  '/solicitar-titulo': 'institutional.solicitarTitulo',
  '/legalizaciones': 'institutional.legalizaciones',
  '/convenios': 'institutional.convenios',
  '/tribunal-electoral': 'institutional.tribunalElectoral',
  '/facultades/odontologia': 'facultades.odontologia',
  '/facultades/medicina': 'facultades.medicina',
  '/facultades/agrarias': 'facultades.cienciasAgrarias',
  '/facultades/ciencias-exactas': 'facultades.cienciasExactas',
  '/facultades/humanidades': 'facultades.humanidades',
  '/facultades/ciencias-economicas': 'facultades.cienciasEconomicas',
  '/aranceles-rectorado': 'facultades.arancelesRectorado',
  '/noticias': 'items.noticias',
  '/preguntas-frecuentes': 'items.preguntasFrecuentes',
  '/contacto': 'items.contactos',
  '/contacto/dependencias': 'contactos.porDependencia',
  '/direccion-general-academica': 'academia.direccionAcademica',
  '/aseguramiento-calidad': 'academia.aseguramientoCalidad',
  '/investigacion': 'academia.investigacion',
  '/extension': 'academia.extensionVinculacion',
  '/bienestar-institucional': 'academia.bienestarInstitucional',
  '/revistas': 'academia.revistasAcademicas',
  '/biblioteca': 'academia.bibliotecaDigital',
}

/** Grupos del menú sin destino propio (`#`): se reconocen por su etiqueta en español. */
const MENU_GROUP_KEYS: Record<string, string> = {
  Facultades: 'items.facultades',
  Academia: 'items.academia',
  Contactos: 'items.contactos',
}

/** Clave del catálogo para un elemento del menú, o `undefined` si el destino no es conocido. */
export function menuLabelKey(href: string, label: string): string | undefined {
  const byHref = MENU_LABEL_KEYS[href]
  if (byHref) return byHref
  return !href || href === '#' ? MENU_GROUP_KEYS[label.trim()] : undefined
}

/**
 * Traduce las etiquetas del menú al idioma de la persona. En español no cambia nada (manda el texto editable del CMS). En los
 * demás idiomas reemplaza la etiqueta cuando el catálogo (`lookup`) tiene la clave del destino; si no, conserva la del CMS.
 * Nunca modifica `href` ni `description`.
 */
export function translateMenu(items: MenuItem[], locale: string, lookup: (key: string) => string | undefined): MenuItem[] {
  if (locale === 'es') return items
  const label = (item: MenuItem): string => {
    const key = menuLabelKey(item.href, item.label)
    return (key ? lookup(key) : undefined) || item.label
  }
  return items.map((item) => ({
    ...item,
    label: label(item),
    ...(item.children ? { children: item.children.map((c) => ({ ...c, label: label(c) })) } : {}),
  }))
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
