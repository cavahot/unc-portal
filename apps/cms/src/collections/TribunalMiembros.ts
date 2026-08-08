import type { CollectionConfig } from 'payload'
import { canWriteInstitutional } from '../access/roles'

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
    read:   () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    afterChange: [
      async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
          const secret  = process.env.REVALIDATION_SECRET ?? ''
          await fetch(`${baseUrl}/api/revalidate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
            body:    JSON.stringify({ tag: 'tribunal-miembros' }),
          })
        } catch {
          // revalidation is best-effort
        }
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
      admin: {
        description: 'Número menor aparece primero',
      },
    },
    {
      name:         'active',
      type:         'checkbox',
      label:        'Activo',
      defaultValue: true,
    },
  ],
}

export default TribunalMiembros
