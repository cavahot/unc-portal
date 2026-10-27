import type { CollectionConfig } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateAllowedHostUrl } from '../utilities/validators'

// CNV-01: convenios nacionales e internacionales de /convenios (spec docs/specs/portal/CONVENIOS.md).
// Se conservan los nombres de campo existentes (title, type, year, parties, objective, signedMonth, duration,
// driveUrl, active): renombrarlos rompería datos y consumidores. Se agregan `categoria`, `nota` y `orden`.

/**
 * Hosts desde los que se puede enlazar el documento (igual a `ALLOWED_CONVENIO_HOSTS` del portal).
 * Por qué una allowlist: los documentos del sitio publicado viven en Google Drive; cualquier otro dominio es un
 * error de pegado, un servidor antiguo (`softcon.wnpower.host`) o un intento de enlazar contenido ajeno con la
 * marca institucional. Límite: no comprueba que el archivo exista ni que esté compartido públicamente.
 */
export const CONVENIOS_ALLOWED_HOSTS = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py'] as const

/** Largo máximo de la nota pública: es una aclaración, no un texto largo. */
const MAX_NOTA = 280

const Convenios: CollectionConfig = {
  slug: 'convenios',
  labels: {
    singular: 'Convenio',
    plural: 'Convenios',
  },
  // Lista del panel como la página pública: año más reciente primero y, dentro, por orden.
  defaultSort: ['-year', 'orden'],
  admin: {
    group: 'Relaciones Institucionales',
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'categoria', 'type', 'active'],
    listSearchableFields: ['title', 'parties', 'objective'],
    description:
      'Convenios que se publican en /convenios (nacionales) y /convenios/internacionales. Para retirar uno, desmarque «Publicado» (no lo borre: queda el historial).',
  },
  // CNV-01 / SEC-10: lectura pública solo de filas publicadas (antes `() => true` exponía las retiradas por
  // REST/GraphQL); escritura solo superadmin y web-admin (sin cambio).
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // CNV-01: cada cambio deja rastro de auditoría y avisa al portal (etiqueta `convenios`). El aviso nunca lanza:
  // la publicación del editor no depende del portal. Límite: si el portal está caído el aviso se pierde (el portal
  // aplica además una revalidación de seguridad de 1 hora).
  hooks: {
    afterChange: [
      makeAuditAfterChange('convenios', 'Convenio'),
      async ({ doc }) => {
        await revalidatePortalTag('convenios', { collection: 'convenios' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('convenios', 'Convenio'),
      async ({ doc }) => {
        await revalidatePortalTag('convenios', { collection: 'convenios' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Denominación',
      required: true,
      admin: { description: 'Tal como figura en el documento. Ej.: «Convenio Marco de Cooperación Interinstitucional».' },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Tipo',
      required: true,
      index: true,
      options: [
        { label: 'Nacional', value: 'nacional' },
        { label: 'Internacional', value: 'internacional' },
      ],
      admin: { description: 'Nacional aparece en /convenios; Internacional, en /convenios/internacionales.' },
    },
    {
      name: 'categoria',
      type: 'select',
      label: 'Categoría',
      defaultValue: 'institucional',
      // Mismo orden que `CONVENIO_CATEGORIAS` del portal (lib/cms/convenios.ts); lo comprueba un test.
      options: [
        { label: 'Institucional / académico', value: 'institucional' },
        { label: 'Beneficios para estudiantes (comercios)', value: 'beneficios' },
      ],
      admin: {
        description:
          'Institucional: cooperación con universidades, ministerios, municipios y otras instituciones. Beneficios: acuerdos comerciales de descuentos con comercios locales. Define el filtro de la página.',
      },
    },
    {
      name: 'year',
      type: 'number',
      label: 'Año',
      required: true,
      index: true,
      admin: { description: 'Año de firma. La página agrupa los convenios por año, del más reciente al más antiguo.' },
    },
    {
      name: 'parties',
      type: 'textarea',
      label: 'Instituciones / Participantes',
      required: true,
      admin: { description: 'Partes firmantes. Ej.: «Universidad Nacional de Concepción y el Ministerio de Educación y Ciencias».' },
    },
    {
      name: 'objective',
      type: 'textarea',
      label: 'Finalidad del convenio',
      // CNV-01: opcional porque el sitio publicado tiene una fila sin finalidad; la página muestra «Sin finalidad
      // registrada» en lugar de inventar un texto.
      admin: { description: 'Objeto del convenio en una o dos frases. También se usa en la búsqueda de la página.' },
    },
    {
      name: 'signedMonth',
      type: 'text',
      label: 'Fecha de firma',
      admin: { description: 'Texto libre, como en el documento. Ej.: «24 de Marzo». Puede quedar vacío si no se conoce.' },
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Duración',
      admin: { description: 'Texto libre. Ej.: «5 Años», «Indefinido», «Hasta finalizar el proyecto».' },
    },
    {
      name: 'driveUrl',
      type: 'text',
      label: 'Enlace al documento',
      validate: (value: unknown) => validateAllowedHostUrl(value, { allowedHosts: CONVENIOS_ALLOWED_HOSTS }),
      admin: {
        description:
          'Enlace https de drive.google.com, docs.google.com, www.unc.edu.py o unc.edu.py. En Drive el archivo debe estar compartido como «Cualquier persona con el enlace». Vacío: la página muestra «Documento no disponible».',
      },
    },
    {
      name: 'nota',
      type: 'textarea',
      label: 'Nota pública (opcional)',
      maxLength: MAX_NOTA,
      // Repite el tope fuera de Payload para que el contrato quede probado sin la BD.
      validate: (value: unknown) =>
        typeof value === 'string' && value.length > MAX_NOTA ? `La nota admite como máximo ${MAX_NOTA} caracteres.` : true,
      admin: { description: 'Aclaración breve visible para el público. Ej.: «Documento pendiente de nueva carga».' },
    },
    {
      name: 'orden',
      type: 'number',
      label: 'Orden dentro del año',
      defaultValue: 99,
      admin: { description: 'Número menor = aparece primero dentro de su año. Los sembrados conservan el orden del sitio anterior.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: true,
      admin: { description: 'Desmarque para retirar el convenio de la página sin borrarlo.' },
    },
  ],
}

export default Convenios
