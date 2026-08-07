import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'

export const ArancelesRectorado: CollectionConfig = {
  slug: 'aranceles-rectorado',
  labels: {
    singular: 'Arancel Rectorado',
    plural:   'Aranceles Rectorado',
  },
  admin: {
    useAsTitle:     'concepto',
    defaultColumns: ['concepto', 'grupo', 'monto', 'activo'],
    description:    'Aranceles, multas y servicios cobrados directamente por el Rectorado.',
  },
  access: {
    read:   async () => true,
    create: async ({ req }) => !!req.user,
    update: async ({ req }) => !!req.user,
    delete: async ({ req }) => !!req.user,
  },
  fields: [
    {
      name:     'concepto',
      label:    'Concepto',
      type:     'text',
      required: true,
    },
    {
      name:     'monto',
      label:    'Monto (Gs.)',
      type:     'number',
      required: true,
      admin:    { description: 'Importe en guaraníes. Ej: 50000 para Gs. 50.000' },
    },
    {
      name:         'grupo',
      label:        'Grupo',
      type:         'select',
      required:     true,
      index:        true,
      defaultValue: 'venta',
      options: [
        { label: 'Multas',                   value: 'multas'      },
        { label: 'Venta de bienes y servicios', value: 'venta'    },
        { label: 'Aranceles educativos',     value: 'educativos'  },
      ],
    },
    {
      name:         'orden',
      label:        'Orden de visualización',
      type:         'number',
      defaultValue: 99,
      admin:        { description: 'Menor número aparece primero dentro del grupo.' },
    },
    {
      name:         'activo',
      label:        'Activo',
      type:         'checkbox',
      defaultValue: true,
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('aranceles-rectorado')
      },
    ],
  },
}

export default ArancelesRectorado
