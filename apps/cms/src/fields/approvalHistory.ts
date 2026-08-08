import type { ArrayField } from 'payload'

/**
 * Shared approvalHistory field — used by Noticias and Paginas.
 *
 * Stores the editorial approval trail: who reviewed, what action was taken,
 * optional comment, and timestamp. Populated automatically by beforeChange hooks.
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
  admin: {
    description: 'Registro automático de cambios de estado de aprobación.',
    initCollapsed: true,
  },
}
