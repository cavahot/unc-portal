import type { Block } from 'payload'

export const Statistics: Block = {
  slug: 'statistics',
  labels: {
    singular: 'Estadísticas',
    plural: 'Bloques de Estadísticas',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: false,
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'icon',
          type: 'text',
          required: false,
          admin: {
            placeholder: 'Nombre de ícono opcional',
          },
        },
      ],
    },
  ],
}
