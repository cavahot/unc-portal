// INST-11: contenido de /legalizaciones editable desde el CMS. Spec: docs/specs/portal/LEGALIZACIONES.md §2.1.
// Qué hace: guarda en la base de datos lo que antes estaba escrito en el código de la página (categorías de documentos con
// sus requisitos, pasos del procedimiento, plazo, dependencia) y enlaza el arancel con la fila que ya existe en
// `aranceles-rectorado`; el portal solo lo lee. Comparte los campos y las validaciones con `titulos-inscripcion`
// (`TRAMITE_FIELDS`), salvo la nota del CONES, que no aplica a una legalización.
// Amenazas que evita: (1) datos fijos que nadie puede corregir sin desplegar; (2) dos fuentes del arancel que divergen (el
// monto NO se guarda aquí); (3) un `acento` libre que inyecte CSS (lista cerrada, heredada); (4) cambios sin rastro (hook de
// auditoría); (5) escritura por roles sin permiso de global.
// Límites: el contenido es solo en español (las demás lenguas traducen la interfaz del portal, como en /titulos); la lectura
// es pública porque el global no contiene datos privados.
import type { Field, GlobalConfig } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { TRAMITE_FIELDS } from './TitulosInscripcion'

/** Los campos del trámite sin la nota del CONES, con los textos de ayuda de las categorías ajustados a legalizaciones. */
const LEGALIZACIONES_FIELDS: Field[] = TRAMITE_FIELDS.filter((f) => !('name' in f) || f.name !== 'notaCones').map((f) => {
  if ('name' in f && f.name === 'tipos') {
    return {
      ...f,
      label: 'Categorías de documentos',
      admin: {
        ...(f as { admin?: object }).admin,
        description: 'Cada categoría (títulos, certificados de estudios, expedientes de ingreso) con los documentos que debe presentar. El orden del panel es el orden en la página.',
      },
    } as Field
  }
  if ('name' in f && f.name === 'arancel') {
    return {
      ...f,
      admin: {
        ...(f as { admin?: object }).admin,
        description: 'Elija la fila «Legalizaciones» de «Aranceles del Rectorado». El monto se toma de allí: no se escribe en esta página.',
      },
    } as Field
  }
  return f
})

export const Legalizaciones: GlobalConfig = {
  slug: 'legalizaciones',
  label: 'Legalizaciones',
  admin: {
    group: 'Trámites',
    description:
      'Contenido de la página /legalizaciones: categorías de documentos y sus requisitos, pasos del procedimiento y plazo. El arancel se toma de «Aranceles del Rectorado».',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: LEGALIZACIONES_FIELDS,
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('legalizaciones')
      },
      makeAuditGlobalAfterChange('legalizaciones', 'Legalizaciones'),
    ],
  },
}
