import type { CollectionConfig } from 'payload'
import { getPayload } from 'payload'
import config from '../payload.config'
import { logAudit, getClientIP, extractChanges } from '../utilities/audit'
import { notifyApprovalStateChange } from '../utilities/notifications'
import { notifyN8N } from '../utilities/notifications'

export const Noticias: CollectionConfig = {
  slug: 'noticias',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'category', 'publishedAt', 'createdBy'],
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
      label: 'Título',
      type: 'text',
      required: true,
      minLength: 5,
      maxLength: 150,
    },
    {
      name: 'slug',
      label: 'Slug (URL)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Generado automáticamente desde el título. Puedes editarlo manualmente.',
      },
    },
    {
      name: 'summary',
      label: 'Resumen',
      type: 'textarea',
      required: true,
      minLength: 20,
      maxLength: 300,
    },
    {
      name: 'content',
      label: 'Contenido',
      type: 'richText',
      required: true,
    },
    {
      name: 'featuredImage',
      label: 'Imagen destacada',
      type: 'relationship',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'featuredImageUrl',
      label: 'URL imagen destacada (externa)',
      type: 'text',
      required: false,
      admin: {
        description: 'URL directa de imagen cuando no hay archivo en Media (ej: imágenes migradas de WordPress).',
      },
    },
    {
      name: 'gallery',
      label: 'Galería de imágenes',
      type: 'array',
      fields: [
        {
          name: 'image',
          label: 'Imagen',
          type: 'relationship',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          label: 'Epígrafe',
          type: 'text',
          required: false,
        },
      ],
      maxRows: 10,
    },
    {
      name: 'category',
      label: 'Categoría',
      type: 'select',
      options: [
        { label: 'Institucional', value: 'institucional' },
        { label: 'Académica', value: 'academica' },
        { label: 'Investigación', value: 'investigacion' },
        { label: 'Extensión', value: 'extension' },
        { label: 'Eventos', value: 'eventos' },
        { label: 'Comunicados', value: 'comunicados' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'tags',
      label: 'Etiquetas',
      type: 'array',
      fields: [
        {
          name: 'tag',
          label: 'Etiqueta',
          type: 'text',
          required: true,
        },
      ],
      maxRows: 10,
    },
    {
      name: 'faculty',
      label: 'Facultad',
      type: 'text',
      required: false,
      admin: {
        placeholder: 'Facultad responsable',
      },
    },
    {
      name: 'author',
      label: 'Autor',
      type: 'text',
      required: false,
      admin: {
        placeholder: 'Autor de la noticia',
      },
    },
    {
      name: 'featured',
      label: '¿Destacar en portada?',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mostrar en la sección destacada del portal',
      },
    },
    {
      name: 'publishedAt',
      label: 'Fecha de publicación',
      type: 'date',
      required: false,
      index: true,
    },
    {
      name: 'approvalStatus',
      label: 'Estado editorial',
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
      label: 'Historial de aprobaciones',
      type: 'array',
      fields: [
        {
          name: 'revisor',
          label: 'Revisor',
          type: 'text',
          required: true,
        },
        {
          name: 'accion',
          label: 'Acción',
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
          label: 'Comentario',
          type: 'textarea',
          required: false,
        },
        {
          name: 'fecha',
          label: 'Fecha',
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
        if (data && !data.slug && data.title) {
          data.slug = data.title
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
      async ({ doc, previousDoc, req, operation }) => {
        const usuario = req.user?.email || 'sistema'
        const rol = req.user?.role || 'system'
        const ip = getClientIP(req)

        let accion: 'crear' | 'actualizar' | 'publicar' = 'crear'
        let cambios = {}

        if (operation === 'update') {
          accion = 'actualizar'
          if (previousDoc._status === 'draft' && doc._status === 'published') {
            accion = 'publicar'
          }
          cambios = extractChanges(previousDoc || {}, doc)
        }

        await logAudit({
          usuario,
          rol,
          accion,
          coleccion: 'noticias',
          documento: `${doc.title} (ID: ${doc.id})`,
          ip,
          resultado: 'exito',
          mensaje: `Noticia ${accion === 'crear' ? 'creada' : accion === 'publicar' ? 'publicada' : 'actualizada'}`,
          cambiosRelevantes: Object.keys(cambios).length > 0 ? cambios : undefined,
        })

        // Notificar cambios de estado de aprobación
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
            undefined
          )
        }

        // Obtener datos de contacto del usuario actual
        const payload = await getPayload({ config })
        const userEmail = req.user?.email || usuario
        const currentUser = req.user?.id ? await payload.findByID({
          collection: 'users',
          id: req.user.id as string | number,
        }) : null

        // Notificar a N8N cuando se crea una noticia o se envía a revisión
        if (operation === 'create') {
          await notifyN8N({
            type: 'noticia_creada',
            noticiaId: doc.id,
            noticiaTitulo: doc.title,
            noticiaSlug: doc.slug,
            usuarioEmail: usuario,
            usuarioNombre: req.user?.email,
            revisorTelefono: (currentUser as any)?.telefono as string | undefined,
            revisorTelegramId: (currentUser as any)?.telegramUserId as string | undefined,
          })
        } else if (previousDoc?.approvalStatus !== doc.approvalStatus && doc.approvalStatus === 'en_revision') {
          await notifyN8N({
            type: 'envio_revision',
            noticiaId: doc.id,
            noticiaTitulo: doc.title,
            noticiaSlug: doc.slug,
            usuarioEmail: usuario,
            usuarioNombre: req.user?.email,
            revisorTelefono: (currentUser as any)?.telefono as string | undefined,
            revisorTelegramId: (currentUser as any)?.telegramUserId as string | undefined,
          })
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
          coleccion: 'noticias',
          documento: `${doc.title} (ID: ${doc.id})`,
          ip,
          resultado: 'exito',
          mensaje: 'Noticia eliminada',
        })
      },
    ],
  },
}
