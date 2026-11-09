import { APIError, type Field, type GlobalConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canUpdateGlobal } from '../access/roles'
import { validateNavegacionLinks, type NavLinkInput } from '../utilities/navegacionValidation'

function linkFields(depth: 0 | 1): Field[] {
  const fields: Field[] = [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Manual (URL)', value: 'manual' },
        { label: 'Relación (Página)', value: 'relationship' },
      ],
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      required: false,
      admin: {
        description: 'Requerido cuando el tipo es "Manual"',
        condition: (_, siblingData) => siblingData?.type === 'manual',
      },
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'paginas',
      required: false,
      admin: {
        description: 'Requerido cuando el tipo es "Relación"',
        condition: (_, siblingData) => siblingData?.type === 'relationship',
      },
    },
    {
      name: 'newTab',
      type: 'checkbox',
      defaultValue: false,
    },
  ]

  if (depth === 0) {
    fields.push({
      name: 'children',
      type: 'array',
      fields: linkFields(1),
      maxRows: 12,
    })
  }

  return fields
}

export const Navegacion: GlobalConfig = {
  slug: 'navegacion',
  admin: {
    description: 'Estructura de navegación principal del portal (hasta 2 niveles)',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      name: 'links',
      type: 'array',
      fields: linkFields(0),
      maxRows: 12,
    },
  ],
  hooks: {
    // MENU-CMS-01: rechaza enlaces «Relación» sin página, a páginas inexistentes o sin publicar (amenaza: menú público con
    // enlaces muertos). Usa la API local con `overrideAccess` para ver también borradores: el editor necesita el aviso.
    beforeValidate: [
      async ({ data, req }) => {
        const result = await validateNavegacionLinks(data?.links as NavLinkInput[] | undefined, async (id) => {
          try {
            const page = await req.payload.findByID({
              collection: 'paginas',
              id,
              depth: 0,
              draft: false,
              overrideAccess: true,
            })
            return page as { _status?: string | null }
          } catch {
            return null
          }
        })
        // APIError público (400): con un `Error` común Payload responde 500 «Something went wrong» y el editor no vería el motivo.
        if (result !== true) throw new APIError(result, 400, undefined, true)
        return data
      },
    ],
    afterChange: [
      async () => {
        await revalidatePortalTag('navegacion')
      },
    ],
  },
}
