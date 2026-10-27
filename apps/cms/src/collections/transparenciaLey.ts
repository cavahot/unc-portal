import { APIError } from 'payload'
import type { CollectionBeforeValidateHook, CollectionConfig, Field } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateAllowedHostUrl } from '../utilities/validators'

// TRANS-01: fábrica común de las colecciones `ley5189` y `ley5282` (spec docs/specs/portal/TRANSPARENCIA-LEYES.md).
// Las dos leyes comparten esquema, accesos, validación y hooks; solo cambian el slug, los textos y las categorías.
// Se conservan los nombres de campo existentes (period, description, driveUrl, order, active y `category`, ahora derivada
// del ítem): renombrarlos rompería datos y consumidores. `naturalKey` (oculta) impide duplicados.

/**
 * Hosts desde los que se puede enlazar el documento (igual a `ALLOWED_TRANSPARENCIA_HOSTS` del portal y a la
 * allowlist de convenios). Por qué: los documentos viven en Google Drive; cualquier otro dominio es un error de
 * pegado o un intento de enlazar contenido ajeno con la marca institucional. Límite: no comprueba que el archivo
 * exista ni que esté compartido públicamente.
 */
export const TRANSPARENCIA_ALLOWED_HOSTS = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py'] as const

const clean = (v: unknown): string =>
  typeof v === 'string'
    ? v
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    : ''

/**
 * Clave natural de un documento: categoría | período | descripción, sin acentos, mayúsculas ni espacios de más.
 * Por qué: la categoría y el período no bastan (un mismo mes puede tener dos anexos), pero repetir los tres es el
 * mismo documento cargado dos veces. Límite: dos descripciones que difieren en una palabra son documentos distintos.
 */
export function buildNaturalKey(doc: { category?: unknown; period?: unknown; description?: unknown }): string {
  return [clean(doc.category), clean(doc.period), clean(doc.description)].join('|')
}

/** Id de un valor de relación, venga como número/texto o como objeto poblado. */
const relId = (v: unknown): string | number | null =>
  v && typeof v === 'object' ? ((v as { id?: string | number }).id ?? null) : typeof v === 'string' || typeof v === 'number' ? v : null

/**
 * TRANS-02: resuelve el ítem del documento, deriva `category` de su código y calcula `naturalKey` en el servidor
 * (pisa lo que envíe el cliente: amenaza = forjar la clave para esquivar o provocar la unicidad). En un update
 * parcial completa los campos ausentes con `originalDoc`. Rechaza (400) un ítem inexistente o de otra ley: sin esto
 * un documento de la Ley 5189 podría colgar de un ítem 5282 y aparecer en la página equivocada.
 * `category` se conserva (texto) para que la clave natural, el índice y el cargador sigan igual que en TRANS-01.
 */
function makeSetNaturalKey(leyCode: string): CollectionBeforeValidateHook {
  return async ({ data, originalDoc, req }) => {
    const merged = { ...(originalDoc ?? {}), ...(data ?? {}) } as Record<string, unknown>
    let category = merged.category
    const itemId = relId(merged.item)
    if (itemId !== null) {
      const item = (await req.payload.findByID({
        collection: 'transparencia-items',
        id: itemId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
        req,
      })) as { ley?: unknown; codigo?: unknown } | null
      if (!item) throw new APIError('El ítem seleccionado no existe.', 400, undefined, true)
      if (String(item.ley) !== leyCode) {
        throw new APIError(`El ítem seleccionado no pertenece a la Ley ${leyCode}/2014.`, 400, undefined, true)
      }
      category = item.codigo
    }
    return { ...(data ?? {}), category, naturalKey: buildNaturalKey({ ...merged, category }) }
  }
}

interface LeyConfig {
  slug: 'ley5189' | 'ley5282'
  singular: string
  plural: string
  description: string
  itemHelp: string
}

export function buildLeyCollection(cfg: LeyConfig): CollectionConfig {
  const { slug } = cfg
  const leyCode = slug.replace('ley', '')
  const fields: Field[] = [
    {
      // TRANS-02: el ítem (categoría) es un registro editable de `transparencia-items`, no una lista fija en código.
      name: 'item',
      type: 'relationship',
      relationTo: 'transparencia-items',
      label: 'Ítem',
      required: true,
      index: true,
      // Solo ofrece ítems de esta ley en el selector (el hook valida también en el servidor).
      filterOptions: { ley: { equals: leyCode } },
      admin: { description: cfg.itemHelp },
    },
    {
      // Código del ítem, derivado por `makeSetNaturalKey`; se conserva para la clave natural y los consumidores previos.
      name: 'category',
      type: 'text',
      index: true,
      admin: { hidden: true, readOnly: true, description: 'Código del ítem (calculado). No editar.' },
    },
    {
      name: 'period',
      type: 'text',
      label: 'Período',
      required: true,
      admin: { description: 'Ej.: «Enero 2024», «2024», «I Trimestre 2024». Con la categoría y la descripción forma la clave única.' },
    },
    {
      name: 'description',
      type: 'text',
      label: 'Descripción (opcional)',
      admin: { description: 'Nota breve sobre este documento. Sirve para distinguir dos documentos de la misma categoría y período.' },
    },
    {
      name: 'driveUrl',
      type: 'text',
      label: 'Enlace al documento',
      required: true,
      validate: (value: unknown) => validateAllowedHostUrl(value, { allowedHosts: TRANSPARENCIA_ALLOWED_HOSTS, required: true }),
      admin: {
        description:
          'Enlace https de drive.google.com, docs.google.com, www.unc.edu.py o unc.edu.py. En Drive el archivo debe estar compartido como «Cualquier persona con el enlace».',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden de visualización',
      defaultValue: 0,
      admin: { description: 'Número menor = aparece primero dentro de su ítem.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: true,
      admin: { description: 'Desmarque para retirar el documento del portal sin borrarlo (queda el historial).' },
    },
    {
      // Clave de unicidad calculada por `setNaturalKey`; no se edita a mano.
      name: 'naturalKey',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true, readOnly: true, description: 'Clave calculada (categoría, período y descripción). No editar.' },
    },
  ]

  return {
    slug,
    labels: { singular: cfg.singular, plural: cfg.plural },
    admin: {
      useAsTitle: 'period',
      defaultColumns: ['item', 'period', 'order', 'active'],
      group: 'Transparencia',
      listSearchableFields: ['period', 'description'],
      description: cfg.description,
    },
    // SEC-10: lectura pública solo de filas publicadas (antes `() => true` exponía las retiradas por REST);
    // escritura solo superadmin y web-admin (sin cambio).
    access: {
      read: readActiveOrInstitutional,
      create: canWriteInstitutional,
      update: canWriteInstitutional,
      delete: canWriteInstitutional,
    },
    // Cada cambio deja rastro de auditoría y avisa al portal con la etiqueta de la colección. El aviso nunca
    // lanza: publicar no depende del portal. Límite: si el portal está caído el aviso se pierde (el portal aplica
    // además una revalidación de seguridad de 1 hora).
    hooks: {
      beforeValidate: [makeSetNaturalKey(leyCode)],
      afterChange: [
        makeAuditAfterChange(slug, cfg.singular),
        async ({ doc }) => {
          await revalidatePortalTag(slug, { collection: slug })
          return doc
        },
      ],
      afterDelete: [
        makeAuditAfterDelete(slug, cfg.singular),
        async ({ doc }) => {
          await revalidatePortalTag(slug, { collection: slug })
          return doc
        },
      ],
    },
    fields,
  }
}
