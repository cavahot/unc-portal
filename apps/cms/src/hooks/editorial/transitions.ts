// DEP-03 (SEC-03 aprobada) — lógica PURA del flujo editorial: tabla de transiciones, decisión por rol
// y estado, detección de cambios de contenido. Sin Payload, sin base de datos y sin efectos: así se
// prueba entera con req sintético (tests/unit/cms-editorial-transitions.spec.ts).
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md | RDD-DEP-57..62, RDD-DEP-65.
import {
  EDITORIAL_PUBLISHER_ROLES,
  EDITORIAL_REVIEWER_ROLES,
  editorialAuthorRoles,
  type EditorialCollectionSlug,
  type UserRole,
} from '../../access/roles'

export type ApprovalState = 'draft' | 'en_revision' | 'rechazado' | 'aprobado' | 'publicado'
export type DocStatus = 'draft' | 'published'
export type HistoryAction = 'sent_to_review' | 'approved' | 'rejected'
/** Valores que YA existen en el enum `accion` de `auditoria` (no se amplía el enum). */
export type AuditKind = 'crear' | 'actualizar' | 'revisar' | 'aprobar' | 'rechazar' | 'publicar'

export const APPROVAL_STATES: readonly ApprovalState[] = ['draft', 'en_revision', 'rechazado', 'aprobado', 'publicado']
export const MAX_REVIEW_COMMENT = 2000

type Actor = 'author' | 'reviewer' | 'publisher'

/** Una transición permitida de la matriz SEC-03 (tabla de la spec DEP-03). */
interface TransitionRule {
  from: ApprovalState
  to: ApprovalState
  actors: readonly Actor[]
  /** «Nadie aprueba ni publica lo propio»: bloquea si `createdBy` coincide con el actor. */
  notOwn?: boolean
  /** Rechazar exige comentario. */
  requiresComment?: boolean
  /** Para el autor solo vale si cambió el contenido (distingue «editar» de «despublicar»). */
  authorNeedsContentChange?: boolean
  /** Revisor y Publicador no cambian contenido: se restaura desde el documento original. */
  restoreContent?: boolean
  history?: HistoryAction
  audit: AuditKind
  message: string
}

export const TRANSITION_RULES: readonly TransitionRule[] = [
  { from: 'draft', to: 'en_revision', actors: ['author'], history: 'sent_to_review', audit: 'revisar', message: 'enviada a revisión' },
  { from: 'en_revision', to: 'aprobado', actors: ['reviewer'], notOwn: true, restoreContent: true, history: 'approved', audit: 'aprobar', message: 'aprobada' },
  { from: 'en_revision', to: 'rechazado', actors: ['reviewer'], notOwn: true, requiresComment: true, restoreContent: true, history: 'rejected', audit: 'rechazar', message: 'rechazada' },
  { from: 'rechazado', to: 'draft', actors: ['author'], audit: 'actualizar', message: 'devuelta a Borrador para corregir' },
  { from: 'aprobado', to: 'publicado', actors: ['publisher'], notOwn: true, restoreContent: true, audit: 'publicar', message: 'publicada' },
  { from: 'aprobado', to: 'draft', actors: ['author'], audit: 'actualizar', message: 'vuelve a Borrador por edición' },
  { from: 'publicado', to: 'draft', actors: ['publisher'], restoreContent: true, audit: 'actualizar', message: 'despublicada' },
  { from: 'publicado', to: 'draft', actors: ['author'], authorNeedsContentChange: true, audit: 'actualizar', message: 'vuelve a Borrador por edición' },
]

/** Claves que no son «contenido»: estado, sistema y autoría. Se excluyen al comparar o restaurar. */
export const NON_CONTENT_KEYS: ReadonlySet<string> = new Set([
  'id',
  '_id',
  'createdAt',
  'updatedAt',
  'createdBy',
  'approvalStatus',
  '_status',
  'approvalHistory',
  'reviewComment',
])

export interface DocState {
  approvalStatus?: unknown
  _status?: unknown
  createdBy?: unknown
}

export interface EvaluateInput {
  collection: EditorialCollectionSlug
  operation: 'create' | 'update'
  role: UserRole | undefined
  userId: number | string | undefined
  /** Documento original (última versión). `undefined` al crear. */
  original?: DocState
  /** Estado pedido: `data` ya rellenado por Payload con los valores del original (RDD-DEP-59). */
  requested: DocState
  contentChanged: boolean
  reviewComment?: unknown
}

