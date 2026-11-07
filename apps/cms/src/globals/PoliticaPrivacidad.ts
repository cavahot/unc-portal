// INST-08: contenido de /privacidad (Política de privacidad) editable desde el CMS. Spec: docs/specs/portal/LEGALES.md §2.2.
// Qué hace: guarda en la base de datos el texto que antes estaba escrito en los archivos de mensajes del portal (siete
// secciones) y la fecha de la última actualización; el portal solo lo lee. El texto de las secciones es localizado: hay un
// texto por idioma (es, en, pt-BR, gn) y el portal usa el español si falta el de otro idioma.
// Amenazas que evita: (1) un texto legal fijo que nadie puede corregir sin desplegar; (2) cambios sin rastro (hook de
// auditoría); (3) escritura por roles sin permiso de global; (4) filas vacías o desmedidas que rompan la página (límites).
// Límites: la lectura es pública porque el texto de la política es público; el CMS no valida el contenido jurídico, solo su
// forma; la fecha se guarda como día completo y el portal muestra solo mes y año.
import type { GlobalConfig } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'

const MAX_TITULO = 120
const MAX_CONTENIDO = 3000
const MAX_SECCIONES = 20

export const PoliticaPrivacidad: GlobalConfig = {
  slug: 'politica-privacidad',
  label: 'Política de privacidad',
  admin: {
    group: 'Institucional',
    description:
      'Contenido de la página /privacidad: secciones de la política y fecha de la última actualización. Cada idioma tiene su propio texto; si falta uno, el portal muestra el español.',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      name: 'ultimaActualizacion',
      label: 'Última actualización',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
        description: 'Fecha de la última revisión del texto. El portal muestra solo el mes y el año.',
      },
    },
    {
      name: 'secciones',
      label: 'Secciones',
      type: 'array',
      localized: true,
      required: true,
      minRows: 1,
      maxRows: MAX_SECCIONES,
      admin: { description: 'Cada sección tiene un título y un texto. Un salto de línea doble separa párrafos.' },
      fields: [
        {
          name: 'titulo',
          label: 'Título',
          type: 'text',
          required: true,
          maxLength: MAX_TITULO,
          admin: { description: 'Ejemplo: «Responsable del tratamiento».' },
        },
        {
          name: 'contenido',
          label: 'Contenido',
          type: 'textarea',
          required: true,
          maxLength: MAX_CONTENIDO,
          admin: { description: 'Texto de la sección (máximo 3000 caracteres).' },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('politica-privacidad')
      },
      makeAuditGlobalAfterChange('politica-privacidad', 'Política de privacidad'),
    ],
  },
}
