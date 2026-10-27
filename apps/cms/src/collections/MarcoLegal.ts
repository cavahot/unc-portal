import type { CollectionConfig } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateAllowedHostUrl } from '../utilities/validators'

// MLG-01: documentos normativos de la página pública /marco-legal (spec docs/specs/portal/MARCO-LEGAL.md).

/** Mismo orden que `CATEGORY_ORDER` del portal (lib/cms/marcoLegal.ts); lo comprueba un test. */
const CATEGORIES = [
  { label: 'Ley de creación', value: 'ley-creacion' },
  { label: 'Estatuto universitario', value: 'estatuto' },
  { label: 'Reglamento General', value: 'reglamento-general' },
  { label: 'Reglamentos especiales', value: 'reglamentos-especiales' },
  { label: 'Códigos institucionales', value: 'codigos' },
  { label: 'Políticas institucionales', value: 'politicas' },
  { label: 'Planes', value: 'planes' },
  { label: 'Manuales', value: 'manuales' },
  { label: 'Procedimientos', value: 'procedimientos' },
  { label: 'Protocolos', value: 'protocolos' },
]

/**
 * Hosts desde los que se puede enlazar un documento (igual a `ALLOWED_DOCUMENT_HOSTS` del portal).
 * Por qué una allowlist: hoy los 44 documentos viven en Google Drive y en el sitio de la UNC; cualquier otro
 * dominio es un error de pegado o un intento de enlazar contenido ajeno con la marca institucional.
 */
export const MARCO_LEGAL_ALLOWED_HOSTS = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py'] as const

/** Largo máximo de la nota pública: es una aclaración, no un texto largo. */
const MAX_NOTA = 280

/**
 * Valida `externalUrl` y la regla de fila «archivo o URL».
 * Qué hace: si hay URL, debe ser https a un host permitido; si no hay URL, debe haber `file`.
 * Por qué aquí: Payload no tiene validación a nivel de documento; el campo hermano llega en `siblingData`.
 * Límite: no comprueba que el archivo de Drive exista ni que sea público.
 */
function validateExternalUrl(value: unknown, options?: unknown): true | string {
  const sibling = (options as { siblingData?: { file?: unknown } } | undefined)?.siblingData
  const hasFile = sibling?.file !== undefined && sibling?.file !== null && sibling?.file !== ''
  if ((value === undefined || value === null || value === '') && !hasFile) {
    return 'Suba un archivo o indique una URL externa: el documento necesita un enlace de descarga.'
  }
  return validateAllowedHostUrl(value, { allowedHosts: MARCO_LEGAL_ALLOWED_HOSTS })
}

export const MarcoLegal: CollectionConfig = {
  slug: 'marco-legal',
  labels: {
    singular: 'Documento del marco legal',
    plural: 'Marco legal',
  },
  // Lista del panel agrupada como la página pública: por categoría y, dentro, por orden.
  defaultSort: ['category', 'order'],
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'estado', 'active', 'order'],
    listSearchableFields: ['title', 'description'],
    group: 'Institucional',
    description:
      'Documentos normativos que se publican en /marco-legal. Para retirar uno, desmarque «Publicado» (no lo borre: queda el historial).',
  },
  // MLG-01 / SEC-10: lectura pública solo de filas publicadas (antes `() => true` exponía las retiradas por
  // REST/GraphQL); escritura solo superadmin y web-admin.
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // MLG-01: cada cambio deja rastro de auditoría y avisa al portal (etiqueta `marco-legal`) para que la página
  // se refresque sin esperar al caché. Límite: si el portal está caído el aviso se pierde (el portal aplica
  // además una revalidación de seguridad de 1 hora).
  hooks: {
    afterChange: [
      makeAuditAfterChange('marco-legal', 'Documento del marco legal'),
      async ({ doc }) => {
        await revalidatePortalTag('marco-legal', { collection: 'marco-legal' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('marco-legal', 'Documento del marco legal'),
      async ({ doc }) => {
        await revalidatePortalTag('marco-legal', { collection: 'marco-legal' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nombre del documento',
      required: true,
      admin: { description: 'Tal como debe leerse en la página. Ej.: «Reglamento de Movilidad UNC».' },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      required: true,
      options: CATEGORIES,
      admin: { description: 'Sección de la página en la que aparece el documento.' },
    },
    {
      name: 'estado',
      type: 'select',
      label: 'Estado normativo',
      required: true,
      defaultValue: 'vigente',
      options: [
        { label: 'Vigente', value: 'vigente' },
        { label: 'Derogado', value: 'derogado' },
        { label: 'Histórico', value: 'historico' },
      ],
      admin: {
        description:
          'Vigente: no se marca. Derogado: reemplazado o sin efecto, se muestra con aviso. Histórico: se conserva como referencia (p. ej. un plan de un período cerrado).',
      },
    },
    {
      name: 'fechaDocumento',
      type: 'date',
      label: 'Fecha del documento',
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
        description: 'Fecha de la resolución o aprobación (opcional). Se muestra junto al documento.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descripción (opcional)',
      admin: { description: 'Una línea sobre el contenido. También se usa en la búsqueda de la página.' },
    },
    {
      name: 'nota',
      type: 'textarea',
      label: 'Nota pública (opcional)',
      maxLength: MAX_NOTA,
      // Repite el tope fuera de Payload para que el contrato quede probado sin la BD.
      validate: (value: unknown) =>
        typeof value === 'string' && value.length > MAX_NOTA ? `La nota admite como máximo ${MAX_NOTA} caracteres.` : true,
      admin: { description: 'Aclaración breve visible para el público. Ej.: «Reemplazado por la versión 2».' },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      label: 'Archivo (PDF, DOC o XLS)',
      admin: { description: 'Opción recomendada: el archivo queda en el almacenamiento de la UNC. Tiene prioridad sobre la URL externa.' },
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'URL externa',
      validate: validateExternalUrl,
      admin: {
        description:
          'Solo si no sube un archivo. Se aceptan enlaces https de drive.google.com, docs.google.com, www.unc.edu.py o unc.edu.py. En Drive el archivo debe estar compartido como «Cualquier persona con el enlace».',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden',
      defaultValue: 99,
      index: true,
      admin: { description: 'Número menor = aparece primero dentro de su categoría.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: true,
      index: true,
      admin: { description: 'Desmarque para retirar el documento de la página sin borrarlo.' },
    },
  ],
}
