import type { Block } from 'payload'
import { richTextEditor } from '../fields/richTextEditor'

// BLOQUE-2COL: bloque «Dos columnas» de las páginas. Sus columnas usan el editor común (imágenes y «Video de YouTube»),
// porque el portal ahora las dibuja con el mismo renderizado que el cuerpo de las noticias (components/blocks/TwoColumn.tsx).

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
      editor: richTextEditor,
      required: false,
    },
    {
      name: 'right',
      type: 'richText',
      editor: richTextEditor,
      required: false,
    },
  ],
}
