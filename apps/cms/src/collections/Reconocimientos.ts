import type { CollectionConfig } from 'payload'

import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateHttpsUrl, validateReconocimientoLogoPath } from '../utilities/validators'

/**
 * PRA-01 (fase CMS): premios y reconocimientos que ha recibido la UNC (p. ej. Premio Nacional a la
 * Calidad y Excelencia en la Gestión, de CONACYT), con una fila por premio y un historial de ediciones.
 * Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §3.2 y §11 | Evidencia: docs/research/evidence-register-premios.md.
 *
 * Regla rectora: nada se muestra al público sin fuente citada y confirmada. Por eso `active` y
 * `verificado` nacen en `false` y cada edición exige `fuenteUrl`.
 * Acceso (SEC-10): el público solo lee filas `active = true`; escriben superadmin y web-admin
 * (`canWriteInstitutional`). No se crean permisos nuevos. Límite: esta fase no cambia la portada.
 */
export const Reconocimientos: CollectionConfig = {
  slug: 'reconocimientos',
  labels: {
    singular: 'Reconocimiento',
    plural: 'Reconocimientos',
  },
  defaultSort: 'orden',
  admin: {
    group: 'Premios y acreditaciones',
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'entidad', 'orden', 'active', 'verificado'],
    description:
      'Premios y reconocimientos otorgados a la UNC. Cada edición necesita una fuente (URL oficial). Nada se publica hasta marcar «Activo».',
  },
  access: {
    read: readActiveOrInstitutional, // SEC-10: el público solo ve lo activo
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    afterChange: [
      // Auditoría (quién creó o cambió qué) y aviso al portal; ninguno lanza ni bloquea al editor.
      makeAuditAfterChange('reconocimientos', 'Reconocimiento'),
      async ({ doc }) => {
        await revalidatePortalTag('reconocimientos', { collection: 'reconocimientos' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('reconocimientos', 'Reconocimiento'),
      async ({ doc }) => {
        await revalidatePortalTag('reconocimientos', { collection: 'reconocimientos' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'nombre',
      label: 'Nombre del premio o reconocimiento',
      type: 'text',
      required: true,
      admin: { description: 'Ej.: Premio Nacional a la Calidad y Excelencia en la Gestión.' },
    },
    {
      name: 'entidad',
      label: 'Entidad otorgante',
      type: 'text',
      required: true,
      admin: { description: 'Quién entrega el premio. Ej.: CONACYT.' },
    },
    {
      name: 'sitioOficial',
      label: 'Sitio oficial (opcional)',
      type: 'text',
      validate: (value: unknown) => validateHttpsUrl(value),
      admin: { description: 'Enlace público al sitio del premio. Solo se permite https://.' },
    },
    {
      name: 'logoPath',
      label: 'Ruta del logo (archivo del proyecto)',
      type: 'text',
      validate: validateReconocimientoLogoPath,
      admin: {
        description:
          'Archivo versionado en el proyecto: /images/reconocimientos/<archivo>.png|jpg|webp. Sin subcarpetas ni enlaces externos. Se usa si no hay un logo subido abajo.',
      },
    },
    {
      name: 'logo',
      label: 'Logo (archivo subido)',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: { description: 'Opcional. Si se sube un archivo, tiene prioridad sobre la ruta del logo.' },
    },
    {
      name: 'logoAlt',
      label: 'Texto alternativo del logo',
      type: 'text',
      admin: { description: 'Descripción breve del logo para lectores de pantalla. Ej.: Logo del Premio Nacional a la Calidad.' },
    },
    {
      name: 'nota',
      label: 'Nota interna',
      type: 'textarea',
      admin: {
        description:
          'Origen y permiso de uso del logo, datos que faltan confirmar y otras aclaraciones. No se muestra al público.',
      },
    },
    {
      name: 'ediciones',
      label: 'Ediciones en que la UNC fue distinguida',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Edición', plural: 'Ediciones' },
      admin: { description: 'Una fila por año. Cada edición lleva su fuente; no se inventan años ni distinciones.' },
      fields: [
        {
          name: 'anio',
          label: 'Año de la edición',
          type: 'number',
          required: true,
          min: 1990,
          max: 2100,
        },
        {
          name: 'distincion',
          label: 'Distinción recibida',
          type: 'select',
          required: true,
          options: [
            { label: 'Premio', value: 'premio' },
            { label: 'Premio por categoría', value: 'premio-categoria' },
            { label: 'Mención especial', value: 'mencion-especial' },
            { label: 'Reconocimiento', value: 'reconocimiento' },
            { label: 'Por confirmar', value: 'por-confirmar' },
          ],
          admin: { description: '«Por confirmar» si la fuente no dice el nombre exacto de la distinción.' },
        },
        {
          name: 'categoria',
          label: 'Categoría',
          type: 'text',
          admin: { description: 'Ej.: Pública Grande; Sector Público.' },
        },
        {
          name: 'fuenteUrl',
          label: 'Fuente (URL oficial)',
          type: 'text',
          required: true,
          validate: (value: unknown) => validateHttpsUrl(value, { required: true }),
          admin: { description: 'Obligatoria. Página oficial que respalda esta edición (https://).' },
        },
        {
          name: 'nota',
          label: 'Nota interna',
          type: 'textarea',
          admin: { description: 'Aclaraciones para quien revisa: qué falta confirmar, otras fuentes, etc.' },
        },
        {
          name: 'verificado',
          label: 'Edición verificada',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Marcar solo cuando alguien comprobó que el año, la distinción y la categoría coinciden con la fuente citada.',
          },
        },
      ],
    },
    {
      name: 'orden',
      label: 'Orden de aparición',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: { description: 'Menor número = aparece primero.' },
    },
    {
      name: 'active',
      label: 'Activo (visible al público)',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Si está desmarcado, el público no puede leer este premio. Actívelo solo después de verificar los datos.',
      },
    },
    {
      name: 'verificado',
      label: 'Datos y logo verificados',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Marcar solo cuando una persona comprobó contra la fuente citada el nombre del premio, la entidad y el logo (y que se puede usar). «Verificado» no publica nada por sí solo: la publicación la controla «Activo».',
      },
    },
  ],
}

export default Reconocimientos
