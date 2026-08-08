import type { CollectionConfig } from 'payload'
import { canWriteInstitutional } from '../access/roles'

const CATEGORIES = [
  { label: 'Ley de Creación',         value: 'ley-creacion' },
  { label: 'Estatuto Universitario',  value: 'estatuto' },
  { label: 'Reglamento General',      value: 'reglamento-general' },
  { label: 'Reglamentos Especiales',  value: 'reglamentos-especiales' },
  { label: 'Códigos Institucionales', value: 'codigos' },
  { label: 'Políticas Institucionales', value: 'politicas' },
  { label: 'Planes Estratégicos',     value: 'planes' },
  { label: 'Manuales',                value: 'manuales' },
  { label: 'Procedimientos',          value: 'procedimientos' },
  { label: 'Protocolos',              value: 'protocolos' },
]

export const MarcoLegal: CollectionConfig = {
  slug: 'marco-legal',
  labels: {
    singular: 'Documento Legal',
    plural: 'Marco Legal',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'order', 'active'],
    group: 'Institucional',
    description: 'Documentos normativos que rigen la vida institucional de la UNC.',
  },
  access: {
    read: () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nombre del documento',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      required: true,
      options: CATEGORIES,
      admin: {
        description: 'Agrupa el documento en la página pública',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descripción (opcional)',
      admin: {
        description: 'Breve descripción del contenido del documento',
      },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      label: 'Archivo (PDF / DOC)',
      admin: {
        description: 'Sube el archivo directamente. Tiene prioridad sobre la URL externa.',
      },
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'URL externa (Google Drive, etc.)',
      admin: {
        description: 'Se usa como enlace de descarga cuando no hay archivo subido.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden de visualización',
      defaultValue: 99,
      admin: {
        description: 'Menor número = aparece primero dentro de su categoría',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: true,
      admin: {
        description: 'Solo los documentos publicados se muestran en el portal',
      },
    },
  ],
}
