import type { CollectionConfig } from 'payload'

import {
  canCreateUsers,
  canDeleteUsers,
  canManageUserRoles,
  canReadProtectedUserFields,
  canReadUsers,
  canUnlockUsers,
  canUpdateUsers,
  isAuthenticated,
  USER_ROLE_OPTIONS,
} from '../access/roles'
import {
  protectLastSuperAdminBeforeChange,
  protectSuperAdminBeforeDelete,
} from '../hooks/users/protectSuperAdmins'

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
    description:
      'Usuarios autorizados para administrar el Portal Institucional UNC.',
  },

  auth: true,

  access: {
    admin: isAuthenticated,
    create: canCreateUsers,
    read: canReadUsers,
    update: canUpdateUsers,
    delete: canDeleteUsers,
    unlock: canUnlockUsers,
  },

  hooks: {
    beforeChange: [protectLastSuperAdminBeforeChange],
    beforeDelete: [protectSuperAdminBeforeDelete],
  },

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
      access: {
        create: canManageUserRoles,
        read: canReadProtectedUserFields,
        update: canManageUserRoles,
      },
      admin: {
        position: 'sidebar',
        description:
          'Define las funciones y permisos institucionales del usuario dentro del CMS.',
      },
    },
    {
      name: 'telefono',
      type: 'text',
      label: 'Número de teléfono',
      required: false,
      admin: {
        placeholder: '+595 9XX XXX XXXX (Whatsapp/Telegram)',
        description: 'Número de teléfono para notificaciones via Whatsapp y Telegram',
      },
    },
    {
      name: 'telegramUserId',
      type: 'text',
      label: 'Telegram User ID',
      required: false,
      admin: {
        placeholder: 'Usuario Telegram (obtenido de @userinfobot)',
        description: 'ID del usuario en Telegram para recibir notificaciones',
      },
    },
  ],
}
