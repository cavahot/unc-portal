import type { CollectionConfig } from 'payload'

export const Auditoria: CollectionConfig = {
  slug: 'auditoria',
  labels: {
    singular: 'Evento de auditoría',
    plural: 'Auditoría',
  },
  admin: {
    useAsTitle: 'accion',
    defaultColumns: ['usuario', 'accion', 'coleccion', 'fechaHora', 'resultado'],
    group: 'Administración',
    description: 'Registro de eventos y acciones en el sistema',
  },
  access: {
    read: async ({ req }) => !!req.user,
    create: ({ req }) => Boolean(req.user),
    update: async ({ req }) => !!req.user && req.user?.role === 'superadmin',
    delete: async ({ req }) => !!req.user && req.user?.role === 'superadmin',
  },
  fields: [
    {
      name: 'usuario',
      type: 'text',
      required: true,
      admin: {
        description: 'Email del usuario que realizó la acción',
      },
    },
    {
      name: 'rol',
      type: 'text',
      required: false,
      admin: {
        description: 'Rol del usuario al momento de la acción',
      },
    },
    {
      name: 'accion',
      type: 'select',
      required: true,
      options: [
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
        { label: 'Crear', value: 'crear' },
        { label: 'Actualizar', value: 'actualizar' },
        { label: 'Eliminar', value: 'eliminar' },
        { label: 'Publicar', value: 'publicar' },
        { label: 'Cambiar rol', value: 'cambiar_rol' },
        { label: 'Revisar', value: 'revisar' },
        { label: 'Aprobar', value: 'aprobar' },
        { label: 'Rechazar', value: 'rechazar' },
        { label: 'Importar', value: 'importar' },
        { label: 'Revalidar', value: 'revalidar' },
      ],
      index: true,
    },
    {
      name: 'coleccion',
      type: 'text',
      required: false,
      admin: {
        description: 'Colección afectada (noticias, usuarios, media, etc)',
      },
    },
    {
      name: 'documento',
      type: 'text',
      required: false,
      admin: {
        description: 'ID o título del documento afectado',
      },
    },
    {
      name: 'fechaHora',
      type: 'date',
      required: true,
      admin: {
        description: 'Fecha y hora del evento',
      },
    },
    {
      name: 'ip',
      type: 'text',
      required: false,
      admin: {
        description: 'Dirección IP del cliente',
      },
    },
    {
      name: 'resultado',
      type: 'select',
      required: true,
      options: [
        { label: 'Éxito', value: 'exito' },
        { label: 'Error', value: 'error' },
        { label: 'Advertencia', value: 'advertencia' },
      ],
      index: true,
    },
    {
      name: 'mensaje',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Descripción o mensaje del evento',
      },
    },
    {
      name: 'cambiosRelevantes',
      type: 'json',
      required: false,
      admin: {
        description: 'JSON con los cambios realizados (antes/después)',
      },
    },
  ],
  timestamps: true,
}
