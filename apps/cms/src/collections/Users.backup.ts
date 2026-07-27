import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',

  labels: {
    singular: 'Usuario',
    plural: 'Usuarios',
  },

  admin: {
    group: 'Administración',
    useAsTitle: 'email',
    defaultColumns: [
      'name',
      'email',
      'role',
      'institutionalUnit',
      'active',
      'updatedAt',
    ],
    description:
      'Administración de usuarios, roles y unidades institucionales autorizadas.',
  },

  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nombre y apellido',
      required: true,
      admin: {
        placeholder: 'Ej.: César Augusto Vargas Alvarez',
      },
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rol institucional',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
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
      ],
      admin: {
        description:
          'Determina las funciones y permisos institucionales del usuario.',
      },
    },
    {
      name: 'institutionalUnit',
      type: 'text',
      label: 'Unidad institucional',
      admin: {
        placeholder: 'Ej.: Rectorado, FACET, FCEA o Dirección de Posgrado',
        description:
          'Más adelante este campo se vinculará con la colección de unidades académicas.',
      },
    },
    {
      name: 'position',
      type: 'text',
      label: 'Cargo o función',
      admin: {
        placeholder: 'Ej.: Secretario de Información',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Usuario activo',
      defaultValue: true,
      admin: {
        description:
          'Desmarcar para inhabilitar administrativamente al usuario.',
      },
    },
  ],
}