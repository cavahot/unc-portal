/**
 * autoridadesSeedData.mjs — AUT-01
 *
 * Datos de las 8 autoridades que la página /autoridades ya mostraba (lista que estaba escrita a mano en
 * app/[locale]/autoridades/page.tsx y coincidía con el seed anterior). Salen del código para que el CMS sea
 * la única fuente de verdad: después de sembrar, se editan desde el panel.
 *
 * Clave natural: `name` (exacto). Facultad de los decanos: por `slug` (el CMS la resuelve a ID).
 * Límite: los nombres y cargos NO se verificaron contra www.unc.edu.py en esta tarea; el PO debe
 * confirmarlos en el panel. «Roberto Gustavo Barrios» figura con un solo apellido en la fuente original.
 * La página anterior escribía «Ciencias Exactas y Tecnológica»; el CMS usa «Tecnológicas» y es lo que se mostrará.
 */

export const AUTORIDADES = [
  {
    name: 'Prof. Dr. Clarito Rojas Marín',
    role: 'Rector',
    type: 'rector',
    bio: 'Autoridad máxima de la Universidad Nacional de Concepción. Representa a la institución ante organismos nacionales e internacionales.',
    order: 1,
  },
  {
    name: 'Prof. Dr. Arnaldo Miguel Ferreira Cabañas',
    role: 'Vicerrector',
    type: 'vicerrector',
    bio: 'Apoya y complementa la gestión rectoral en la conducción académica e institucional de la universidad.',
    order: 2,
  },
  { name: 'Prof. Dr. Carlos Ramón Lima De León', role: 'Decano', type: 'decano', facultadSlug: 'facultad-de-odontologia', order: 10 },
  { name: 'Prof. Ing. Agr. Derlys Fernando López Avalos', role: 'Decano', type: 'decano', facultadSlug: 'facultad-de-ciencias-agrarias', order: 11 },
  { name: 'Prof. Mg. Gerardo Lang Ferri', role: 'Decano', type: 'decano', facultadSlug: 'facultad-de-ciencias-economicas-y-administrativas', order: 12 },
  { name: 'Prof. Dr. Roberto Gustavo Barrios', role: 'Decano', type: 'decano', facultadSlug: 'facultad-de-medicina', order: 13 },
  { name: 'Prof. Dra. María Concepción Araujo De Benítez', role: 'Decana', type: 'decano', facultadSlug: 'facultad-de-humanidades-y-ciencias-de-la-educacion', order: 14 },
  { name: 'Prof. Dr. Jorge Daniel Mello Román', role: 'Decano', type: 'decano', facultadSlug: 'facultad-de-ciencias-exactas-y-tecnologicas', order: 15 },
]

/**
 * Cuerpo para POST /api/autoridades. `active: true` a propósito: son personas que ya estaban publicadas en
 * el sitio; sembrarlas inactivas dejaría la página vacía. `facultyId` solo se usa en decanos.
 */
export function toCmsPayloadAutoridad(item, facultyId) {
  const { facultadSlug, ...rest } = item
  const body = { ...rest, active: true }
  if (item.type === 'decano' && facultyId !== undefined) body.faculty = facultyId
  return body
}
