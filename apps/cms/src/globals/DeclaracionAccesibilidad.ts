// INST-08: contenido de /accesibilidad (Declaración de accesibilidad) editable desde el CMS. Spec: docs/specs/portal/LEGALES.md §2.3.
// Qué hace: guarda en la base de datos la descripción de la cabecera, la lista de características de accesibilidad del portal
// y el correo de contacto para reportar barreras (antes escrito en el código de la página); el portal solo lo lee. La
// descripción y las características son localizadas: un texto por idioma (es, en, pt-BR, gn); el portal usa el español si
// falta uno.
// Amenazas que evita: (1) un correo o un texto fijo que nadie puede corregir sin desplegar; (2) un correo sin forma que
// llegue a un enlace `mailto:` (validación server-side); (3) cambios sin rastro (hook de auditoría); (4) escritura por roles
// sin permiso de global; (5) filas desmedidas que rompan la página (límites).
// Límites: la lectura es pública (es una declaración pública); el CMS no comprueba que cada característica exista en el
// portal, solo la forma del texto.
import type { GlobalConfig } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'

const MAX_TITULO = 120
const MAX_DESCRIPCION = 600
const MAX_CARACTERISTICA = 400
const MAX_CARACTERISTICAS = 20
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i

/** Correo obligatorio y con forma válida: llega a un `mailto:` público, así que no se acepta texto libre. */
function validateCorreo(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) return 'Indique el correo de contacto.'
  if (value.length > 254 || !EMAIL.test(value.trim())) return 'Indique un correo válido (por ejemplo: secgral@unc.edu.py).'
  return true
}

export const DeclaracionAccesibilidad: GlobalConfig = {
  slug: 'declaracion-accesibilidad',
  label: 'Declaración de accesibilidad',
  admin: {
    group: 'Institucional',
    description:
      'Contenido de la página /accesibilidad: descripción, características de accesibilidad y correo para reportar problemas. Cada idioma tiene su propio texto; si falta uno, el portal muestra el español.',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      localized: true,
      required: true,
      maxLength: MAX_DESCRIPCION,
      admin: { description: 'Texto que aparece bajo el título de la página (máximo 600 caracteres).' },
    },
    {
      name: 'caracteristicas',
      label: 'Características de accesibilidad',
      type: 'array',
      localized: true,
      required: true,
      minRows: 1,
      maxRows: MAX_CARACTERISTICAS,
      fields: [
        {
          name: 'titulo',
          label: 'Título',
          type: 'text',
          required: true,
          maxLength: MAX_TITULO,
          admin: { description: 'Ejemplo: «Tamaño de texto ajustable».' },
        },
        {
          name: 'descripcion',
          label: 'Descripción',
          type: 'textarea',
          required: true,
          maxLength: MAX_CARACTERISTICA,
          admin: { description: 'Qué ofrece esta característica (máximo 400 caracteres).' },
        },
      ],
    },
    {
      name: 'correoContacto',
      label: 'Correo de contacto',
      type: 'text',
      required: true,
      validate: validateCorreo,
      admin: { description: 'Correo al que se escribe para reportar un problema de accesibilidad.' },
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('declaracion-accesibilidad')
      },
      makeAuditGlobalAfterChange('declaracion-accesibilidad', 'Declaración de accesibilidad'),
    ],
  },
}
