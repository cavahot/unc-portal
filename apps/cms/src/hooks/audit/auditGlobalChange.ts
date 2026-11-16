// TITULOS-01 (SEC-027, auditoría suficiente): auditoría de cambios en un GLOBAL del CMS.
// Qué hace: escribe UNA fila en `auditoria` con la acción `actualizar` cuando se guarda el global, con el usuario,
// su rol y la IP, igual que `makeAuditAfterChange` hace con las colecciones.
// Por qué existe: los hooks de auditoría actuales son de colecciones (`CollectionAfterChangeHook`) y ningún global
// auditaba hoy; sin esta fila, un cambio en los requisitos o el plazo de un trámite no dejaría rastro de quién lo hizo.
// Límites: no copia el contenido del global (solo quién y cuándo) para no duplicar datos en el log; no es
// transaccional con el guardado y, si el log falla, el editor no se bloquea (el fallo queda en el log del servidor).
import type { GlobalAfterChangeHook } from 'payload'

import { getClientIP, logAudit } from '../../utilities/audit'

export function makeAuditGlobalAfterChange(slug: string, label: string): GlobalAfterChangeHook {
  return async ({ doc, req }) => {
    try {
      await logAudit(
        {
          usuario: req.user?.email || 'sistema',
          rol: String(req.user?.role || 'system'),
          accion: 'actualizar',
          coleccion: slug,
          documento: String(doc?.id ?? slug),
          ip: getClientIP(req),
          resultado: 'exito',
          mensaje: `${label} actualizado`,
        },
        req.payload,
      )
    } catch (error) {
      console.error('[Audit] No se pudo auditar el cambio del global:', error instanceof Error ? error.name : 'desconocido')
    }
    return doc
  }
}
