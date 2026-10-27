import type { Access, PayloadRequest, Where } from 'payload'

import type { User } from '../payload-types'

export const USER_ROLE_OPTIONS = [
  { label: 'Superadministrador', value: 'superadmin' },
  { label: 'Administrador web', value: 'web-admin' },
  { label: 'Publicador', value: 'publisher' },
  { label: 'Revisor editorial', value: 'reviewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Corresponsal de unidad', value: 'correspondent' },
  { label: 'Gestor multimedia', value: 'media-manager' },
  { label: 'Auditor', value: 'auditor' },
  { label: 'Consulta', value: 'viewer' },
] as const

export type UserRole = (typeof USER_ROLE_OPTIONS)[number]['value']

type AuthenticatedUser = {
  id?: number | string
  role?: null | string
}

type AdminAccess = (args: {
  req: PayloadRequest
}) => boolean | Promise<boolean>

const normalizeID = (value: number | string | undefined): string =>
  value === undefined ? '' : String(value)

export const getUserRole = (user: unknown): UserRole | undefined => {
  if (!user || typeof user !== 'object' || !('role' in user)) {
    return undefined
  }

  const role = (user as AuthenticatedUser).role

  return USER_ROLE_OPTIONS.some((option) => option.value === role)
    ? (role as UserRole)
    : undefined
}

export const hasRole = (
  user: unknown,
  allowedRoles: readonly UserRole[],
): boolean => {
  const role = getUserRole(user)

  return role !== undefined && allowedRoles.includes(role)
}

/**
 * SEC-05: exige una sesión con rol reconocido antes de abrir el panel.
 * Rechaza roles nulos o heredados desconocidos; las ACL de cada recurso siguen siendo independientes.
 */
export const isAuthenticated: AdminAccess = ({ req }) =>
  Boolean(req.user) && getUserRole(req.user) !== undefined

export const isSuperAdmin: Access<User> = ({ req }) =>
  hasRole(req.user, ['superadmin'])

export const canReadUsers: Access<User> = ({ req }) => {
  const user = req.user as AuthenticatedUser | null

  if (!user?.id) {
    return false
  }

  if (hasRole(user, ['superadmin'])) {
    return true
  }

  return {
    id: {
      equals: user.id,
    },
  }
}

export const canCreateUsers: Access<User> = ({ req }) =>
  hasRole(req.user, ['superadmin'])

export const canUpdateUsers: Access<User> = ({ req }) => {
  const user = req.user as AuthenticatedUser | null

  if (!user?.id) {
    return false
  }

  if (hasRole(user, ['superadmin'])) {
    return true
  }

  return {
    id: {
      equals: user.id,
    },
  }
}

export const canDeleteUsers: Access<User> = ({ req }) =>
  hasRole(req.user, ['superadmin'])

export const canUnlockUsers: Access<User> = ({ req }) =>
  hasRole(req.user, ['superadmin'])

export const canManageUserRoles = ({
  req,
}: {
  req: PayloadRequest
}): boolean => hasRole(req.user, ['superadmin'])

export const canReadProtectedUserFields = ({
  req,
}: {
  req: PayloadRequest
}): boolean => Boolean(req.user)

export const isSameUser = (
  authenticatedUserID: number | string | undefined,
  targetUserID: number | string | undefined,
): boolean =>
  normalizeID(authenticatedUserID) !== '' &&
  normalizeID(authenticatedUserID) === normalizeID(targetUserID)

// ─── Colecciones editoriales (Noticias, Paginas) — DEP-03 / SEC-03 ───────────────────────────────

/** DEP-03: colecciones con flujo editorial (borrador → revisión → aprobado → publicado). */
export type EditorialCollectionSlug = 'noticias' | 'paginas'

/**
 * DEP-03 (SEC-03, matriz aprobada 2026-10-22): roles que redactan contenido.
 * `web-admin` redacta solo `paginas` (contenido institucional); en `noticias` ya no escribe.
 * Amenaza que evita: que un rol administrativo o de revisión cree o edite contenido que luego
 * aprueba o publica él mismo (separación de funciones). Límite: es una lista de roles; la autoría
 * por documento (`createdBy`) la impone `canUpdateEditorial` y el hook de transiciones.
 */
export const editorialAuthorRoles = (slug: EditorialCollectionSlug): readonly UserRole[] =>
  slug === 'paginas'
    ? ['superadmin', 'web-admin', 'editor', 'correspondent']
    : ['superadmin', 'editor', 'correspondent']

/** DEP-03: único rol que aprueba o rechaza (nunca lo propio; lo verifica el hook de transiciones). */
export const EDITORIAL_REVIEWER_ROLES: readonly UserRole[] = ['reviewer']

/**
 * DEP-03: roles que publican y despublican. `superadmin` actúa como Publicador en esta iteración;
 * la publicación de emergencia con motivo obligatorio queda pendiente (DEP-03c).
 */
