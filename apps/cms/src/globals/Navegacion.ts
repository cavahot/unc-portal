import { APIError, type Field, type GlobalConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canUpdateGlobal } from '../access/roles'
import { validateNavegacionLinks, type NavLinkInput } from '../utilities/navegacionValidation'

// MENU-CMS-03: etiqueta de fila con el texto del enlace y sus subenlaces (admin/components/NavegacionRowLabel.tsx).
const ROW_LABEL = { path: './admin/components/NavegacionRowLabel', exportName: 'NavegacionRowLabel' }

function linkFields(depth: 0 | 1): Field[] {
  const fields: Field[] = [
    {
      name: 'label',
      type: 'text',
      label: 'Texto',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      label: 'Tipo de destino',
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
      label: 'Dirección (URL)',
      required: false,
      admin: {
        description: 'Requerido cuando el tipo es "Manual"',
        condition: (_, siblingData) => siblingData?.type === 'manual',
      },
    },
    {
      name: 'page',
      type: 'relationship',
      label: 'Página',
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
      label: 'Abrir en una pestaña nueva',
      defaultValue: false,
    },
  ]

  if (depth === 0) {
    fields.push({
      name: 'children',
      type: 'array',
      labels: { singular: 'Subenlace', plural: 'Subenlaces' },
      admin: { components: { RowLabel: ROW_LABEL } },
      fields: linkFields(1),
      // MENU-CMS-02: 20 y no 12. El menú actual del portal ya tiene 15 subenlaces en «Institucional»; con 12 la siembra
      // (`scripts/seed-navegacion.mjs`) nunca se podía guardar (HTTP 400, prueba de punta a punta del 2026-11-09).
      // Límite de validación, sin cambio de esquema en la base.
      maxRows: 20,
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
      // MENU-CMS-03 (S1): vista del árbol del menú; campo de interfaz, no guarda datos ni cambia el esquema.
      name: 'vistaMenu',
      type: 'ui',
      admin: { components: { Field: { path: './admin/components/NavegacionPreview', exportName: 'NavegacionPreview' } } },
    },
    {
      name: 'links',
      type: 'array',
      labels: { singular: 'Enlace', plural: 'Enlaces del menú' },
      admin: { components: { RowLabel: ROW_LABEL } },
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
