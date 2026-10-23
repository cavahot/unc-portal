// DEP-03 — `afterChange` compartido: auditoría de cada transición y aviso al AUTOR.
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md (Contrato 11 y 12) | RDD-DEP-64.
import type { PayloadRequest } from 'payload'

import type { EditorialCollectionSlug } from '../../access/roles'
import { extractChanges, getClientIP, logAudit } from '../../utilities/audit'
import { notifyApprovalStateChange } from '../../utilities/notifications'
import { currentState, describeChange, normalizeId } from './transitions'

type Row = Record<string, any>

const LABEL: Record<EditorialCollectionSlug, string> = { noticias: 'Noticia', paginas: 'Página' }

/**
 * DEP-03: registra en `auditoria` UNA fila por guardado con la acción de la transición
 * (`revisar`, `aprobar`, `rechazar`, `publicar`, `actualizar`, `crear`). Reemplaza al registro genérico
 * previo, que solo distinguía crear/actualizar/publicar.
 * Amenaza que evita: transiciones sin rastro o con la acción equivocada. Límite: `logAudit` no lanza y
 * pierde el evento si falla la escritura (se verá en el log del servidor); la auditoría no es
 * transaccional con el cambio.
 */
export async function auditEditorialChange(args: {
  collection: EditorialCollectionSlug
  operation: 'create' | 'update'
  doc: Row
  previousDoc?: Row
  req: PayloadRequest
}): Promise<void> {
  const { collection, operation, doc, previousDoc, req } = args
  const { accion, verb } = describeChange({ operation, previousDoc, doc })
  const cambios = operation === 'update' ? extractChanges(previousDoc || {}, doc) : {}
  await logAudit({
    usuario: req.user?.email || 'sistema',
    rol: String(req.user?.role || 'system'),
    accion,
    coleccion: collection,
    documento: `${doc.title} (ID: ${doc.id})`,
    ip: getClientIP(req),
    resultado: 'exito',
    mensaje: `${LABEL[collection]} ${verb}`,
    cambiosRelevantes: Object.keys(cambios).length > 0 ? cambios : undefined,
  })
}

/** Email del autor (`createdBy`), o `undefined` si el documento no tiene autor conocido. */
async function resolveAuthorEmail(req: PayloadRequest, doc: Row): Promise<string | undefined> {
  const raw = doc.createdBy
  if (raw && typeof raw === 'object' && typeof raw.email === 'string') return raw.email
  const id = normalizeId(raw)
  if (id === undefined) return undefined
  try {
    const author = await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true })
    return typeof author?.email === 'string' ? author.email : undefined
  } catch (error) {
    console.error('[Editorial] No se pudo resolver el autor para notificar:', error instanceof Error ? error.name : 'desconocido')
    return undefined
  }
}

/** Comentario de la última entrada de rechazo del historial (el servidor la escribió en `beforeChange`). */
function lastRejectionComment(history: unknown): string | undefined {
  if (!Array.isArray(history)) return undefined
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i] as { accion?: string; comentario?: string } | undefined
    if (entry?.accion === 'rejected') return entry.comentario
  }
  return undefined
}

/**
 * DEP-03: avisa del cambio de estado. «Aprobada», «rechazada» y «publicada» van al AUTOR
 * (`createdBy`), nunca al actor que ejecutó la transición; el envío a revisión conserva su flujo.
 * Amenaza que evita: avisar de una aprobación a quien aprobó y no a quien redactó. Límite: sin autor
 * conocido (271 noticias heredadas) no se envía nada; no se infiere el autor desde el texto libre `author`.
 */
export async function notifyEditorialChange(args: { doc: Row; previousDoc?: Row; req: PayloadRequest }): Promise<void> {
  const { doc, previousDoc, req } = args
  const from = currentState(previousDoc)
  const to = currentState(doc)
  if (from === to) return

  const actorEmail = req.user?.email || 'sistema'
  const outcome = to === 'aprobado' || to === 'rechazado' || to === 'publicado'
  let recipient = actorEmail
  if (outcome) {
    const author = await resolveAuthorEmail(req, doc)
    if (!author) return
    recipient = author
  }

  await notifyApprovalStateChange(
    doc.id,
    doc.title,
    doc.slug,
    from,
    to,
    recipient,
    req.user?.email,
    undefined,
    to === 'rechazado' ? lastRejectionComment(doc.approvalHistory) : undefined,
  )
}