export type Decision =
  | { ok: false; httpStatus: 403 | 422; message: string; attempted: AuditKind }
  | {
      ok: true
      approvalStatus: ApprovalState
      status: DocStatus
      restoreContent: boolean
      historyAction?: HistoryAction
      comment?: string
      audit: AuditKind
      auditMessage: string
      /** Hubo cambio de estado (para historial/auditoría); falso en ediciones sin transición. */
      transitioned: boolean
    }

const isState = (value: unknown): value is ApprovalState =>
  typeof value === 'string' && (APPROVAL_STATES as readonly string[]).includes(value)

const deny = (httpStatus: 403 | 422, message: string, attempted: AuditKind = 'actualizar'): Decision => ({
  ok: false,
  httpStatus,
  message,
  attempted,
})

/** Normaliza un id que puede venir como número, texto o relación poblada `{ id }`. */
export function normalizeId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'object') return normalizeId((value as { id?: unknown }).id)
  const text = String(value)
  return text === '' ? undefined : text
}

/** Estado vigente del documento; los heredados sin `approvalStatus` se derivan de `_status`. */
export function currentState(doc: DocState | undefined): ApprovalState {
  if (isState(doc?.approvalStatus)) return doc.approvalStatus
  return doc?._status === 'published' ? 'publicado' : 'draft'
}

const currentStatus = (doc: DocState | undefined, state: ApprovalState): DocStatus =>
  doc?._status === 'published' || doc?._status === 'draft'
    ? doc._status
    : state === 'publicado'
      ? 'published'
      : 'draft'

