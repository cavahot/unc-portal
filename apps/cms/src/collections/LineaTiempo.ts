import type { CollectionConfig, Field } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateHttpsUrl } from '../utilities/validators'

// LT-01: hitos de la sección «Línea de tiempo» de la página pública /historia.
// Spec: docs/specs/portal/LINEA-TIEMPO.md §3 | Evidencia: RDD-LT-01.

/** Topes de texto: el diseño de la página está pensado para un título de una o dos líneas y un párrafo breve. */
const MAX_TITULO = 120
const MAX_DESCRIPCION = 600
const MAX_ETIQUETA_FECHA = 40
const MIN_ANIO = 1800

/**
 * Construye un validador de largo máximo (vacío siempre válido; `required` lo marca Payload).
 * Por qué repetir `maxLength`: así el contrato queda probado sin la BD ni el panel.
 */
function maxLen(max: number) {
  return (value: unknown): true | string =>
    typeof value === 'string' && value.length > max ? `Admite como máximo ${max} caracteres.` : true
}

/**
 * Valida el año del hito: entero entre 1800 y el año siguiente al actual.
 * Amenaza que evita: errores de tipeo (207, 20007) que desordenan la línea de tiempo pública.
 * Límite: no comprueba que el hecho haya ocurrido ese año (eso lo confirma el PO).
 */
export function validateAnio(value: unknown): true | string {
  if (value === undefined || value === null || value === '') return 'Indique el año del hito.'
  const max = new Date().getFullYear() + 1
  if (typeof value !== 'number' || !Number.isInteger(value)) return 'El año debe ser un número entero, por ejemplo 2007.'
  if (value < MIN_ANIO || value > max) return `El año debe estar entre ${MIN_ANIO} y ${max}.`
  return true
}

/** Par título/descripción opcional de una traducción (sin `required`: si falta, el portal muestra el español). */
function translationGroup(name: 'en' | 'ptBR' | 'gn', label: string): Field {
  return {
    name,
    type: 'group',
    label,
    fields: [
      { name: 'titulo', type: 'text', label: 'Título', maxLength: MAX_TITULO, validate: maxLen(MAX_TITULO) },
      { name: 'descripcion', type: 'textarea', label: 'Descripción', maxLength: MAX_DESCRIPCION, validate: maxLen(MAX_DESCRIPCION) },
    ],
  }
}

export const LineaTiempo: CollectionConfig = {
  slug: 'linea-tiempo',
  labels: {
    singular: 'Hito de la línea de tiempo',
    plural: 'Línea de tiempo',
  },
  // Lista del panel en el mismo orden que la página: por año y, dentro del año, por orden.
  defaultSort: ['anio', 'orden'],
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['anio', 'titulo', 'active', 'orden'],
    listSearchableFields: ['titulo', 'descripcion'],
    group: 'Institucional',
    description:
      'Hitos de la sección «Línea de tiempo» de la página Historia. Para retirar uno, desmarque «Publicado» (no lo borre: queda el historial).',
  },
  // LT-01 / SEC-10: lectura pública solo de hitos publicados (un anónimo no ve los retirados por REST/GraphQL);
  // escritura solo superadmin y web-admin, sin permisos nuevos.
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // LT-01: cada cambio deja rastro de auditoría y avisa al portal (etiqueta `linea-tiempo`) para refrescar
  // /historia sin esperar al caché. Límite: si el portal está caído el aviso se pierde (el portal aplica una
  // revalidación de seguridad de 1 hora).
  hooks: {
    afterChange: [
      makeAuditAfterChange('linea-tiempo', 'Hito de la línea de tiempo'),
      async ({ doc }) => {
        await revalidatePortalTag('linea-tiempo', { collection: 'linea-tiempo' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('linea-tiempo', 'Hito de la línea de tiempo'),
      async ({ doc }) => {
        await revalidatePortalTag('linea-tiempo', { collection: 'linea-tiempo' })
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'anio',
          type: 'number',
          label: 'Año',
          required: true,
          index: true,
          min: MIN_ANIO,
          validate: validateAnio,
          admin: { width: '30%', description: 'Año del hito, p. ej. 2007. Se muestra en grande.' },
        },
        {
          name: 'etiquetaFecha',
          type: 'text',
          label: 'Precisión de la fecha (opcional)',
          maxLength: MAX_ETIQUETA_FECHA,
          validate: maxLen(MAX_ETIQUETA_FECHA),
          admin: { width: '70%', description: 'Solo si aporta, p. ej. «4 de julio» o «Marzo de 2008». No se traduce.' },
        },
      ],
    },
    {
      name: 'titulo',
      type: 'text',
      label: 'Título',
      required: true,
      maxLength: MAX_TITULO,
      validate: maxLen(MAX_TITULO),
      admin: { description: 'Frase breve, en español. Ej.: «Inicio de actividades académicas».' },
    },
    {
      name: 'descripcion',
      type: 'textarea',
      label: 'Descripción',
      required: true,
      maxLength: MAX_DESCRIPCION,
      validate: maxLen(MAX_DESCRIPCION),
      admin: { description: 'Uno o dos enunciados sobre qué ocurrió y por qué importa (máx. 600 caracteres).' },
    },
    {
      name: 'imagen',
      type: 'upload',
      relationTo: 'media',
      label: 'Fotografía (opcional)',
      admin: {
        description:
          'Las fotos se normalizan automáticamente al subirlas. Complete el texto alternativo de la imagen: describe lo que se ve.',
      },
    },
    {
      name: 'enlace',
      type: 'text',
      label: 'Enlace «Más información» (opcional)',
      // LT-01: solo https sin credenciales; evita guardar javascript:/http: que luego se publicarían como enlace.
      validate: (value: unknown) => validateHttpsUrl(value, { required: false }),
      admin: { description: 'Dirección completa que empiece con https://, p. ej. una noticia o la ley publicada.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'orden',
          type: 'number',
          label: 'Orden dentro del año',
          defaultValue: 99,
          admin: { width: '50%', description: 'Solo si hay varios hitos el mismo año: número menor = primero.' },
        },
        {
          name: 'active',
          type: 'checkbox',
          label: 'Publicado',
          defaultValue: true,
          index: true,
          admin: { width: '50%', description: 'Desmarque para retirar el hito de la página sin borrarlo.' },
        },
      ],
    },
    {
      name: 'traducciones',
      type: 'group',
      label: 'Traducciones (opcionales)',
      admin: {
        description:
          'Si un campo queda vacío, la página muestra el texto en español. No use traducción automática sin revisión.',
      },
      fields: [translationGroup('en', 'Inglés'), translationGroup('ptBR', 'Portugués (Brasil)'), translationGroup('gn', 'Guaraní')],
    },
  ],
}
