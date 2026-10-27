import type { CollectionConfig, Where } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'

// ARR-01: aranceles que publica /aranceles-rectorado (spec docs/specs/portal/ARANCELES-RECTORADO.md §3).

/**
 * Tope de monto en guaraníes (igual a `MAX_MONTO` del portal, lib/cms/aranceles.ts; lo comprueba un test).
 * Por qué: el mayor arancel publicado es Gs. 2.500.000; más de 100 millones es casi seguro un cero de más.
 */
export const ARANCEL_MAX_MONTO = 100_000_000

/** Largo máximo del concepto: el más largo publicado tiene 67 caracteres. */
const MAX_CONCEPTO = 200

/** Mismo orden que `GRUPO_ORDER` del portal; en Postgres el enum ordena igual, así `defaultSort` agrupa bien. */
const GRUPOS = [
  { label: 'Multas', value: 'multas' },
  { label: 'Venta de bienes y servicios', value: 'venta' },
  { label: 'Aranceles educativos', value: 'educativos' },
]

/** Recorta y colapsa espacios: «Constancias  Varias » y «Constancias Varias» deben ser el mismo concepto. */
const normalizeConcepto = (value: unknown): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value

/**
 * Valida el monto: entero, 0 ≤ monto ≤ ARANCEL_MAX_MONTO.
 * Amenaza que evita: publicar un precio oficial negativo, con decimales (los guaraníes no tienen centavos) o con
 * ceros de más. Límite: no detecta un monto plausible pero equivocado (eso lo revisa quien publica).
 */
function validateMonto(value: unknown): true | string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Indique el monto en guaraníes, solo números (ej.: 50000).'
  if (!Number.isInteger(value)) return 'El monto debe ser un número entero: los guaraníes no llevan decimales.'
  if (value < 0) return 'El monto no puede ser negativo.'
  if (value > ARANCEL_MAX_MONTO) return 'El monto supera Gs. 100.000.000; revise si sobran ceros.'
  return true
}

/** Orden: entero ≥ 0 o vacío (vacío = 99, al final del grupo). */
function validateOrden(value: unknown): true | string {
  if (value === undefined || value === null) return true
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return 'El orden debe ser un número entero mayor o igual a 0.'
  return true
}

type ValidateOptions = {
  id?: string | number
  siblingData?: { grupo?: unknown }
  req?: { payload?: { find?: (args: Record<string, unknown>) => Promise<{ totalDocs?: number }> } }
}

/**
 * Valida el concepto: obligatorio, ≤ 200 caracteres y único dentro de su grupo.
 * Por qué aquí y no solo en la BD: el índice único `concepto_grupo_idx` es la garantía, pero su error llega al
 * panel como un mensaje técnico; esta consulta da antes un aviso en español. Al editar se excluye la propia fila.
 * Límite: dos altas simultáneas pueden pasar esta consulta; entonces responde el índice único.
 */
async function validateConcepto(value: unknown, options?: unknown): Promise<true | string> {
  const concepto = normalizeConcepto(value)
  if (typeof concepto !== 'string' || concepto === '') return 'Escriba el concepto tal como debe leerse en la página.'
  if (concepto.length > MAX_CONCEPTO) return `El concepto admite como máximo ${MAX_CONCEPTO} caracteres.`
  const { id, siblingData, req } = (options ?? {}) as ValidateOptions
  const grupo = siblingData?.grupo
  if (typeof grupo !== 'string' || !req?.payload?.find) return true
  const and: Where[] = [{ concepto: { equals: concepto } }, { grupo: { equals: grupo } }]
  if (id !== undefined && id !== null) and.push({ id: { not_equals: id } })
  const found = await req.payload.find({
    collection: 'aranceles-rectorado',
    where: { and },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return (found?.totalDocs ?? 0) > 0 ? 'Ya existe un arancel con ese concepto en este grupo. Edite el existente en lugar de crear otro.' : true
}

export const ArancelesRectorado: CollectionConfig = {
  slug: 'aranceles-rectorado',
  labels: {
    singular: 'Arancel del Rectorado',
    plural: 'Aranceles del Rectorado',
  },
  // Lista del panel agrupada como la página pública: por grupo (orden del enum) y, dentro, por orden.
  defaultSort: ['grupo', 'orden'],
  admin: {
    useAsTitle: 'concepto',
    defaultColumns: ['concepto', 'grupo', 'monto', 'orden', 'active'],
    listSearchableFields: ['concepto'],
    group: 'Institucional',
    description:
      'Montos que publica /aranceles-rectorado. Para cambiar un precio edite la fila; para retirarla desmarque «Publicado» (no la borre: queda el historial en Auditoría).',
  },
  // ARR-01 / SEC-10: lectura pública solo de filas publicadas (antes `() => true` exponía las retiradas por
  // REST/GraphQL). Escritura y borrado solo superadmin y web-admin: son montos oficiales. Estrechamiento de
  // permisos: antes también escribían editor y publisher (decisión pendiente de confirmar por el PO, spec §8).
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // Garantía en la BD de «un concepto por grupo» (Payload crea el índice `concepto_grupo_idx`).
  indexes: [{ fields: ['concepto', 'grupo'], unique: true }],
  // ARR-01: cada cambio deja rastro en Auditoría y avisa al portal (etiqueta `aranceles-rectorado`), también al
  // borrar (antes solo al guardar: una fila borrada seguía visible hasta que venciera la caché). Límite: si el
  // portal está caído el aviso se pierde; el portal revalida además cada hora.
  hooks: {
    afterChange: [
      makeAuditAfterChange('aranceles-rectorado', 'Arancel del Rectorado'),
      async ({ doc }) => {
        await revalidatePortalTag('aranceles-rectorado', { collection: 'aranceles-rectorado' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('aranceles-rectorado', 'Arancel del Rectorado'),
      async ({ doc }) => {
        await revalidatePortalTag('aranceles-rectorado', { collection: 'aranceles-rectorado' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'concepto',
      label: 'Concepto',
      type: 'text',
      required: true,
      maxLength: MAX_CONCEPTO,
      validate: validateConcepto,
      hooks: { beforeChange: [({ value }) => normalizeConcepto(value)] },
      admin: { description: 'Tal como debe leerse en la página. Ej.: «Constancias Varias». No puede repetirse dentro del mismo grupo.' },
    },
    {
      name: 'monto',
      label: 'Monto (Gs.)',
      type: 'number',
      required: true,
      min: 0,
      max: ARANCEL_MAX_MONTO,
      validate: validateMonto,
      admin: { step: 1000, description: 'Importe en guaraníes, sin puntos ni símbolo. Ej.: 50000 se muestra como Gs. 50.000.' },
    },
    {
      name: 'grupo',
      label: 'Grupo',
      type: 'select',
      required: true,
      index: true,
      options: GRUPOS,
      admin: { description: 'Tabla de la página en la que aparece el arancel.' },
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number',
      defaultValue: 99,
      min: 0,
      validate: validateOrden,
      admin: { step: 1, description: 'Número menor = aparece primero dentro de su grupo.' },
    },
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

export default ArancelesRectorado
