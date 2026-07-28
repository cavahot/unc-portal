import type { Block } from 'payload'

export const Hero: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Heroes',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      maxLength: 150,
    },
    {
      name: 'subheading',
      type: 'textarea',
      required: false,
      maxLength: 300,
    },
    {
      name: 'backgroundImage',
      type: 'relationship',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'ctaLabel',
      type: 'text',
      required: false,
      admin: {
        placeholder: 'Texto del botón',
      },
    },
    {
      name: 'ctaUrl',
      type: 'text',
      required: false,
      admin: {
        placeholder: 'URL o ruta del botón',
      },
    },
  ],
}
