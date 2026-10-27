// DEP-03 (SEC-03 aprobada) — hooks de colección que IMPONEN el flujo editorial en el servidor.
// Spec: docs/specs/security/DEP-03-flujo-editorial-servidor.md | RDD-DEP-57..62, RDD-DEP-65.
import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type PayloadRequest,
} from 'payload'

import {
  canReadEditorialAuthorship,
  EDITORIAL_PUBLISHER_ROLES,
  getUserRole,
  hasRole,
  type EditorialCollectionSlug,
} from '../../access/roles'
import { getClientIP, logAudit } from '../../utilities/audit'
import { evaluateTransition, hasContentChange, restoreContentFrom } from './transitions'

type Row = Record<string, unknown>

/**
 * DEP-03: hook `beforeChange` compartido por `noticias` y `paginas`.
 *
 * Qué hace: valida la transición pedida contra la tabla de la spec (rol × estado), fija
 * `approvalStatus` y `_status` coherentes, reconstruye `approvalHistory` desde la sesión (revisor =
 * email, fecha = ahora), consume el comentario de rechazo (`reviewComment`, virtual), restaura el
 * contenido cuando actúa el Revisor o el Publicador, fija `createdBy` (autor) al crear y, al crear,
 * fuerza `draft/draft`.
 *
 * Amenazas que evita: saltar de borrador a publicado por REST/GraphQL; publicar o aprobar sin ser el
 * rol; falsificar el historial; dejar contenido editado publicado sin revisión.
 *
 * Límites: (1) una llamada SIN `req.user` es Local API del servidor (semillas, scripts) y no pasa por
 * este validador; REST/GraphQL anónimos ya no llegan aquí porque el access los rechaza. (2) No sabe si
 * la escritura es borrador o fila principal: de eso se ocupa `forceDraftSaveUnlessPublisher`.
 * (3) Los códigos son 403 (autoridad/propiedad) y 422 (estado/coherencia/dato faltante).
 */
export const createEnforceEditorialTransition =
  (collection: EditorialCollectionSlug): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, operation, req }) => {
    const user = req.user as { id?: number | string; email?: string; role?: string } | null | undefined
    if (!user) return data
    if (operation !== 'create' && operation !== 'update') return data

    const incoming = data as Row
    const original = originalDoc as Row | undefined
    const role = getUserRole(user)

    const decision = evaluateTransition({
      collection,
      operation,
      role,
      userId: user.id,
      original,
      requested: {
        approvalStatus: incoming.approvalStatus,
        _status: incoming._status,
      },
      contentChanged: operation === 'update' ? hasContentChange(incoming, original) : true,
      reviewComment: incoming.reviewComment,
    })

    if (!decision.ok) {
      if (decision.httpStatus === 403) {
        // Un intento prohibido es una señal de seguridad: queda en auditoría con resultado `error`.
        await logAudit({
          usuario: user.email ?? String(user.id ?? 'desconocido'),
          rol: role ?? String(user.role ?? 'desconocido'),
          accion: decision.attempted,
          coleccion: collection,
          documento: `${String(incoming.title ?? original?.title ?? '')} (ID: ${String(original?.id ?? 'nuevo')})`,
          ip: getClientIP(req as PayloadRequest),
          resultado: 'error',
          mensaje: `Intento denegado (403): ${decision.message}`,
        })
      }
      throw new APIError(decision.message, decision.httpStatus, undefined, true)
    }

    // Revisor y Publicador: solo campos de estado; el contenido vuelve a lo que había.
    if (decision.restoreContent) restoreContentFrom(incoming, original)

    incoming.approvalStatus = decision.approvalStatus
    incoming._status = decision.status

    // Historial: solo el servidor lo escribe; lo recibido del cliente se descarta siempre.
    const previous = Array.isArray(original?.approvalHistory) ? (original!.approvalHistory as unknown[]) : []
    const history: unknown[] = operation === 'create' ? [] : [...previous]
    if (decision.historyAction) {
      history.push({
        revisor: user.email ?? String(user.id ?? ''),
        accion: decision.historyAction,
        comentario: decision.comment,
        fecha: new Date().toISOString(),
      })
    }
    incoming.approvalHistory = history

    // El comentario viaja en un campo virtual: no se persiste fuera del historial.
    delete incoming.reviewComment

    // Autoría: la fija el servidor al crear y no cambia después; lo enviado por el cliente se descarta.
    // En contenido heredado sin autor no se asigna uno (no se infiere).
    if (operation === 'create') {
      incoming.createdBy = user.id
    } else if (original?.createdBy !== undefined && original.createdBy !== null) {
      incoming.createdBy = original.createdBy
    } else {
      delete incoming.createdBy
    }

    return incoming
  }

/**
 * DEP-03: hook `beforeOperation` — quien no puede publicar guarda SIEMPRE como borrador.
 *
 * Qué hace: en `update` fuerza `args.draft = true` para todo usuario que no sea Publicador ni
 * Superadministrador. Payload entonces crea una versión y NO toca la fila principal (RDD-DEP-57), de
 * modo que editar algo publicado deja un borrador nuevo y lo que ve el público no cambia.
 *
 * Amenaza que evita: que un autor o revisor, con un PATCH sin `?draft=true`, sobrescriba o retire de
 * publicación la fila principal (despublicar es de Publicador y Superadministrador).
 *
 * Límites: sin `req.user` (Local API del servidor) no interviene. Hipótesis H3: que la operación real
 * lea `draft` después de este hook (visto en `updateByID.js:36` y `update.js:40`, no ejercitado).
 */
export const forceDraftSaveUnlessPublisher: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'update' || !req?.user) return args
  if (hasRole(req.user, EDITORIAL_PUBLISHER_ROLES)) return args
  return { ...args, draft: true }
}

/**
 * DEP-03 D1: quita `createdBy` del `sort` de `find` para quien no puede leer la autoría.
 * Amenaza que evita: que anónimo, viewer o auditor ordenen los publicados por autor y deduzcan
 * agrupaciones de autoría sin que se exponga ningún id (canal lateral; `where[createdBy]` ya da 400).
 * Límite: solo `find`; sin `req.user` el anónimo REST/GraphQL también se filtra, y la Local API del
 * servidor sin `req` no pasa por aquí. Un sort que queda vacío se elimina (orden por defecto).
 */
export const stripAuthorshipSort: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'find' || !args || args.sort == null) return args
  if (canReadEditorialAuthorship({ req: req as PayloadRequest })) return args
  const isAuthorship = (key: string) => key.trim().replace(/^-/, '') === 'createdBy'
  const keys: string[] = Array.isArray(args.sort) ? args.sort : String(args.sort).split(',')
  const kept = keys.filter((key) => !isAuthorship(key))
  if (kept.length === keys.length) return args
  const sort = Array.isArray(args.sort) ? kept : kept.join(',')
  return { ...args, sort: kept.length ? sort : undefined }
}
