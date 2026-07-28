import type { Block } from 'payload'

export const CTA: Block = {
  slug: 'cta',
  labels: {
    singular: 'Llamado a la Acción',
    plural: 'Bloques de Llamado a la Acción',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      maxLength: 150,
    },
    {
      name: 'text',
      type: 'textarea',
      required: false,
      maxLength: 300,
    },
    {
      name: 'buttonLabel',
      type: 'text',
      required: true,
    },
    {
      name: 'buttonUrl',
      type: 'text',
      required: true,
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'primary',
      options: [
        { label: 'Primario', value: 'primary' },
        { label: 'Secundario', value: 'secondary' },
        { label: 'Contorno', value: 'outline' },
      ],
    },
  ],
}
