// GLO-GN-APPROVAL-01: reglas de aprobación del glosario guaraní.
// Qué hace: exige superadmin, traducción, fuente oficial y confianza A/B antes de publicar una glosa.
// Amenaza: evita que una entrada incompleta o un rol editorial impacte el portal sin revisión.
// Límite: la revisión lingüística sigue siendo responsabilidad del hablante nativo/PO; el hook valida el proceso.
import type { CollectionBeforeChangeHook } from 'payload'

export type GuaraniApprovalInput = {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  role?: string
}

export function validateGuaraniApproval({ data, originalDoc = {}, role }: GuaraniApprovalInput): void {
  if (originalDoc.revisado === true && role !== 'superadmin') {
    throw new Error('La entrada ya está aprobada y solo un superadmin puede modificarla.')
  }

  const approving = data.estadoRevision === 'aprobado' || data.revisado === true
  if (approving && role !== 'superadmin') {
    throw new Error('Solo un superadmin puede aprobar una traducción guaraní para publicarla en el portal.')
  }

  if (!approving) return
  if (typeof data.terminoGn !== 'string' || !data.terminoGn.trim()) {
    throw new Error('No se puede aprobar una entrada sin traducción en guaraní.')
  }
  if (data.oficial !== true || typeof data.fuenteUrl !== 'string' || !data.fuenteUrl.trim()) {
    throw new Error('La aprobación necesita una fuente oficial y su URL.')
  }
  if (data.confianza !== 'A' && data.confianza !== 'B') {
    throw new Error('La aprobación necesita confianza A o B.')
  }
}

type EstadoRevision = 'pendiente' | 'aprobado' | 'rechazado'

/** Estado de revisión que tenía el documento antes del cambio (`pendiente` si es nuevo o no se puede deducir). */
function previousState(originalDoc: Record<string, unknown>): EstadoRevision {
  if (originalDoc.estadoRevision === 'aprobado' || originalDoc.estadoRevision === 'rechazado') return originalDoc.estadoRevision
  return originalDoc.revisado === true ? 'aprobado' : 'pendiente'
}

/**
 * GLO-GN-APPROVAL-02: decide el estado de revisión FINAL a partir de lo que el usuario cambió de verdad.
 * Qué hace: una transición explícita de `estadoRevision` manda; si no cambió, un cambio en `revisado`
 * (true = aprobar, false = revocar) decide; si tampoco, el estado previo se conserva.
 * Por qué existe: antes se leía `revisado` del documento ya fusionado, y como seguía en true, un rechazo
 * se convertía otra vez en «aprobado» (la glosa errónea no se podía retirar del portal).
 * Límite: el panel envía el documento completo, por eso se compara contra el original y no solo se mira `data`.
 */
function resolveNextState(data: Record<string, unknown>, original: Record<string, unknown>): EstadoRevision {
  const previous = previousState(original)
  const requested = data.estadoRevision
  if ((requested === 'pendiente' || requested === 'aprobado' || requested === 'rechazado') && requested !== previous) {
    return requested
  }
  if (typeof data.revisado === 'boolean' && data.revisado !== (original.revisado === true)) {
    if (data.revisado) return 'aprobado'
    return previous === 'aprobado' ? 'pendiente' : previous
  }
  return previous
}

/** Id del aprobador original aunque venga poblado como objeto (depth > 0). */
const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in value ? (value as { id: unknown }).id : value

/**
 * GLO-GN-APPROVAL-01/02: hook de la colección `glosario-guarani`.
 * Qué hace: valida la transición con `validateGuaraniApproval` y mantiene coherentes `estadoRevision`,
 * `revisado`, `aprobadoPor` y `fechaAprobacion`.
 * Amenaza: publicar una glosa sin superadmin, no poder retirar una glosa errónea y falsear la auditoría
 * (que un edit posterior aparezca como «aprobado por» otra persona o fecha).
 * Límite: depende de que `req.user` llegue al hook; todo `payload.update` interno debe pasar `req`.
 */
export const enforceGuaraniApproval: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const original = (originalDoc as Record<string, unknown> | undefined) ?? {}
  const next = resolveNextState(data as Record<string, unknown>, original)
  const wasApproved = previousState(original) === 'aprobado'

  // Se valida el estado FINAL (no el solicitado): un rechazo/revocación no exige fuente ni confianza.
  validateGuaraniApproval({
    data: { ...original, ...(data as Record<string, unknown>), estadoRevision: next, revisado: next === 'aprobado' },
    originalDoc: original,
    role: typeof req.user?.role === 'string' ? req.user.role : undefined,
  })

  data.estadoRevision = next
  data.revisado = next === 'aprobado'

  if (next !== 'aprobado') {
    // Pendiente o rechazada: no debe quedar un aprobador ni una fecha que parezcan vigentes.
    data.aprobadoPor = null
    data.fechaAprobacion = null
  } else if (wasApproved) {
    // Edición de una glosa ya aprobada: se conserva el aprobador y la fecha originales (y se descarta
    // cualquier valor enviado por el cliente: los campos son de solo lectura en el panel, no en la API).
    data.aprobadoPor = idOf(original.aprobadoPor)
    data.fechaAprobacion = original.fechaAprobacion
  } else {
    // Aprobación nueva: queda registrado quién y cuándo.
    data.aprobadoPor = req.user?.id
    data.fechaAprobacion = new Date().toISOString()
  }

  return data
}