/** Serialización estable (claves ordenadas) para comparar contenido sin depender del orden de claves. */
function stableStringify(value: unknown): string {
  if (value === undefined || value === null) return 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.keys(value as object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * ¿El cliente cambió campos de contenido respecto del original? Compara todo lo que no es estado ni
 * sistema. Sirve para distinguir «editar» (vuelve a Borrador) de «despublicar» (solo `_status`).
 * Límite: falso positivo posible si el cliente reserializa el JSON (es seguro: el autor cae a Borrador);
 * hipótesis H8 sobre richText/bloques reales.
 */
export function hasContentChange(data: Record<string, unknown>, original: Record<string, unknown> | undefined): boolean {
  if (!original) return true
  const keys = new Set([...Object.keys(data), ...Object.keys(original)])
  for (const key of keys) {
    if (NON_CONTENT_KEYS.has(key)) continue
    if (stableStringify(data[key]) !== stableStringify(original[key])) return true
  }
  return false
}

/** Restaura el contenido desde el original: el Revisor y el Publicador solo mueven campos de estado. */
export function restoreContentFrom(data: Record<string, unknown>, original: Record<string, unknown> | undefined): void {
  const keys = new Set([...Object.keys(data), ...Object.keys(original ?? {})])
  for (const key of keys) {
    if (NON_CONTENT_KEYS.has(key)) continue
    if (original && key in original) data[key] = original[key]
    else delete data[key]
  }
}

function actorsOf(role: UserRole, collection: EditorialCollectionSlug): ReadonlySet<Actor> {
  const actors = new Set<Actor>()
  if (editorialAuthorRoles(collection).includes(role)) actors.add('author')
  if (EDITORIAL_REVIEWER_ROLES.includes(role)) actors.add('reviewer')
  if (EDITORIAL_PUBLISHER_ROLES.includes(role)) actors.add('publisher')
  return actors
}

const hasAny = (actors: ReadonlySet<Actor>, allowed: readonly Actor[]) => allowed.some((actor) => actors.has(actor))

/**
 * Decide si el cambio pedido es válido para el rol y el estado actual (tabla de la spec DEP-03).
 * Orden: primero QUIÉN eres (403), después EN QUÉ ESTADO está (422); así un rol sin autoridad no
 * obtiene información sobre el estado del documento.
 * Amenaza que evita: saltarse el flujo por REST/GraphQL/Local API (hallazgo C3 / SEC-04).
 * Límite: no conoce el contenido real ni la base de datos; el hook aplica la decisión.
 */
export function evaluateTransition(input: EvaluateInput): Decision {
  const { collection, operation, role, userId, original, requested, contentChanged } = input
  const actors = role ? actorsOf(role, collection) : new Set<Actor>()

  if (!role || actors.size === 0) {
    return deny(403, 'Su rol no participa en el flujo editorial de este contenido.')
  }

  // Defensa en profundidad: el access ya filtra por autoría; si un corresponsal llega al hook con un
  // documento ajeno, se rechaza. Con autor nulo (heredado) el hook no bloquea: lo hace el access.
  if (operation === 'update' && role === 'correspondent') {
    const owner = normalizeId(original?.createdBy)
    if (owner !== undefined && owner !== normalizeId(userId)) {
      return deny(403, 'Un corresponsal solo puede modificar su propio contenido.')
    }
  }

  // Estados y estatus pedidos (el cliente puede omitirlos: Payload rellena con el original).
  if (requested.approvalStatus != null && !isState(requested.approvalStatus)) {
    return deny(422, 'Estado editorial desconocido.')
  }
  if (requested._status != null && requested._status !== 'draft' && requested._status !== 'published') {
    return deny(422, 'Estado de publicación desconocido.')
  }

  // «Tiene autoridad sobre el destino» = existe alguna regla hacia ese estado que el rol puede ejercer.
  const hasAuthorityOn = (target: ApprovalState) =>
    TRANSITION_RULES.some((rule) => rule.to === target && hasAny(actors, rule.actors))

  // ─── Creación: siempre nace en draft/draft ─────────────────────────────────────────────────
  if (operation === 'create') {
    if (!actors.has('author')) return deny(403, 'Su rol no puede crear este contenido.', 'crear')
    const asked: ApprovalState = isState(requested.approvalStatus) ? requested.approvalStatus : requested._status === 'published' ? 'publicado' : 'draft'
    if (asked !== 'draft' || requested._status === 'published') {
      const target = requested._status === 'published' ? 'publicado' : asked
      return hasAuthorityOn(target)
        ? deny(422, 'Un contenido nuevo siempre nace en Borrador; envíelo a revisión después de crearlo.', 'crear')
        : deny(403, 'No está autorizado a fijar ese estado al crear el contenido.', 'crear')
    }
    return {
      ok: true,
      approvalStatus: 'draft',
      status: 'draft',
      restoreContent: false,
      audit: 'crear',
      auditMessage: 'creada',
      transitioned: false,
    }
  }

  // ─── Actualización ──────────────────────────────────────────────────────────────────────────
  const from = currentState(original)
  const fromStatus = currentStatus(original, from)
  const askedState: ApprovalState = isState(requested.approvalStatus) ? requested.approvalStatus : from
  const askedStatus: DocStatus = requested._status === 'published' || requested._status === 'draft' ? requested._status : fromStatus

  let target: ApprovalState
  let statusMismatch = false
  if (askedStatus === 'published') {
    // Intención de publicar (o de mantener publicado): `approvalStatus` solo puede estar sin cambios o en 'publicado'.
    if (askedState !== from && askedState !== 'publicado') {
      return deny(422, 'Petición incoherente: «publicado» exige el estado editorial «publicado».')
    }
    target = 'publicado'
  } else if (askedState === 'publicado' && from === 'publicado') {
    // `_status: draft` sobre un publicado: es editar (borrador nuevo) o despublicar (RDD-DEP-61).
    target = 'draft'
  } else if (askedState === 'publicado') {
    // Pide «publicado» sin `_status: published`: no es una orden válida de publicación.
    target = 'publicado'
    statusMismatch = true
  } else {
    target = askedState
  }

  const reviewComment = typeof input.reviewComment === 'string' ? input.reviewComment.trim() : ''
  const creator = normalizeId(original?.createdBy)
  const isOwn = creator !== undefined && creator === normalizeId(userId)

  if (target === from && !statusMismatch) {
    // Sin transición de estado.
    if (target === 'publicado') {
      // Mantener publicado exige ser Publicador (re-publicar es operación vacía: el contenido se restaura).
      if (!actors.has('publisher')) return deny(403, 'Solo el Publicador puede confirmar un contenido publicado.', 'publicar')
      // Un autor-publicador (Superadministrador) que edita sin guardar como borrador dejaría contenido
      // sin revisar en vivo: se pide guardar como borrador en lugar de descartar su edición en silencio.
      if (actors.has('author') && contentChanged) {
        return deny(422, 'Para editar contenido publicado guárdelo como borrador: los cambios se publican tras revisión y aprobación.')
      }
      return keepState(target, true)
    }
    if (actors.has('author')) {
      if (from === 'aprobado' && contentChanged) {
        // «Editar algo aprobado lo devuelve a Borrador».
        return applyRule(findRule('aprobado', 'draft', actors, contentChanged)!, input, isOwn, reviewComment)
      }
      return keepState(from, false) // edición normal en draft / en_revision / rechazado; aprobado sin cambios no se degrada
    }
    return keepState(from, true) // Revisor o Publicador sin transición: solo estado, el contenido se restaura
  }

  const matching = TRANSITION_RULES.filter((rule) => rule.from === from && rule.to === target)
  if (matching.length === 0 || statusMismatch) {
    return hasAuthorityOn(target)
      ? deny(
          422,
          statusMismatch
            ? 'Para publicar use la acción Publicar (estado de publicación «published»).'
            : `Transición no permitida desde «${from}» hacia «${target}».`,
          auditKindFor(target),
        )
      : deny(403, `Su rol no puede llevar el contenido al estado «${target}».`, auditKindFor(target))
  }

  const rule = findRule(from, target, actors, contentChanged)
  if (!rule) return deny(403, `Su rol no puede llevar el contenido de «${from}» a «${target}».`, auditKindFor(target))
  return applyRule(rule, input, isOwn, reviewComment)
}

/** Elige la regla aplicable al actor; con cambios de contenido prefiere la del autor (editar), sin ellos la de publicar/despublicar. */
function findRule(from: ApprovalState, to: ApprovalState, actors: ReadonlySet<Actor>, contentChanged: boolean): TransitionRule | undefined {
  const usable = TRANSITION_RULES.filter(
    (rule) =>
      rule.from === from &&
      rule.to === to &&
      hasAny(actors, rule.actors) &&
      !(rule.authorNeedsContentChange && !contentChanged),
  )
  if (usable.length <= 1) return usable[0]
  return contentChanged ? (usable.find((rule) => !rule.restoreContent) ?? usable[0]) : (usable.find((rule) => rule.restoreContent) ?? usable[0])
}

function auditKindFor(target: ApprovalState): AuditKind {
  switch (target) {
    case 'en_revision':
      return 'revisar'
    case 'aprobado':
      return 'aprobar'
    case 'rechazado':
      return 'rechazar'
    case 'publicado':
      return 'publicar'
    default:
      return 'actualizar'
  }
}

function keepState(state: ApprovalState, restoreContent: boolean): Decision {
  return {
    ok: true,
    approvalStatus: state,
    status: state === 'publicado' ? 'published' : 'draft',
    restoreContent,
    audit: 'actualizar',
    auditMessage: 'actualizada',
    transitioned: false,
  }
}

function applyRule(rule: TransitionRule, input: EvaluateInput, isOwn: boolean, reviewComment: string): Decision {
  if (rule.notOwn && isOwn) {
    return deny(403, 'Nadie aprueba ni publica su propio contenido: debe hacerlo otra persona.', rule.audit)
  }
  if (rule.requiresComment) {
    if (reviewComment === '') return deny(422, 'Rechazar exige un comentario que explique qué corregir.', rule.audit)
    if (reviewComment.length > MAX_REVIEW_COMMENT) {
      return deny(422, `El comentario de rechazo no puede superar ${MAX_REVIEW_COMMENT} caracteres.`, rule.audit)
    }
  }
  return {
    ok: true,
    approvalStatus: rule.to,
    status: rule.to === 'publicado' ? 'published' : 'draft',
    restoreContent: Boolean(rule.restoreContent),
    historyAction: rule.history,
    comment: rule.requiresComment ? reviewComment : undefined,
    audit: rule.audit,
    auditMessage: rule.message,
    transitioned: true,
  }
}

/**
 * Acción de auditoría y mensaje para el `afterChange` a partir del documento anterior y el guardado.
 * Solo usa valores ya existentes del enum de `auditoria` (RDD-DEP-64).
 */
export function describeChange(args: {
  operation: 'create' | 'update'
  previousDoc?: DocState
  doc: DocState
}): { accion: AuditKind; verb: string } {
  const { operation, previousDoc, doc } = args
  if (operation === 'create') return { accion: 'crear', verb: 'creada' }
  const from = currentState(previousDoc)
  const to = currentState(doc)
  if (from !== to) {
    const rule = TRANSITION_RULES.find((r) => r.from === from && r.to === to)
    if (rule) return { accion: rule.audit, verb: rule.message }
    return { accion: auditKindFor(to), verb: `cambia a «${to}»` }
  }
  if (previousDoc?._status !== 'published' && doc._status === 'published') return { accion: 'publicar', verb: 'publicada' }
  return { accion: 'actualizar', verb: 'actualizada' }
}