export const EDITORIAL_PUBLISHER_ROLES: readonly UserRole[] = ['superadmin', 'publisher']

/**
 * DEP-03: create de noticias/páginas. Solo los autores. Amenaza que evita: que Publicador o Revisor
 * fabriquen contenido propio o ajeno y lo pasen por el flujo. Límite: el estado inicial (`draft`)
 * y el autor los fija el hook `beforeChange`.
 */
export const canCreateEditorial =
  (slug: EditorialCollectionSlug): Access =>
  ({ req }) =>
    hasRole(req.user, editorialAuthorRoles(slug))

/**
 * DEP-03: id de la sesión para filtrar por autoría. `undefined` si la sesión no trae id utilizable:
 * en ese caso los filtros por autor NO se generan (fail-closed), nunca se amplía el acceso.
 */
const sessionUserId = (user: unknown): number | string | undefined => {
  const id = (user as AuthenticatedUser | null | undefined)?.id
  return id === undefined || id === null || normalizeID(id) === '' ? undefined : id
}

/**
 * DEP-03: update de noticias/páginas. Autores (excepto `correspondent`), Revisor y Publicador pasan
 * el access; el hook `beforeChange` limita al Revisor y al Publicador a los campos de estado y valida
 * la transición. `correspondent` solo actualiza documentos cuyo `createdBy` es él (SEC-03 decisión 5,
 * `where` sobre la última versión: RDD-DEP-58); los heredados sin autor (`createdBy` nulo) no son
 * editables por un corresponsal.
 * Amenaza que evita: edición libre por roles sin función de autor y edición de borradores ajenos por
 * un corresponsal. Límite: el access no ve el estado destino (lo valida el hook); el filtro por
 * unidad/facultad es de la segunda fase de SEC-03.
 */
export const canUpdateEditorial =
  (slug: EditorialCollectionSlug): Access =>
  ({ req }) => {
    if (getUserRole(req.user) === 'correspondent') {
      const id = sessionUserId(req.user)
      return id !== undefined && editorialAuthorRoles(slug).includes('correspondent')
        ? { createdBy: { equals: id } }
        : false
    }
    const authors = editorialAuthorRoles(slug).filter((role) => role !== 'correspondent')
    return hasRole(req.user, [...authors, ...EDITORIAL_REVIEWER_ROLES, ...EDITORIAL_PUBLISHER_ROLES])
  }

/**
 * DEP-02 / DEP-03 (RDD-DEP-09): roles con lectura editorial completa (incluye borradores y versiones).
 * SEC-03 decisión 5: `correspondent` ya NO está aquí (lee publicados y lo suyo por autoría). `auditor`
 * y `viewer` tampoco (decisión 7: el Auditor no lee borradores).
 */
const EDITORIAL_READ_ROLES: readonly UserRole[] = [
  'superadmin',
  'web-admin',
  'publisher',
  'editor',
  'reviewer',
]

/**
 * DEP-02/DEP-03: lectura de noticias/páginas. Roles con lectura completa reciben `true`; anónimo y
 * roles sin función editorial (viewer, auditor, media-manager, corresponsal sin autoría aplicable,
 * rol nulo o desconocido) solo reciben documentos con `_status = published`.
 * Amenaza que evita: lectura de borradores por REST/GraphQL (hallazgo C2).
 * Límite: los registros heredados sin `_status` quedan ocultos a propósito (SEC-001, decisión 2);
 * no valida `approvalStatus` ni cubre TribunalDocumentos, Tesis ni Media (SEC-10).
 */
export const readPublishedOrEditorial: Access = ({ req }) => {
  if (hasRole(req.user, EDITORIAL_READ_ROLES)) return true
  const published: Where = { _status: { equals: 'published' } }
  const id = getUserRole(req.user) === 'correspondent' ? sessionUserId(req.user) : undefined
  // DEP-03: el corresponsal lee lo publicado y lo que él creó (nunca borradores ajenos).
  return id !== undefined ? { or: [published, { createdBy: { equals: id } }] } : published
}

/**
 * DEP-02/DEP-03: historial de versiones. Roles de lectura completa: `true`. `correspondent`: solo
 * versiones de documentos suyos (`version.createdBy`, hipótesis H2 de la spec). Anónimo y roles sin
 * función editorial no pueden enumerar borradores antiguos (`false`).
 * Límite: Payload evalúa esta función aparte de `read`; que acepte un `Where` aquí es la hipótesis H2.
 */
export const canReadEditorialVersions: Access = ({ req }) => {
  if (hasRole(req.user, EDITORIAL_READ_ROLES)) return true
  const id = getUserRole(req.user) === 'correspondent' ? sessionUserId(req.user) : undefined
  return id !== undefined ? { 'version.createdBy': { equals: id } } : false
}

/**
 * DEP-03: lectura del campo `createdBy` (autoría). Solo personal editorial; el público y los roles sin
 * función editorial no reciben IDs de autores. Límite: oculta el campo en la respuesta, no el hecho de
 * que el `where` de `read` use `createdBy` internamente.
 */
