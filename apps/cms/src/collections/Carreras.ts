import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional } from '../access/roles'

export const Carreras: CollectionConfig = {
  slug: 'carreras',
  labels: {
    singular: 'Carrera',
    plural: 'Carreras',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'facultad', 'duracion', 'modalidad', 'activa'],
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
      name: 'facultad',
      label: 'Facultad',
      type: 'relationship',
      relationTo: 'facultades',
      required: true,
      hasMany: false,
    },
    {
      name: 'duracion',
      label: 'Duración (años)',
      type: 'number',
      required: true,
    },
    {
      name: 'titulo',
      label: 'Título otorgado',
      type: 'text',
      required: true,
    },
    {
      name: 'modalidad',
      label: 'Modalidad',
      type: 'select',
      options: [
        { label: 'Presencial', value: 'Presencial' },
        { label: 'Semipresencial', value: 'Semipresencial' },
        { label: 'Virtual', value: 'Virtual' },
      ],
      defaultValue: 'Presencial',
      required: false,
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: false,
    },
    {
      name: 'resolucion',
      label: 'Resolución de acreditación',
      type: 'text',
      required: false,
    },
    {
      name:         'tipo',
      label:        'Tipo',
      type:         'select',
      index:        true,
      defaultValue: 'grado',
      options: [
        { label: 'Pregrado / Grado', value: 'grado'    },
        { label: 'Posgrado',         value: 'posgrado' },
      ],
    },
    {
      name:  'sede',
      label: 'Sede o Filial',
      type:  'text',
      admin: { description: 'Ej: Central/Concepción' },
    },
    {
      name:         'activa',
      label:        'Activa',
      type:         'checkbox',
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
        await revalidatePortalTag('carreras')
      },
    ],
  },
}

export default Carreras
