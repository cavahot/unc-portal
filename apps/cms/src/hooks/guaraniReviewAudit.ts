// GLO-GN-APPROVAL-03 (SEC-027): auditoría propia de las decisiones de revisión del glosario guaraní.
// Qué hace: escribe una fila de auditoría con la acción `aprobar`, `rechazar` o `revisar` (revocación o
// devolución a pendiente) cuando cambia el estado de revisión, con el usuario que decidió.
// Amenaza: la auditoría genérica solo dice «actualizado»; al revocar se limpia `aprobadoPor`, así que sin
// esta fila no quedaría rastro de quién aprobó, rechazó o retiró una traducción publicada en el portal.
// Límite: no copia el contenido de la glosa; no es transaccional con el cambio y un fallo del log no bloquea
// al editor (queda en el log del servidor), igual que `makeAuditAfterChange`.
import type { CollectionAfterChangeHook } from 'payload'

import { getClientIP, logAudit } from '../utilities/audit'
import { reviewStateOf } from './guaraniApproval'

export const auditGuaraniReviewTransition: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  try {
    const before = operation === 'create' ? 'pendiente' : reviewStateOf((previousDoc ?? {}) as Record<string, unknown>)
    const after = reviewStateOf(doc as Record<string, unknown>)
    if (before !== after) {
      const accion = after === 'aprobado' ? 'aprobar' : after === 'rechazado' ? 'rechazar' : 'revisar'
      const mensaje =
        after === 'aprobado'
          ? 'Glosa guaraní aprobada'
          : after === 'rechazado'
            ? 'Glosa guaraní rechazada'
            : before === 'aprobado'
              ? 'Aprobación de glosa guaraní revocada (vuelve a pendiente)'
              : 'Glosa guaraní devuelta a pendiente'
      await logAudit(
        {
          usuario: req.user?.email || 'sistema',
          rol: String(req.user?.role || 'system'),
          accion,
          coleccion: 'glosario-guarani',
          documento: String(doc?.id),
          ip: getClientIP(req),
          resultado: 'exito',
          mensaje,
        },
        req.payload,
      )
    }
  } catch (error) {
    console.error('[Audit] No se pudo auditar la decisión de revisión:', error instanceof Error ? error.name : 'desconocido')
  }
  return doc
}
