import type { GlobalConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { revalidatePortalTag } from '../utilities/revalidation'

export const EnlacesExternos: GlobalConfig = {
  slug: 'enlaces-externos',
  admin: {
    description: 'Enlaces externos institucionales y contenido de información pública',
  },
  access: {
    read: async () => true,
    update: async ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'formularioTitulos',
      label: 'URL Formulario de Títulos',
      type: 'text',
    },
    {
      name: 'urlPortalInfoPublica',
      label: 'URL Portal de Información Pública',
      type: 'text',
    },
    {
      name: 'contenidoInfoPublica',
      label: 'Contenido de Información Pública',
      type: 'richText',
      editor: lexicalEditor(),
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('enlaces-externos')
      },
    ],
  },
}
