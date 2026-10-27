import type { CollectionConfig, Where } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { ARANCEL_MAX_MONTO } from './ArancelesRectorado'

// FAC-01: aranceles que publica cada facultad en su página (spec docs/specs/portal/FACULTADES.md §3.3).
// Colección aparte de `aranceles-rectorado` a propósito: otra fuente y otra autoridad fija los montos.

const MAX_CONCEPTO = 200

/** Grupos de la tabla oficial de la facultad (https://www.unc.edu.py/facultad-de-odontologia/), en ese orden. */
const GRUPOS = [
  { label: 'Multas y otros derechos no tributarios', value: 'multas' },
  { label: 'Venta de libros, formularios y documentos', value: 'venta' },
  { label: 'Venta de servicios de la administración pública', value: 'servicios' },
  { label: 'Servicios médicos y hospitalarios', value: 'medicos' },
]

/** Recorta y colapsa espacios para que «Constancias  Varias » y «Constancias Varias» sean el mismo concepto. */
const normalizeConcepto = (value: unknown): unknown => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value)

/**
 * Monto entero en guaraníes entre 0 y ARANCEL_MAX_MONTO (mismo tope que el Rectorado).
 * Amenaza que evita: publicar un precio oficial negativo, con decimales o con ceros de más.
 * Límite: no detecta un monto plausible pero equivocado.
 */
function validateMonto(value: unknown): true | string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Indique el monto en guaraníes, solo números (ej.: 50000).'
  if (!Number.isInteger(value)) return 'El monto debe ser un número entero: los guaraníes no llevan decimales.'
  if (value < 0) return 'El monto no puede ser negativo.'
  if (value > ARANCEL_MAX_MONTO) return 'El monto supera Gs. 100.000.000; revise si sobran ceros.'
  return true
}

type ValidateOptions = {
  id?: string | number
  siblingData?: { grupo?: unknown; facultad?: unknown }
  req?: { payload?: { find?: (args: Record<string, unknown>) => Promise<{ totalDocs?: number }> } }
}

/**
 * Concepto obligatorio, ≤ 200 caracteres y único por facultad y grupo (aviso en español antes del índice único).
 * Límite: dos altas simultáneas pueden pasar esta consulta; entonces responde el índice único de la BD.
 */
async function validateConcepto(value: unknown, options?: unknown): Promise<true | string> {
  const concepto = normalizeConcepto(value)
  if (typeof concepto !== 'string' || concepto === '') return 'Escriba el concepto tal como debe leerse en la página.'
  if (concepto.length > MAX_CONCEPTO) return `El concepto admite como máximo ${MAX_CONCEPTO} caracteres.`
  const { id, siblingData, req } = (options ?? {}) as ValidateOptions
  const grupo = siblingData?.grupo
  const rawFacultad = siblingData?.facultad
  const facultad = typeof rawFacultad === 'object' && rawFacultad !== null ? (rawFacultad as { id?: unknown }).id : rawFacultad
  if (typeof grupo !== 'string' || (typeof facultad !== 'number' && typeof facultad !== 'string') || !req?.payload?.find) return true
  const and: Where[] = [{ concepto: { equals: concepto } }, { grupo: { equals: grupo } }, { facultad: { equals: facultad } }]
  if (id !== undefined && id !== null) and.push({ id: { not_equals: id } })
  const found = await req.payload.find({
    collection: 'aranceles-facultad',
    where: { and },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return (found?.totalDocs ?? 0) > 0 ? 'Ya existe ese concepto en este grupo de la facultad. Edite el existente.' : true
}

export const ArancelesFacultad: CollectionConfig = {
  slug: 'aranceles-facultad',
  labels: { singular: 'Arancel de facultad', plural: 'Aranceles de facultades' },
  defaultSort: ['facultad', 'grupo', 'orden'],
  admin: {
    useAsTitle: 'concepto',
    defaultColumns: ['concepto', 'facultad', 'grupo', 'monto', 'orden', 'active'],
    listSearchableFields: ['concepto'],
    group: 'Institucional',
    description:
      'Montos que publica la página de cada facultad. Para cambiar un precio edite la fila; para retirarla desmarque «Publicado» (no la borre: queda el historial en Auditoría).',
  },
  // FAC-01 / SEC-10: lectura pública solo de filas publicadas; escritura solo superadmin y web-admin (montos oficiales).
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // Garantía en la BD de «un concepto por grupo y facultad».
  indexes: [{ fields: ['facultad', 'grupo', 'concepto'], unique: true }],
  // Auditoría y aviso al portal al guardar y al borrar. Límite: si el portal está caído el aviso se pierde; el
  // portal revalida además cada hora.
  hooks: {
    afterChange: [
      makeAuditAfterChange('aranceles-facultad', 'Arancel de facultad'),
      async ({ doc }) => {
        await revalidatePortalTag('aranceles-facultad', { collection: 'aranceles-facultad' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('aranceles-facultad', 'Arancel de facultad'),
      async ({ doc }) => {
        await revalidatePortalTag('aranceles-facultad', { collection: 'aranceles-facultad' })
        return doc
      },
    ],
  },
  fields: [
    { name: 'facultad', label: 'Facultad', type: 'relationship', relationTo: 'facultades', required: true, index: true },
    {
      name: 'concepto',
      label: 'Concepto',
      type: 'text',
      required: true,
      maxLength: MAX_CONCEPTO,
      validate: validateConcepto,
      hooks: { beforeChange: [({ value }) => normalizeConcepto(value)] },
      admin: { description: 'Tal como lo publica la facultad. No puede repetirse dentro del mismo grupo.' },
    },
    {
      name: 'monto',
      label: 'Monto (Gs.)',
      type: 'number',
      required: true,
      min: 0,
      max: ARANCEL_MAX_MONTO,
      validate: validateMonto,
      admin: { step: 1000, description: 'Importe en guaraníes, sin puntos ni símbolo. Ej.: 50000.' },
    },
    { name: 'grupo', label: 'Grupo', type: 'select', required: true, index: true, options: GRUPOS },
    { name: 'nota', label: 'Nota', type: 'text', maxLength: 300, admin: { description: 'Opcional. Ej.: «por día».' } },
    { name: 'orden', label: 'Orden', type: 'number', defaultValue: 99, min: 0, admin: { step: 1 } },
    {
      name: 'active',
      label: 'Publicado',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { description: 'Desmarque para retirar el arancel de la página sin borrarlo.' },
    },
  ],
}

export default ArancelesFacultad