export const canReadEditorialAuthorship = ({ req }: { req: PayloadRequest }): boolean =>
  hasRole(req.user, [...EDITORIAL_READ_ROLES, 'correspondent'])

/**
 * DEP-04 (RDD-DEP-11): roles que pueden ver auditoría, logs, métricas, alertas y el detalle de salud.
 * Política PROVISIONAL de solo estrechamiento (hoy basta cualquier sesión); la matriz final es de
 * SEC-03 (Product Owner). Amenaza que evita: que `viewer`/`editor` lean emails, IP y estado interno.
 * Límite: es una lista de roles, no una ACL por documento; no concede nada a roles nuevos.
 */
export const MONITORING_ROLES: readonly UserRole[] = ['superadmin', 'auditor']

/**
 * DEP-04: roles que usan el panel editorial (`/api/dashboard/*`). Son los roles editoriales ya
 * existentes más `auditor` (observador). Las consultas además aplican las ACL de `noticias`.
 * Límite: `viewer` y `media-manager` quedan fuera hasta la decisión SEC-03.
 */
export const DASHBOARD_ROLES: readonly UserRole[] = [
  'superadmin',
  'web-admin',
  'publisher',
  'reviewer',
  'editor',
  'correspondent',
  'auditor',
]

/**
 * DEP-04: lectura de la colección `auditoria` (REST, GraphQL, Local API con ACL y panel).
 * Amenaza que evita: enumerar el log (emails, IP, cambios) con cualquier sesión.
 * Límite: las escrituras internas de `logAudit()` usan Local API sin ACL y no pasan por aquí.
 */
export const canReadAuditLog: Access = ({ req }) => hasRole(req.user, MONITORING_ROLES)

export const canDeleteEditorial: Access =({ req }) =>
  hasRole(req.user, ['superadmin', 'web-admin', 'publisher'])

// Institutional collections (Facultades, Carreras, Autoridades, etc.)
const INSTITUTIONAL_WRITE_ROLES: readonly UserRole[] = ['superadmin', 'web-admin']

export const canWriteInstitutional: Access = ({ req }) =>
  hasRole(req.user, INSTITUTIONAL_WRITE_ROLES)

/**
 * SEC-10 (política PROVISIONAL de solo estrechamiento, como DEP-02): lectura de colecciones con
 * checkbox `active` (TribunalDocumentos, TribunalMiembros). Los roles que ya escriben institucional
 * (superadmin, web-admin; misma lista que `canWriteInstitutional`) reciben `true`; anónimo y cualquier
 * otro rol (incluido nulo o desconocido) solo reciben filas con `active = true`.
 * Amenaza que evita: que un anónimo lea por REST/GraphQL/Local API registros retirados (`active = false`).
 * Límite: filas con `active` nulo quedan ocultas a propósito; no cubre Tesis ni Media (sin campo de
 * estado); no cambia create/update/delete ni concede permisos a roles nuevos.
 */
export const readActiveOrInstitutional: Access = ({ req }) => {
  if (hasRole(req.user, INSTITUTIONAL_WRITE_ROLES)) return true
  const activeOnly: Where = { active: { equals: true } }
  return activeOnly
}

/**
 * FAC-01 (SEC-10): igual que `readActiveOrInstitutional`, pero con otro nombre de checkbox. Existe porque
 * `facultades` y `carreras` usan `activa` y renombrarlo obligaría a migrar a la vez seis páginas, consultas,
 * siembras y tests (spec docs/specs/portal/FACULTADES.md §3.1).
 * Amenaza que evita: que un anónimo lea por REST/GraphQL facultades o carreras desactivadas.
 * Límite: filas con el campo nulo quedan ocultas; también se ocultan dentro de relaciones pobladas para anónimos.
 */
export const readFlagOrInstitutional =
  (field: string): Access =>
  ({ req }) => {
    if (hasRole(req.user, INSTITUTIONAL_WRITE_ROLES)) return true
    const flagOnly: Where = { [field]: { equals: true } }
    return flagOnly
  }

// Media collection
export const canWriteMedia: Access = ({ req }) =>
  hasRole(req.user, ['superadmin', 'web-admin', 'publisher', 'editor', 'correspondent', 'media-manager'])

export const canDeleteMedia: Access = ({ req }) =>
  hasRole(req.user, ['superadmin', 'web-admin', 'media-manager'])

// FAQs
export const canWriteFAQs: Access = ({ req }) =>
  hasRole(req.user, ['superadmin', 'web-admin', 'publisher', 'editor'])

export const canDeleteFAQs: Access = ({ req }) =>
  hasRole(req.user, ['superadmin', 'web-admin'])

// Globals
export const canUpdateGlobal: Access = ({ req }) =>
  hasRole(req.user, ['superadmin', 'web-admin'])
