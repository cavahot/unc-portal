import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional } from '../access/roles'

export const Tesis: CollectionConfig = {
  slug: 'tesis',
  labels: {
    singular: 'Tesis Académica',
    plural: 'Tesis Académicas',
  },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'autor', 'anio', 'facultad'],
  },
  access: {
    read: () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'titulo',
      label: 'Título',
      type: 'text',
      required: true,
    },
    {
      name: 'autor',
      label: 'Autor',
      type: 'text',
      required: true,
    },
    {
      name: 'anio',
      label: 'Año',
      type: 'number',
      required: true,
    },
    {
      name: 'resumen',
      label: 'Resumen',
      type: 'textarea',
      required: false,
    },
    {
      name: 'facultad',
      label: 'Facultad',
      type: 'relationship',
      relationTo: 'facultades',
      required: true,
    },
    {
      name: 'urlPdf',
      label: 'URL del PDF',
      type: 'text',
      required: true,
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('tesis')
      },
    ],
  },
}
