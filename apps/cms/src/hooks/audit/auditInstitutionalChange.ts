// PRA-01: auditoría de cambios en las colecciones institucionales (Reconocimientos, Acreditaciones, Autoridades,
// Convenios, Marco legal, Línea de tiempo, Glosario guaraní, Aranceles, Transparencia; ver usos de makeAuditAfterChange).
// Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §3.4 | RDD-PRA-14.
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { getClientIP, logAudit } from '../../utilities/audit'

/**
 * Escribe UNA fila en `auditoria` con la acción `crear` o `actualizar`.
 * Amenaza que evita: modificar datos públicos institucionales (autoridades, convenios, aranceles, normativa, transparencia, premios, etc.) sin rastro de quién lo hizo.
 * Límites: no copia el contenido del documento (solo colección, id, acción y usuario) para no duplicar
 * datos en el log; la auditoría no es transaccional con el cambio; `logAudit` no lanza y, si el log
 * falla, el editor no se bloquea (el fallo queda en el log del servidor).
 */
export function makeAuditAfterChange(collection: string, label: string): CollectionAfterChangeHook {
  return async ({ doc, operation, req }) => {
    try {
      const accion = operation === 'create' ? 'crear' : 'actualizar'
      await logAudit(
        {
          usuario: req.user?.email || 'sistema',
          rol: String(req.user?.role || 'system'),
          accion,
          coleccion: collection,
          documento: String(doc?.id),
          ip: getClientIP(req),
          resultado: 'exito',
          mensaje: `${label} ${operation === 'create' ? 'creado' : 'actualizado'}`,
        },
        req.payload,
      )
    } catch (error) {
      console.error('[Audit] No se pudo auditar el cambio:', error instanceof Error ? error.name : 'desconocido')
    }
    return doc
  }
}

/**
 * Escribe una fila `eliminar` cuando se borra un documento de la colección.
 * Amenaza y límites: los mismos que `makeAuditAfterChange`; el borrado ya ocurrió, así que solo deja rastro.
 */
export function makeAuditAfterDelete(collection: string, label: string): CollectionAfterDeleteHook {
  return async ({ doc, id, req }) => {
    try {
      await logAudit(
        {
          usuario: req.user?.email || 'sistema',
          rol: String(req.user?.role || 'system'),
          accion: 'eliminar',
          coleccion: collection,
          documento: String(doc?.id ?? id),
          ip: getClientIP(req),
          resultado: 'exito',
          mensaje: `${label} eliminado`,
        },
        req.payload,
      )
    } catch (error) {
      console.error('[Audit] No se pudo auditar el borrado:', error instanceof Error ? error.name : 'desconocido')
    }
    return doc
  }
}
