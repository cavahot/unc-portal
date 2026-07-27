import type { Access, PayloadRequest } from 'payload'

import type { User } from '../payload-types'

export const USER_ROLE_OPTIONS = [
  { label: 'Superadministrador', value: 'superadmin' },
  { label: 'Administrador web', value: 'web-admin' },
  { label: 'Publicador institucional', value: 'publisher' },
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
 * El acceso al panel administrativo solo admite boolean.
 * No debe tiparse como Access<User>, porque Access también puede devolver Where.
 */
export const isAuthenticated: AdminAccess = ({ req }) =>
  Boolean(req.user)

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
