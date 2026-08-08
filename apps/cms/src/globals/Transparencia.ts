import type { GlobalConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canUpdateGlobal } from '../access/roles'

export const Transparencia: GlobalConfig = {
  slug: 'transparencia',
  admin: {
    description: 'Documentos de transparencia institucional (Ley 5189 y Ley 5282)',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      name: 'ley5189',
      label: 'Documentos Ley 5189',
      type: 'array',
      maxRows: 20,
      fields: [
        {
          name: 'label',
          label: 'Etiqueta',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          label: 'URL',
          type: 'text',
          required: false,
        },
        {
          name: 'nota',
          label: 'Nota',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      name: 'ley5282',
      label: 'Documentos Ley 5282',
      type: 'array',
      maxRows: 30,
      fields: [
        {
          name: 'label',
          label: 'Etiqueta',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          label: 'URL',
          type: 'text',
          required: false,
        },
        {
          name: 'nota',
          label: 'Nota',
          type: 'text',
          required: false,
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('transparencia')
      },
    ],
  },
}
