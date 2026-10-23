import type { ArrayField, TextareaField } from 'payload'

import { EDITORIAL_REVIEWER_ROLES, hasRole } from '../access/roles'

/**
 * Shared approvalHistory field — used by Noticias and Paginas.
 *
 * Stores the editorial approval trail: who reviewed, what action was taken,
 * optional comment, and timestamp. Populated automatically by beforeChange hooks.
 *
 * DEP-03: solo el servidor escribe el historial. `access.create/update = false` hace que Payload
 * elimine el valor enviado por el cliente antes de los hooks de colección
 * (`payload/dist/fields/hooks/beforeValidate/promise.js:217-228`); además el hook
 * `createEnforceEditorialTransition` lo reconstruye siempre desde el documento original, así que
 * ni siquiera una llamada con `overrideAccess` puede falsificarlo. Amenaza: historial de aprobaciones
 * inventado (p. ej. un «aprobado» atribuido a otra persona). Límite: no impide el acceso directo a la
 * base de datos ni una migración; la lectura sigue la del documento.
 */
export const approvalHistoryField: ArrayField = {
  name: 'approvalHistory',
  label: 'Historial de aprobaciones',
  type: 'array',
  fields: [
    {
      name: 'revisor',
      label: 'Revisor',
      type: 'text',
      required: true,
    },
    {
      name: 'accion',
      label: 'Acción',
      type: 'select',
      options: [
        { label: 'Enviado a revisión', value: 'sent_to_review' },
        { label: 'Revisado',           value: 'reviewed' },
        { label: 'Aprobado',           value: 'approved' },
        { label: 'Rechazado',          value: 'rejected' },
      ],
      required: true,
    },
    {
      name: 'comentario',
      label: 'Comentario',
      type: 'textarea',
      required: false,
    },
    {
      name: 'fecha',
      label: 'Fecha',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
  ],
  access: {
    create: () => false,
    update: () => false,
  },
  admin: {
    description: 'Registro automático de cambios de estado de aprobación.',
    initCollapsed: true,
    readOnly: true,
  },
}

/**
 * DEP-03: comentario del rechazo. Campo `virtual: true`: no tiene columna (no cambia el esquema,
 * `@payloadcms/drizzle/dist/schema/traverseFields.js:35-37`); viaja en la petición, el hook
 * `beforeChange` lo exige no vacío al rechazar, lo copia a la entrada del historial y lo descarta.
 * Amenaza: rechazos sin motivo, o que cualquiera deje comentarios con apariencia de revisión.
 * Límite: solo el Revisor puede escribirlo (access.update); un valor enviado por otro rol se elimina.
 * `admin.readOnly: false` es necesario porque Payload marca los campos virtuales como solo lectura.
 */
export const reviewCommentField: TextareaField = {
  name: 'reviewComment',
  label: 'Comentario de rechazo',
  type: 'textarea',
  virtual: true,
  required: false,
  access: {
    create: () => false,
    update: ({ req }) => hasRole(req.user, EDITORIAL_REVIEWER_ROLES),
  },
  admin: {
    description: 'Obligatorio al rechazar: explique qué debe corregir el autor. No se guarda como campo; queda en el historial.',
    position: 'sidebar',
    readOnly: false,
    condition: (data) => data?.approvalStatus === 'rechazado',
  },
}
