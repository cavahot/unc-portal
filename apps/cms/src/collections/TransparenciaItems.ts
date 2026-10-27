import { APIError } from 'payload'
import type { CollectionBeforeDeleteHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'

// TRANS-02: ítems (categorías) de las leyes 5189/2014 y 5282/2014 como registros editables, uno por ítem.
// Spec: docs/specs/portal/TRANSPARENCIA-ITEMS.md. Antes la lista vivía en código (select fijo) y agregar, renombrar
// u ordenar un ítem exigía un cambio de código y de esquema. Los documentos (`ley5189`, `ley5282`) apuntan a su ítem.

/** Slug estable: minúsculas, dígitos y guiones simples. Es parte de la clave natural y del ancla `#cat-<codigo>`. */
const CODIGO_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

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
 * Clave natural de un ítem: `ley|codigo` normalizada. Por qué: el mismo código puede repetirse entre leyes
 * (`item-1`), pero no dentro de una. Límite: no detecta dos ítems con distinto código y el mismo título.
 */
export function buildItemKey(item: { ley?: unknown; codigo?: unknown }): string {
  return [clean(item.ley), clean(item.codigo)].join('|')
}

/** Calcula `naturalKey` en el servidor y pisa lo que envíe el cliente; en updates parciales completa con `originalDoc`. */
const setNaturalKey: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const merged = { ...(originalDoc ?? {}), ...(data ?? {}) } as Record<string, unknown>
  return { ...(data ?? {}), naturalKey: buildItemKey(merged) }
}

/**
 * Impide borrar un ítem que tiene documentos. Amenaza: un borrado dejaría documentos huérfanos que el portal no
 * puede agrupar (desaparecen sin aviso). Para retirar un ítem se desmarca «Publicado». Límite: un DELETE directo en
 * SQL esquiva el hook; la columna `item_id` es NOT NULL y por eso el motor también lo rechaza.
 */
const blockDeleteWithDocuments: CollectionBeforeDeleteHook = async ({ id, req }) => {
  let total = 0
  for (const collection of ['ley5189', 'ley5282'] as const) {
    const res = await req.payload.count({ collection, where: { item: { equals: id } }, overrideAccess: true, req })
    total += res.totalDocs
  }
  if (total > 0) {
    throw new APIError(
      `No se puede eliminar el ítem: tiene ${total} documento(s) asociado(s). Desmarque «Publicado» para retirarlo o mueva los documentos a otro ítem.`,
      400,
      undefined,
      true,
    )
  }
}

/** Avisa al portal: la etiqueta de ítems y la de la ley afectada (un título o `active` cambia sus páginas). */
async function revalidateItem(doc: { ley?: unknown } | null | undefined): Promise<void> {
  await revalidatePortalTag('transparencia-items', { collection: 'transparencia-items' })
  const ley = String(doc?.ley ?? '')
  if (ley === '5189' || ley === '5282') await revalidatePortalTag(`ley${ley}`, { collection: 'transparencia-items' })
}

export const TransparenciaItems: CollectionConfig = {
  slug: 'transparencia-items',
  labels: { singular: 'Ítem de transparencia', plural: 'Ítems de transparencia' },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['ley', 'orden', 'titulo', 'codigo', 'active'],
    group: 'Transparencia',
    listSearchableFields: ['titulo', 'codigo'],
    description:
      'Categorías (Ley 5189/2014) e ítems del Art. 8° (Ley 5282/2014) que muestra el portal. Cada ítem agrupa sus documentos; un ítem sin documentos se muestra igual con «Documentos aún no publicados».',
  },
  // SEC-10: el público solo lee ítems publicados; la escritura es solo de superadmin y web-admin.
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    beforeValidate: [setNaturalKey],
    beforeDelete: [blockDeleteWithDocuments],
    afterChange: [
      makeAuditAfterChange('transparencia-items', 'Ítem de transparencia'),
      async ({ doc }) => {
        await revalidateItem(doc)
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('transparencia-items', 'Ítem de transparencia'),
      async ({ doc }) => {
        await revalidateItem(doc)
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'ley',
      type: 'select',
      label: 'Ley',
      required: true,
      index: true,
      options: [
        { label: 'Ley 5189/2014', value: '5189' },
        { label: 'Ley 5282/2014', value: '5282' },
      ],
      // No se cambia tras crear: mover un ítem de ley dejaría sus documentos en una colección distinta.
      access: { update: () => false },
      admin: { description: 'Ley a la que pertenece el ítem. No se puede cambiar después de crearlo.' },
    },
    {
      name: 'codigo',
      type: 'text',
      label: 'Código (identificador)',
      required: true,
      validate: (value: unknown) =>
        typeof value === 'string' && value.length <= 60 && CODIGO_RE.test(value)
          ? true
          : 'Use solo minúsculas, números y guiones simples (p. ej. «item-18»), hasta 60 caracteres.',
      // Es parte de la clave de los documentos y del ancla de la página: no se cambia tras crear.
      access: { update: () => false },
      admin: { description: 'Identificador estable en minúsculas, p. ej. «item-18». No se puede cambiar después de crearlo.' },
    },
    {
      name: 'titulo',
      type: 'text',
      label: 'Título oficial',
      required: true,
      admin: { description: 'Denominación que ve el público, tal como figura en la ley. Se puede renombrar.' },
    },
    {
      name: 'descripcion',
      type: 'text',
      label: 'Descripción (opcional)',
      admin: { description: 'Nota breve bajo el título, p. ej. la letra o el artículo de la ley.' },
    },
    {
      name: 'orden',
      type: 'number',
      label: 'Orden de visualización',
      defaultValue: 0,
      admin: { description: 'Número menor = aparece primero. Use saltos de 10 para poder intercalar ítems.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: true,
      index: true,
      admin: { description: 'Desmarque para ocultar el ítem y sus documentos del portal sin borrar nada.' },
    },
    {
      // Calculada por `setNaturalKey` (ley|codigo); impide duplicar un ítem dentro de la misma ley.
      name: 'naturalKey',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true, readOnly: true, description: 'Clave calculada (ley y código). No editar.' },
    },
  ],
}
