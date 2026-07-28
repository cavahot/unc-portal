import type { Field, GlobalConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'

function linkFields(depth: 0 | 1): Field[] {
  const fields: Field[] = [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Manual (URL)', value: 'manual' },
        { label: 'Relación (Página)', value: 'relationship' },
      ],
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      required: false,
      admin: {
        description: 'Requerido cuando el tipo es "Manual"',
        condition: (_, siblingData) => siblingData?.type === 'manual',
      },
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'paginas',
      required: false,
      admin: {
        description: 'Requerido cuando el tipo es "Relación"',
        condition: (_, siblingData) => siblingData?.type === 'relationship',
      },
    },
    {
      name: 'newTab',
      type: 'checkbox',
      defaultValue: false,
    },
  ]

  if (depth === 0) {
    fields.push({
      name: 'children',
      type: 'array',
      fields: linkFields(1),
      maxRows: 12,
    })
  }

  return fields
}

export const Navegacion: GlobalConfig = {
  slug: 'navegacion',
  admin: {
    description: 'Estructura de navegación principal del portal (hasta 2 niveles)',
  },
  access: {
    read: async () => true,
    update: async ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'links',
      type: 'array',
      fields: linkFields(0),
      maxRows: 12,
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('navegacion')
      },
    ],
  },
}
