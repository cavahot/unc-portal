import type { CollectionConfig } from 'payload'
import { canWriteInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { validateHttpsUrl, validateOfficialSourceUrl } from '../utilities/validators'

// GLO-GN-01: glosario español → guaraní que usan los traductores del portal y el actualizador de fuentes
// oficiales (scripts/update-glosario-guarani.mjs). Herramienta interna: NO se publica en el portal.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §2 | Evidencia: §8 (RDD).

const MAX_TERMINO_ES = 200
const MAX_TERMINO_GN = 300
const MAX_VARIANTE = 200
const MAX_FUENTE = 300
const MAX_NOTA = 2000

/**
 * Validador de largo máximo (vacío siempre válido). Repite `maxLength` para que el contrato quede probado
 * sin la BD ni el panel.
 */
function maxLen(max: number) {
  return (value: unknown): true | string =>
    typeof value === 'string' && value.length > max ? `Admite como máximo ${max} caracteres.` : true
}

/**
 * Exige que una entrada marcada `oficial` tenga una URL de fuente oficial válida.
 * Amenaza que evita: que la casilla «oficial» se marque sin respaldo verificable (o con un corpus), y que
 * luego un traductor la trate como obligatoria. Límite: no verifica que la URL contenga el término.
 */
export function validateOficial(value: unknown, options?: { siblingData?: Record<string, unknown> }): true | string {
  if (value !== true) return true
  const url = options?.siblingData?.fuenteUrl
  if (url === undefined || url === null || url === '') {
    return 'Una entrada oficial necesita la URL de la fuente oficial (campo «URL de la fuente oficial»).'
  }
  const check = validateOfficialSourceUrl(url, { required: true })
  return check === true ? true : `Una entrada oficial necesita una URL oficial válida: ${check}`
}

export const GlosarioGuarani: CollectionConfig = {
  slug: 'glosario-guarani',
  labels: {
    singular: 'Término del glosario guaraní',
    plural: 'Glosario guaraní',
  },
  defaultSort: 'terminoEs',
  admin: {
    useAsTitle: 'terminoEs',
    defaultColumns: ['terminoEs', 'terminoGn', 'confianza', 'oficial', 'revisado', 'fuente'],
    listSearchableFields: ['terminoEs', 'terminoGn', 'nota'],
    group: 'Traducción',
    description:
      'Vocabulario controlado para traducir el portal al guaraní. Marque «Revisado» cuando un hablante nativo confirme la entrada: desde entonces ningún script la modifica. No es contenido público.',
  },
  // GLO-GN-01: lectura y escritura solo superadmin y web-admin. Amenaza: exponer por REST/GraphQL notas
  // internas de revisión o permitir que un rol editorial altere el vocabulario. Límite: la Local API con
  // `overrideAccess` (scripts de servidor) no pasa por estas reglas.
  access: {
    read: canWriteInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // GLO-GN-01: un término por fuente. Evita filas duplicadas al re-ejecutar la siembra o el actualizador;
  // el mismo término puede tener varias filas si vienen de fuentes distintas (así se ven los conflictos).
  indexes: [{ fields: ['terminoEs', 'fuente'], unique: true }],
  // Rastro de auditoría de cada cambio. Sin revalidación: el portal no lee esta colección.
  hooks: {
    afterChange: [makeAuditAfterChange('glosario-guarani', 'Término del glosario guaraní')],
    afterDelete: [makeAuditAfterDelete('glosario-guarani', 'Término del glosario guaraní')],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'terminoEs',
          type: 'text',
          label: 'Término en español',
          required: true,
          index: true,
          maxLength: MAX_TERMINO_ES,
          validate: maxLen(MAX_TERMINO_ES),
          admin: { width: '50%', description: 'Acepción entre paréntesis si hace falta, p. ej. «técnico (persona)».' },
        },
        {
          name: 'terminoGn',
          type: 'text',
          label: 'Término en guaraní',
          maxLength: MAX_TERMINO_GN,
          validate: maxLen(MAX_TERMINO_GN),
          admin: { width: '50%', description: 'Vacío = sin evidencia (confianza X). No invente una forma.' },
        },
      ],
    },
    {
      name: 'variantesGn',
      type: 'array',
      label: 'Variantes en guaraní',
      labels: { singular: 'Variante', plural: 'Variantes' },
      fields: [
        { name: 'valor', type: 'text', label: 'Variante', required: true, maxLength: MAX_VARIANTE, validate: maxLen(MAX_VARIANTE) },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          type: 'select',
          label: 'Tipo',
          required: true,
          options: [
            { label: 'Diccionario', value: 'diccionario' },
            { label: 'Oficial', value: 'oficial' },
            { label: 'Préstamo', value: 'prestamo' },
            { label: 'Neologismo', value: 'neologismo' },
            { label: 'Institucional', value: 'institucional' },
            { label: 'Corpus', value: 'corpus' },
            { label: 'Localización de software', value: 'localizacion' },
          ],
          admin: { width: '34%' },
        },
        {
          name: 'categoria',
          type: 'select',
          label: 'Categoría (opcional)',
          options: [
            { label: 'Universidad', value: 'universidad' },
            { label: 'Académico', value: 'academico' },
            { label: 'Administrativo', value: 'administrativo' },
            { label: 'Tecnología', value: 'tecnologia' },
            { label: 'General', value: 'general' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'confianza',
          type: 'select',
          label: 'Confianza',
          required: true,
          index: true,
          options: [
            { label: 'A: entrada de fuente oficial', value: 'A' },
            { label: 'B: corpus humano o diccionario con salvedades', value: 'B' },
            { label: 'C: una sola aparición o alineación dudosa', value: 'C' },
            { label: 'X: sin evidencia', value: 'X' },
          ],
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'fuente',
      type: 'text',
      label: 'Fuente',
      required: true,
      maxLength: MAX_FUENTE,
      validate: maxLen(MAX_FUENTE),
      admin: { description: 'Nombre de la fuente, p. ej. «Vocabulario es-gn de la SPL (datos.gov.py)». Use «Sin evidencia» si no hay.' },
    },
    {
      name: 'fuenteUrl',
      type: 'text',
      label: 'URL de la fuente oficial',
      // GLO-GN-01: solo https y host oficial exacto (lista en validators.ts).
      validate: (value: unknown) => validateOfficialSourceUrl(value, { required: false }),
      admin: { description: 'Solo sitios oficiales: datos.gov.py, repositorio.conacyt.gov.py, spl.gov.py.' },
    },
    {
      name: 'evidenciaUrl',
      type: 'text',
      label: 'URL de evidencia (no oficial)',
      // Corpus, artículos o Wikipedia: útiles como contexto, nunca como respaldo oficial.
      validate: (value: unknown) => validateHttpsUrl(value, { required: false }),
      admin: { description: 'Corpus o artículo que muestra el uso (p. ej. Jojajovai). Solo https.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'oficial',
          type: 'checkbox',
          label: 'Proviene de una fuente oficial',
          defaultValue: false,
          validate: validateOficial,
          admin: { width: '25%' },
        },
        {
          name: 'revisado',
          type: 'checkbox',
          label: 'Revisado por hablante nativo / PO',
          defaultValue: false,
          index: true,
          admin: { width: '25%', description: 'Protege la entrada: los scripts no la modifican.' },
        },
        {
          name: 'activo',
          type: 'checkbox',
          label: 'Activo',
          defaultValue: true,
          admin: { width: '25%', description: 'Desmarque para retirar sin borrar.' },
        },
        {
          name: 'origen',
          type: 'select',
          label: 'Origen de la fila',
          defaultValue: 'panel',
          options: [
            { label: 'Glosario del PO (siembra)', value: 'glosario-po' },
            { label: 'Actualizador de fuentes oficiales', value: 'actualizador' },
            { label: 'Cargado en el panel', value: 'panel' },
          ],
          admin: { width: '25%', description: 'El actualizador solo modifica sus propias filas.' },
        },
      ],
    },
    {
      name: 'fechaConsulta',
      type: 'date',
      label: 'Fecha de consulta de la fuente',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'nota',
      type: 'textarea',
      label: 'Nota',
      maxLength: MAX_NOTA,
      validate: maxLen(MAX_NOTA),
      admin: { description: 'Acepción, advertencias, «Pendiente de revisión: …».' },
    },
  ],
}
