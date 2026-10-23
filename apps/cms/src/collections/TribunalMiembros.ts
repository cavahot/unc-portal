import type { CollectionConfig } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { revalidatePortalTag } from '../utilities/revalidation'

const TribunalMiembros: CollectionConfig = {
  slug: 'tribunal-miembros',
  labels: {
    singular: 'Miembro del Tribunal',
    plural:   'Miembros del Tribunal',
  },
  admin: {
    group:          'Tribunal Electoral',
    useAsTitle:     'nombre',
    defaultColumns: ['nombre', 'cargo', 'orden', 'active'],
  },
  access: {
    read:   readActiveOrInstitutional, // SEC-10: público solo lo activo (política provisional)
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    afterChange: [
      // DEP-19b: avisa al portal con el helper común (timeout, reintentos, log sin secretos). Nunca lanza:
      // la publicación del editor no depende del portal. Límite: sin cola; ver utilities/revalidation.ts.
      async () => {
        await revalidatePortalTag('tribunal-miembros', { collection: 'tribunal-miembros' })
      },
    ],
  },
  fields: [
    {
      name:     'nombre',
      type:     'text',
      label:    'Nombre completo',
      required: true,
    },
    {
      name:     'cargo',
      type:     'text',
      label:    'Cargo',
      required: true,
    },
    {
      name:       'foto',
      type:       'upload',
      label:      'Foto',
      relationTo: 'media',
    },
    {
      name:         'orden',
      type:         'number',
      label:        'Orden de aparición',
      defaultValue: 0,
      index:        true,
      admin: {
        description: 'Número menor aparece primero',
      },
    },
    {
      name:         'active',
      type:         'checkbox',
      label:        'Activo',
      defaultValue: true,
      index:        true,
    },
  ],
}

export default TribunalMiembros
