// MENU-CMS-06: secciones programadas del portal que se pueden enlazar desde el menú (docs/specs/portal/MENU-PAGINAS.md §9).
// Qué es: la lista que alimenta el combo «Elegir una sección del portal» de los enlaces «Manual» de Navegación.
// Por qué existe: estas secciones no son Páginas del CMS, así que el combo de Páginas no las muestra y había que escribir
//   la ruta a mano (así quedó guardado un enlace sin dirección).
// Invariantes (los exige tests/unit/menu-secciones-portal.spec.ts): cada ruta existe como página del portal
//   (app/[locale]/…/page.tsx) y la lista incluye todas las rutas con traducción del menú (MENU_LABEL_KEYS en
//   lib/cms/navegacion.ts). Una ruta nueva del portal se agrega aquí para que aparezca en el combo.
// Límite: solo rutas fijas; las de detalle (/noticias/<slug>, /facultades/<slug>) no se listan.

export type PortalSection = { path: string; label: string }

export const PORTAL_SECTIONS: readonly PortalSection[] = [
  { path: '/', label: 'Inicio' },
  { path: '/institucional', label: 'Institucional' },
  { path: '/institucional#inst-sobre', label: 'Quiénes somos' },
  { path: '/historia', label: 'Historia' },
  { path: '/mision-vision-y-valores', label: 'Misión, Visión y Valores' },
  { path: '/autoridades', label: 'Autoridades' },
  { path: '/organigrama', label: 'Organigrama' },
  { path: '/marco-legal', label: 'Marco Legal' },
  { path: '/transparencia', label: 'Transparencia' },
  { path: '/ley-5189', label: 'Ley 5189/2014' },
  { path: '/ley-5282', label: 'Ley 5282/2014' },
  { path: '/informacion-publica', label: 'Información Pública' },
  { path: '/tramites', label: 'Trámites' },
  { path: '/titulos', label: 'Títulos' },
  { path: '/solicitar-titulo', label: 'Solicitar Título' },
  { path: '/legalizaciones', label: 'Legalizaciones' },
  { path: '/convenios', label: 'Convenios' },
  { path: '/convenios/internacionales', label: 'Convenios internacionales' },
  { path: '/tribunal-electoral', label: 'Tribunal Electoral' },
  { path: '/facultades', label: 'Facultades' },
  { path: '/facultades/odontologia', label: 'Facultad de Odontología' },
  { path: '/facultades/medicina', label: 'Facultad de Medicina' },
  { path: '/facultades/agrarias', label: 'Facultad de Ciencias Agrarias' },
  { path: '/facultades/ciencias-exactas', label: 'Facultad de Ciencias Exactas y Tecnológicas' },
  { path: '/facultades/humanidades', label: 'Facultad de Humanidades y Ciencias de la Educación' },
  { path: '/facultades/ciencias-economicas', label: 'Facultad de Ciencias Económicas y Administrativas' },
  { path: '/aranceles-rectorado', label: 'Aranceles Rectorado' },
  { path: '/carreras', label: 'Carreras' },
  { path: '/calendario-academico', label: 'Calendario Académico' },
  { path: '/noticias', label: 'Noticias' },
  { path: '/preguntas-frecuentes', label: 'Preguntas Frecuentes' },
  { path: '/contacto', label: 'Contactos' },
  { path: '/contacto/dependencias', label: 'Contactos por dependencia' },
  { path: '/direccion-general-academica', label: 'Dirección General Académica' },
  { path: '/aseguramiento-calidad', label: 'Aseguramiento de la Calidad' },
  { path: '/docencia', label: 'Docencia' },
  { path: '/investigacion', label: 'Investigación' },
  { path: '/extension', label: 'Extensión y Vinculación' },
  { path: '/bienestar-institucional', label: 'Bienestar Institucional' },
  { path: '/revistas', label: 'Revistas Académicas' },
  { path: '/biblioteca', label: 'Biblioteca Digital' },
  { path: '/biblioteca#tesis', label: 'Tesis Académicas' },
  { path: '/buscar', label: 'Buscar en el portal' },
  { path: '/mapa-sitio', label: 'Mapa del sitio' },
  { path: '/accesibilidad', label: 'Declaración de accesibilidad' },
  { path: '/privacidad', label: 'Política de privacidad' },
]

type LinkLike = { type?: string | null; url?: string | null; children?: LinkLike[] | null }

/**
 * Secciones que ningún otro enlace «Manual» del menú usa (en cualquier nivel). La de la fila que se edita (`current`)
 * se mantiene para que el combo la muestre. Los enlaces «Relación» no cuentan (su `url` puede ser un resto sin uso).
 */
export function availableSections(links: LinkLike[] | null | undefined, current: string | null | undefined): PortalSection[] {
  const used = new Set<string>()
  // En el estado del formulario, `links`/`children` vacíos llegan como el número de filas (0), no como lista.
  for (const link of Array.isArray(links) ? links : []) {
    for (const item of [link, ...(Array.isArray(link.children) ? link.children : [])]) {
      const url = (item.url ?? '').trim()
      if (item.type !== 'relationship' && url) used.add(url)
    }
  }
  const keep = (current ?? '').trim()
  return PORTAL_SECTIONS.filter((s) => s.path === keep || !used.has(s.path))
}

/** Valores a escribir al elegir una sección: siempre la dirección; el texto solo si estaba vacío. */
export function applySection(section: PortalSection, currentLabel: string | null | undefined): { url: string; label?: string } {
  return (currentLabel ?? '').trim() ? { url: section.path } : { url: section.path, label: section.label }
}
