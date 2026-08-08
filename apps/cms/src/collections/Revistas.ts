import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional } from '../access/roles'
import { slugify } from '../utilities/slugify'

export const Revistas: CollectionConfig = {
  slug: 'revistas',
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'anioInicio', 'activa'],
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
        description: 'Generado automáticamente desde el nombre. Puedes editarlo manualmente.',
      },
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: true,
    },
    {
      name: 'anioInicio',
      label: 'Año de Inicio',
      type: 'number',
      required: true,
    },
    {
      name: 'urlOjs',
      label: 'URL en OJS',
      type: 'text',
      required: true,
    },
    {
      name: 'portada',
      label: 'Portada',
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
          data.slug = slugify(data.nombre)
        }
        return data
      },
    ],
    afterChange: [
      async () => {
        await revalidatePortalTag('revistas')
      },
    ],
  },
}
