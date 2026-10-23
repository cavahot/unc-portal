import type { CollectionConfig } from 'payload'
import { logAudit, getClientIP } from '../utilities/audit'
import { revalidatePortalTag } from '../utilities/revalidation'
import { PageBuilderBlocks } from '../blocks'
import { approvalHistoryField, reviewCommentField } from '../fields/approvalHistory'
import { createdByField } from '../fields/createdBy'
import { auditEditorialChange, notifyEditorialChange } from '../hooks/editorial/afterTransition'
import {
  createEnforceEditorialTransition,
  forceDraftSaveUnlessPublisher,
  stripAuthorshipSort,
} from '../hooks/editorial/enforceTransition'
import {
  canCreateEditorial,
  canUpdateEditorial,
  canDeleteEditorial,
  readPublishedOrEditorial,
  canReadEditorialVersions,
} from '../access/roles'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

export const Paginas: CollectionConfig = {
  slug: 'paginas',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'slug', 'approvalStatus'],
  },
  access: {
    // DEP-02: anónimo y roles sin función editorial solo leen publicados.
    read: readPublishedOrEditorial,
    readVersions: canReadEditorialVersions,
    // DEP-03 (SEC-03, punto 2 por confirmar): las páginas siguen el mismo flujo que las noticias;
    // `web-admin` conserva crear/editar páginas institucionales como autor (no aprueba ni publica).
    create: canCreateEditorial('paginas'),
    update: canUpdateEditorial('paginas'),
    delete: canDeleteEditorial,
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
        description: 'Estado del flujo de aprobación editorial. El servidor valida cada cambio según su rol (DEP-03).',
        position: 'sidebar',
      },
    },
    // DEP-03: comentario obligatorio al rechazar (campo virtual: sin columna).
    reviewCommentField,
    // DEP-03: autoría fijada por el servidor (nullable).
    createdByField,
    approvalHistoryField,
  ],
  timestamps: true,
  versions: {
    drafts: true,
  },
  hooks: {
    // DEP-03: quien no publica guarda siempre como borrador (no toca la fila principal).
    beforeOperation: [forceDraftSaveUnlessPublisher, stripAuthorshipSort],
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
    // DEP-03: valida la transición de estado, fija el historial y el estado coherente (servidor).
    beforeChange: [createEnforceEditorialTransition('paginas')],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        // DEP-03: una fila de auditoría por guardado, con la acción de la transición.
        await auditEditorialChange({ collection: 'paginas', operation, doc, previousDoc, req })

        // DEP-03: «aprobada/rechazada/publicada» se avisa al AUTOR, no al actor.
        await notifyEditorialChange({ doc, previousDoc, req })

        const isPublishTransition =
          previousDoc?._status !== doc._status && (doc._status === 'published' || previousDoc?._status === 'published')

        if (isPublishTransition || operation === 'create') {
          await revalidatePortalTag(`paginas:${doc.slug}`)
          await revalidatePortalTag('paginas-slugs')
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
        await revalidatePortalTag('paginas-slugs')
      },
    ],
  },
}
