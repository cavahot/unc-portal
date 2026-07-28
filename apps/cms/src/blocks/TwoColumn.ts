import type { Block } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const TwoColumn: Block = {
  slug: 'twoColumn',
  labels: {
    singular: 'Dos Columnas',
    plural: 'Bloques de Dos Columnas',
  },
  fields: [
    {
      name: 'ratio',
      type: 'select',
      defaultValue: '50-50',
      options: [
        { label: '50 / 50', value: '50-50' },
        { label: '60 / 40', value: '60-40' },
        { label: '40 / 60', value: '40-60' },
      ],
    },
    {
      name: 'left',
      type: 'richText',
      editor: lexicalEditor(),
      required: false,
    },
    {
      name: 'right',
      type: 'richText',
      editor: lexicalEditor(),
      required: false,
    },
  ],
}
