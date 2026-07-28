import type { Block } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const RichText: Block = {
  slug: 'richText',
  labels: {
    singular: 'Contenido Enriquecido',
    plural: 'Bloques de Contenido Enriquecido',
  },
  fields: [
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor(),
      required: true,
    },
  ],
}
