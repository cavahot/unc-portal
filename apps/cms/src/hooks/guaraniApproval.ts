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

export const enforceGuaraniApproval: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const effectiveData = {
    ...(originalDoc as Record<string, unknown> | undefined),
    ...(data as Record<string, unknown>),
  }
  validateGuaraniApproval({
    data: effectiveData,
    originalDoc: originalDoc as Record<string, unknown> | undefined,
    role: typeof req.user?.role === 'string' ? req.user.role : undefined,
  })

  if (effectiveData.estadoRevision === 'aprobado' || effectiveData.revisado === true) {
    data.estadoRevision = 'aprobado'
    data.revisado = true
    data.fechaAprobacion = new Date().toISOString()
    data.aprobadoPor = req.user?.id
  }

  return data
}
