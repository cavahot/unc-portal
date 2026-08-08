import type { GlobalConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canUpdateGlobal } from '../access/roles'

export const EnlacesExternos: GlobalConfig = {
  slug: 'enlaces-externos',
  admin: {
    description: 'Enlaces externos institucionales y contenido de información pública',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
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
