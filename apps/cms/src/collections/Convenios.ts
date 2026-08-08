import type { CollectionConfig } from 'payload'
import { canWriteInstitutional } from '../access/roles'

const Convenios: CollectionConfig = {
  slug: 'convenios',
  labels: {
    singular: 'Convenio',
    plural: 'Convenios',
  },
  admin: {
    group: 'Relaciones Institucionales',
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'year', 'active'],
  },
  access: {
    read: () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    afterChange: [
      async () => {
        try {
          const baseUrl = process.env.PORTAL_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
          const secret  = process.env.REVALIDATION_SECRET ?? ''
          await fetch(`${baseUrl}/api/revalidate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
            body:    JSON.stringify({ tag: 'convenios' }),
          })
        } catch {
          // revalidation is best-effort
        }
      },
    ],
  },
  fields: [
    {
      name:     'title',
      type:     'text',
      label:    'Denominación',
      required: true,
    },
    {
      name:     'type',
      type:     'select',
      label:    'Tipo',
      required: true,
      index:    true,
      options: [
        { label: 'Nacional',       value: 'nacional' },
        { label: 'Internacional',  value: 'internacional' },
      ],
    },
    {
      name:     'year',
      type:     'number',
      label:    'Año',
      required: true,
      index:    true,
    },
    {
      name:     'parties',
      type:     'textarea',
      label:    'Instituciones / Participantes',
      required: true,
    },
    {
      name:     'objective',
      type:     'textarea',
      label:    'Finalidad del Convenio',
      required: true,
    },
    {
      name:  'signedMonth',
      type:  'text',
      label: 'Fecha de Firma',
    },
    {
      name:  'duration',
      type:  'text',
      label: 'Duración',
    },
    {
      name:  'driveUrl',
      type:  'text',
      label: 'Link del documento',
      admin: {
        description: 'URL de Google Drive del documento PDF. Dejar vacío si no hay documento disponible.',
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

export default Convenios
