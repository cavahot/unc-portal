import type { CollectionConfig } from 'payload'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getClientIP, logAudit } from '../utilities/audit'
import { approvalHistoryField, reviewCommentField } from '../fields/approvalHistory'
import { createdByField } from '../fields/createdBy'
import { auditEditorialChange, notifyEditorialChange } from '../hooks/editorial/afterTransition'
import {
  createEnforceEditorialTransition,
  forceDraftSaveUnlessPublisher,
  stripAuthorshipSort,
} from '../hooks/editorial/enforceTransition'
import { notifyN8N } from '../utilities/notifications'
import { slugify } from '../utilities/slugify'
import { revalidatePortalTag } from '../utilities/revalidation'
import {
  canCreateEditorial,
  canUpdateEditorial,
  canDeleteEditorial,
  readPublishedOrEditorial,
  canReadEditorialVersions,
} from '../access/roles'

export const Noticias: CollectionConfig = {
  slug: 'noticias',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', '_status', 'category', 'publishedAt'],
  },
  access: {
    // DEP-02: anónimo y roles sin función editorial solo leen publicados.
    read: readPublishedOrEditorial,
    readVersions: canReadEditorialVersions,
    // DEP-03 (SEC-03): solo los autores crean; editan autores, Revisor y Publicador (el hook limita a
    // estos dos últimos a campos de estado). Borrar no cambia (punto por confirmar de SEC-03).
    create: canCreateEditorial('noticias'),
    update: canUpdateEditorial('noticias'),
    delete: canDeleteEditorial,
  },
  fields: [
    // ── Sidebar fields (always visible) ───────────────────────────────────────
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
        description: 'Estado del flujo de aprobación editorial. El servidor valida cada cambio según su rol (DEP-03).',
        position: 'sidebar',
      },
    },
    // DEP-03: comentario obligatorio al rechazar (campo virtual: sin columna).
    reviewCommentField,
    {
      name: 'featured',
      label: '¿Destacar en portada?',
      type: 'checkbox',
      defaultValue: false,
      // PERF-DB: la portada filtra por featured=true; índice para no recorrer toda la tabla (migración perf_db_indexes).
      index: true,
      admin: {
        description: 'Mostrar en la sección destacada del portal',
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      label: 'Fecha de publicación',
      type: 'date',
      required: false,
      index: true,
      admin: {
        position: 'sidebar',
      },
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
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'faculty',
      label: 'Facultad',
      type: 'relationship',
      relationTo: 'facultades',
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Facultad responsable de la noticia (opcional)',
      },
    },
    {
      name: 'author',
      label: 'Autor',
      type: 'text',
      required: false,
      admin: {
        placeholder: 'Nombre del autor',
        position: 'sidebar',
      },
    },
    // DEP-03: autoría fijada por el servidor (nullable; las noticias heredadas no la tienen).
    createdByField,
    // ── Tabs (main body) ──────────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        // ── Tab 1: Contenido ────────────────────────────────────────────────
        {
          label: 'Contenido',
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
                description: 'Generado automáticamente desde el título. Podés editarlo manualmente.',
              },
            },
            {
              name: 'summary',
              label: 'Copete / Resumen',
              type: 'textarea',
              required: true,
              minLength: 20,
              maxLength: 300,
              admin: {
                description: 'Aparece debajo del título en el listado y como subtítulo en el detalle. Máximo 300 caracteres.',
              },
            },
            {
              name: 'content',
              label: 'Cuerpo de la noticia',
              type: 'richText',
              required: true,
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
              maxRows: 15,
              admin: {
                description: 'Palabras clave para búsqueda y filtrado.',
              },
            },
          ],
        },
        // ── Tab 2: Imágenes ─────────────────────────────────────────────────
        {
          label: '📷 Imágenes',
          fields: [
            {
              name: 'featuredImage',
              label: 'Imagen destacada',
              type: 'relationship',
              relationTo: 'media',
              required: false,
              admin: {
                description:
                  'Imagen principal de la noticia. Aparece en el hero del artículo y como primera foto del carrusel al pie de página. Recomendado: 1280×720 px o superior.',
              },
            },
            {
              name: 'featuredImageUrl',
              label: 'URL imagen destacada (externa)',
              type: 'text',
              required: false,
              admin: {
                description:
                  'Alternativa cuando la imagen no está en Media (ej: migradas de WordPress). Si existe "Imagen destacada" de Media, ese campo tiene prioridad.',
              },
            },
            {
              name: 'gallery',
              label: 'Carrusel de fotos',
              type: 'array',
              fields: [
                {
                  name: 'image',
                  label: 'Foto',
                  type: 'relationship',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'caption',
                  label: 'Epígrafe (pie de foto)',
                  type: 'text',
                  required: false,
                  admin: {
                    placeholder: 'Descripción breve que aparece en el carrusel',
                  },
                },
              ],
              maxRows: 30,
              admin: {
                description:
                  'Fotos adicionales de la noticia. Junto con la imagen destacada, forman el carrusel interactivo que aparece al final del artículo. Podés agregar hasta 30 fotos.',
                initCollapsed: false,
              },
            },
          ],
        },
        // ── Tab 3: Historial editorial ──────────────────────────────────────
        {
          label: 'Historial editorial',
          fields: [
            approvalHistoryField,
          ],
        },
      ],
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    // PERF-DB: Payload guarda 100 versiones completas (JSON Lexical) por documento por defecto;
    // se acota a 10 para que el almacenamiento no crezca sin tope. Límite: versiones antiguas se descartan.
    maxPerDoc: 10,
  },
  hooks: {
    // DEP-03: quien no publica guarda siempre como borrador (no toca la fila principal).
    beforeOperation: [forceDraftSaveUnlessPublisher, stripAuthorshipSort],
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          data.slug = slugify(data.title)
        }
        return data
      },
    ],
    // DEP-03: valida la transición de estado, fija el historial y el estado coherente (servidor).
    beforeChange: [createEnforceEditorialTransition('noticias')],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        // Revalidate portal cache on every change so featured/published state
        // is reflected immediately without waiting for ISR expiry.
        await revalidatePortalTag('noticias')
        // PERF-DB: la lista de slugs y el detalle cacheados por slug también deben invalidarse; antes
        // solo se invalidaba la lista y el detalle quedaba viejo hasta vencer el ISR.
        await revalidatePortalTag('noticias-slugs')
        await revalidatePortalTag(`noticias:${doc.slug}`)

        const usuario = req.user?.email || 'sistema'

        // DEP-03: una fila de auditoría por guardado, con la acción de la transición.
        await auditEditorialChange({ collection: 'noticias', operation, doc, previousDoc, req })

        // DEP-03: «aprobada/rechazada/publicada» se avisa al AUTOR, no al actor.
        await notifyEditorialChange({ doc, previousDoc, req })

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

        // PERF-DB: una noticia eliminada debe desaparecer de listas, slugs y detalle cacheados.
        await revalidatePortalTag('noticias')
        await revalidatePortalTag('noticias-slugs')
        await revalidatePortalTag(`noticias:${doc.slug}`)
      },
    ],
  },
}
