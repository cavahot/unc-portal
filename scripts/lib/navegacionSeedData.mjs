// MENU-CMS-01: menú principal del portal, en el formato del global `navegacion` del CMS.
// Qué es: copia del menú de respaldo del portal (`FALLBACK_NAVIGATION` en lib/cms/queries/navigation.ts), sin los `id` de
//   ejemplo. La prueba `tests/unit/menu-paginas-cms.spec.ts` exige que ambos coincidan: si uno cambia, el otro también.
// Por qué existe: con Navegación VACÍA el portal usa el respaldo, pero con UN solo enlace guardado reemplaza el menú completo
//   (recorrido real 2026-11-09). Sembrar el menú actual permite agregar una página sin perder el resto.
// Límite: son enlaces «Manual» (rutas del portal); las etiquetas están en español y el portal las traduce por destino.
const m = (label, url, children = []) => ({
  label,
  type: 'manual',
  url,
  newTab: false,
  ...(children.length ? { children: children.map(([l, u]) => ({ label: l, type: 'manual', url: u, newTab: false })) } : {}),
})

export const NAVEGACION_SEED = [
  m('Inicio', '/'),
  m('Institucional', '/institucional', [
    ['Historia', '/historia'],
    ['Misión, Visión y Valores', '/mision-vision-y-valores'],
    ['Autoridades', '/autoridades'],
    ['Organigrama', '/organigrama'],
    ['Marco Legal', '/marco-legal'],
    ['Transparencia', '/transparencia'],
    ['Ley 5189/2014', '/ley-5189'],
    ['Ley 5282/2014', '/ley-5282'],
    ['Trámites', '/tramites'],
    ['Información Pública', '/informacion-publica'],
    ['Títulos', '/titulos'],
    ['Legalizaciones', '/legalizaciones'],
    ['Solicitar Título', '/solicitar-titulo'],
    ['Convenios', '/convenios'],
    ['Tribunal Electoral', '/tribunal-electoral'],
  ]),
  m('Facultades', '#', [
    ['Facultad de Odontología', '/facultades/odontologia'],
    ['Facultad de Medicina', '/facultades/medicina'],
    ['Facultad de Ciencias Agrarias', '/facultades/agrarias'],
    ['Facultad de Ciencias Exactas y Tecnológicas', '/facultades/ciencias-exactas'],
    ['Facultad de Humanidades y Ciencias de la Educación', '/facultades/humanidades'],
    ['Facultad de Ciencias Económicas y Administrativas', '/facultades/ciencias-economicas'],
    ['Aranceles Rectorado', '/aranceles-rectorado'],
  ]),
  m('Noticias', '/noticias'),
  m('Preguntas Frecuentes', '/preguntas-frecuentes'),
  m('Contactos', '/contacto', [['Contactos por dependencia', '/contacto/dependencias']]),
  m('Academia', '#', [
    ['Dirección General Académica', '/direccion-general-academica'],
    ['Aseguramiento de la Calidad', '/aseguramiento-calidad'],
    ['Docencia', '/docencia'],
    ['Investigación', '/investigacion'],
    ['Extensión y Vinculación', '/extension'],
    ['Bienestar Institucional', '/bienestar-institucional'],
    ['Revistas Académicas', '/revistas'],
    ['Biblioteca Digital', '/biblioteca'],
    ['Tesis Académicas', '/biblioteca#tesis'], // MENU-CMS-04: lista de tesis de /biblioteca
  ]),
]
