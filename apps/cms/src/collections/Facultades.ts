import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional } from '../access/roles'

export const Facultades: CollectionConfig = {
  slug: 'facultades',
  labels: {
    singular: 'Facultad',
    plural: 'Facultades',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'decano', 'email', 'activa'],
  },
  access: {
    read: () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug (URL)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Generado automáticamente desde el nombre.',
      },
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: false,
    },
    {
      name: 'decano',
      label: 'Decano/a',
      type: 'text',
      required: false,
    },
    {
      name: 'email',
      label: 'Correo electrónico',
      type: 'email',
      required: false,
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      type: 'text',
      required: false,
    },
    {
      name: 'imagen',
      label: 'Imagen',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'activa',
      label: 'Activa',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.nombre) {
          data.slug = data.nombre
            .toString()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
        return data
      },
    ],
    afterChange: [
      async () => {
        await revalidatePortalTag('facultades')
      },
    ],
  },
}

export default Facultades
