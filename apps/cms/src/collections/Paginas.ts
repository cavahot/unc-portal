import type { CollectionConfig } from 'payload'
import { logAudit, getClientIP, extractChanges } from '../utilities/audit'
import { notifyApprovalStateChange } from '../utilities/notifications'
import { revalidatePortalTag } from '../utilities/revalidation'
import { PageBuilderBlocks } from '../blocks'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

export const Paginas: CollectionConfig = {
  slug: 'paginas',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'slug', 'approvalStatus'],
  },
  access: {
    read: async () => true,
    create: async ({ req }) => !!req.user,
    update: async ({ req }) => !!req.user,
    delete: async ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      minLength: 3,
      maxLength: 150,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Ruta completa sin barra inicial ni final (ej: "institucional/historia"). Solo minúsculas, números y guiones.',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: PageBuilderBlocks,
      required: false,
    },
    {
      name: 'approvalStatus',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'En Revisión', value: 'en_revision' },
        { label: 'Rechazado', value: 'rechazado' },
        { label: 'Aprobado', value: 'aprobado' },
        { label: 'Publicado', value: 'publicado' },
      ],
      index: true,
      admin: {
        description: 'Estado del flujo de aprobación editorial',
        position: 'sidebar',
      },
    },
    {
      name: 'approvalHistory',
      type: 'array',
      fields: [
        {
          name: 'revisor',
          type: 'text',
          required: true,
        },
        {
          name: 'accion',
          type: 'select',
          options: [
            { label: 'Enviado a revisión', value: 'sent_to_review' },
            { label: 'Revisado', value: 'reviewed' },
            { label: 'Aprobado', value: 'approved' },
            { label: 'Rechazado', value: 'rejected' },
          ],
          required: true,
        },
        {
          name: 'comentario',
          type: 'textarea',
          required: false,
        },
        {
          name: 'fecha',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
        },
      ],
      admin: {
        description: 'Historial de aprobaciones y rechazos',
      },
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data

        if (typeof data.slug === 'string') {
          const normalized = data.slug.trim().replace(/^\/+/, '').replace(/\/+$/, '')

          if (!SLUG_PATTERN.test(normalized)) {
            throw new Error(
              'Slug inválido: use solo minúsculas, números, guiones y barras internas, sin barra inicial o final (ej: "institucional/historia").',
            )
          }

          data.slug = normalized
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        const usuario = req.user?.email || 'sistema'
        const rol = req.user?.role || 'system'
        const ip = getClientIP(req)

        let accion: 'crear' | 'actualizar' | 'publicar' = 'crear'
        let cambios = {}

        if (operation === 'update') {
          accion = 'actualizar'
          if (previousDoc?._status === 'draft' && doc._status === 'published') {
            accion = 'publicar'
          }
          cambios = extractChanges(previousDoc || {}, doc)
        }

        await logAudit({
          usuario,
          rol,
          accion,
          coleccion: 'paginas',
          documento: `${doc.title} (ID: ${doc.id})`,
          ip,
          resultado: 'exito',
          mensaje: `Página ${accion === 'crear' ? 'creada' : accion === 'publicar' ? 'publicada' : 'actualizada'}`,
          cambiosRelevantes: Object.keys(cambios).length > 0 ? cambios : undefined,
        })

        if (previousDoc?.approvalStatus !== doc.approvalStatus) {
          await notifyApprovalStateChange(
            doc.id,
            doc.title,
            doc.slug,
            previousDoc?.approvalStatus || 'draft',
            doc.approvalStatus,
            usuario,
            req.user?.email,
            undefined,
            undefined,
          )
        }

        const isPublishTransition =
          previousDoc?._status !== doc._status && (doc._status === 'published' || previousDoc?._status === 'published')

        if (isPublishTransition || operation === 'create') {
          await revalidatePortalTag(`paginas:${doc.slug}`)
          await revalidatePortalTag('paginas:list')
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const usuario = req.user?.email || 'sistema'
        const rol = req.user?.role || 'system'
        const ip = getClientIP(req)

        await logAudit({
          usuario,
          rol,
          accion: 'eliminar',
          coleccion: 'paginas',
          documento: `${doc.title} (ID: ${doc.id})`,
          ip,
          resultado: 'exito',
          mensaje: 'Página eliminada',
        })

        await revalidatePortalTag(`paginas:${doc.slug}`)
        await revalidatePortalTag('paginas:list')
      },
    ],
  },
}
