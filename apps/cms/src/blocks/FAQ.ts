import type { Block } from 'payload'

export const FAQ: Block = {
  slug: 'faq',
  labels: {
    singular: 'Preguntas Frecuentes',
    plural: 'Bloques de Preguntas Frecuentes',
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
      maxRows: 20,
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
}
