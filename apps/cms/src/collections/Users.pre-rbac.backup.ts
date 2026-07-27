import type { CollectionConfig } from 'payload'

/**
 * Roles institucionales del Portal UNC.
 *
 * En esta primera etapa solo se declara el campo `role`.
 * Las restricciones RBAC se incorporarán después de asignar
 * `superadmin` al usuario administrador actual.
 */
export const USER_ROLE_OPTIONS = [
  {
    label: 'Superadministrador',
    value: 'superadmin',
  },
  {
    label: 'Administrador web',
    value: 'web-admin',
  },
  {
    label: 'Publicador institucional',
    value: 'publisher',
  },
  {
    label: 'Revisor editorial',
    value: 'reviewer',
  },
  {
    label: 'Editor',
    value: 'editor',
  },
  {
    label: 'Corresponsal de unidad',
    value: 'correspondent',
  },
  {
    label: 'Gestor multimedia',
    value: 'media-manager',
  },
  {
    label: 'Auditor',
    value: 'auditor',
  },
  {
    label: 'Consulta',
    value: 'viewer',
  },
] as const

export type UserRole = (typeof USER_ROLE_OPTIONS)[number]['value']

export const Users: CollectionConfig = {
  slug: 'users',

  labels: {
    singular: 'Usuario',
    plural: 'Usuarios',
  },

  admin: {
    useAsTitle: 'email',
    group: 'Administración',
    defaultColumns: ['email', 'role', 'updatedAt'],
    description: 'Usuarios autorizados para administrar el Portal Institucional UNC.',
  },

  auth: true,

  fields: [
    {
      name: 'role',
      type: 'select',
      label: 'Rol institucional',
      required: true,
      defaultValue: 'viewer',
      saveToJWT: true,
      index: true,
      options: [...USER_ROLE_OPTIONS],
      admin: {
        position: 'sidebar',
        description:
          'Define las funciones y permisos institucionales del usuario dentro del CMS.',
      },
    },
  ],
}