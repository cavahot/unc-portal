import type { CollectionConfig } from 'payload'

import {
  canCreateUsers,
  canDeleteUsers,
  canManageUserRoles,
  canReadOwnAccountSecurityField,
  canReadProtectedUserFields,
  canReadUsers,
  canUnlockUsers,
  canUpdateUsers,
  isAuthenticated,
  USER_ROLE_OPTIONS,
} from '../access/roles'
import { cuentasAdmin } from '../admin/cuentas'
import { usersEndpoints } from '../endpoints/users'
import {
  auditUserAfterChange,
  auditUserAfterDelete,
  auditUserLogin,
  auditUserLogout,
} from '../hooks/users/auditUsers'
import { enforcePasswordLifecycle } from '../hooks/users/passwordLifecycle'
import {
  protectLastSuperAdminBeforeChange,
  protectSuperAdminBeforeDelete,
} from '../hooks/users/protectSuperAdmins'

type Env = Record<string, string | undefined>

/** Normaliza a origen (`protocolo://host[:puerto]`); descarta lo que no sea una URL http(s). */
const toOrigin = (value: string | undefined): string | undefined => {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
  } catch {
    return undefined
  }
}

/**
 * SEC-CUENTAS-01 / S7 (hallazgo S-4): URL pública del CMS (`serverURL`) y lista EXACTA de orígenes de confianza para
 * `csrf` y `cors`: el CMS y el portal públicos y, solo fuera de producción, `http://localhost:3002` y
 * `http://localhost:3000`.
 * Fuente: el compose proyecta `CMS_PUBLIC_URL` → `NEXT_PUBLIC_SERVER_URL` y `PORTAL_PUBLIC_URL` → `PORTAL_URL`
 * (infrastructure/docker/compose.prod.yaml); se acepta `CMS_PUBLIC_URL` como respaldo.
 * Amenaza que evita: que otro sitio use la cookie de sesión de un editor (Payload ignora la cookie si el `Origin` no
 * está en `csrf`, auth/extractJWT.js) y respuestas CORS con credenciales para orígenes ajenos.
 * Límite: se lee del objeto `env` recibido, NO de `process.env.NEXT_PUBLIC_*` literal, porque Next incrusta esas
 * expresiones al compilar y la imagen de producción se compila sin esas variables (apps/cms/Dockerfile).
 * Vive aquí, junto a la cookie de sesión de `users`, porque ambas definen la sesión del CMS.
 */
export function resolveSessionOrigins(env: Env): { serverURL: string | undefined; origins: string[] } {
  const serverURL = toOrigin(env.NEXT_PUBLIC_SERVER_URL) ?? toOrigin(env.CMS_PUBLIC_URL)
  const portalURL = toOrigin(env.PORTAL_URL)
  const dev = env.NODE_ENV !== 'production' ? ['http://localhost:3002', 'http://localhost:3000'] : []
  const origins = [...new Set([serverURL, portalURL, ...dev].filter((o): o is string => Boolean(o)))]
  return { serverURL, origins }
}

/**
 * SEC-CUENTAS-01 / S7: cookie de sesión `secure` en producción y `SameSite=Strict` siempre.
 * Amenaza que evita: que la cookie viaje por HTTP en claro y que se envíe en solicitudes iniciadas por otro sitio.
 * Límite: fuera de producción no es `secure` porque el desarrollo local va por http (el navegador no guardaría la
 * cookie); con `Strict`, un enlace externo al panel (p. ej. desde el correo) llega sin sesión y pide ingresar.
 */
export function resolveAuthCookies(env: Env): { secure: boolean; sameSite: 'Strict' } {
  return { secure: env.NODE_ENV === 'production', sameSite: 'Strict' }
}

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

  // S7: cookie de sesión endurecida (ver resolveAuthCookies). El resto de la configuración de auth es la de Payload:
  // sesiones en `users_sessions`, bloqueo tras 5 intentos fallidos durante 10 minutos, token de 2 horas.
  auth: {
    cookies: resolveAuthCookies(process.env),
  },

  // SEC-CUENTAS-01: cambio de contraseña propio, restablecimiento por superadmin y cierre de la recuperación por correo.
  endpoints: usersEndpoints,

  // SEC-027 (minimización): al poblar un usuario desde otra colección (p. ej. `createdBy` con depth ≥ 1) solo viajan
  // su correo y su rol. Evita copiar teléfono, Telegram o sesiones a respuestas y auditorías que no los necesitan.
  // Límite: no cambia la lectura directa de /api/users, que sigue gobernada por `canReadUsers`.
  defaultPopulate: { email: true, role: true },

  access: {
    admin: isAuthenticated,
    create: canCreateUsers,
    read: canReadUsers,
    update: canUpdateUsers,
    delete: canDeleteUsers,
    unlock: canUnlockUsers,
  },

  hooks: {
    // SEC-CUENTAS-01: la política, el historial, la fecha y el cambio obligatorio se deciden en el servidor en TODA
    // vía que fija una contraseña (enforcePasswordLifecycle); la auditoría registra sesiones y cambios de cuentas.
    beforeChange: [protectLastSuperAdminBeforeChange, enforcePasswordLifecycle],
    beforeDelete: [protectSuperAdminBeforeDelete],
    afterChange: [auditUserAfterChange],
    afterDelete: [auditUserAfterDelete],
    afterLogin: [auditUserLogin],
    afterLogout: [auditUserLogout],
  },

  fields: [
    // SEC-CUENTAS-01 / S6: nombre visible en el diálogo «Restablecer la contraseña de <Nombre Apellido>».
    {
      name: 'nombre',
      type: 'text',
      label: 'Nombre',
      required: false,
    },
    {
      name: 'apellido',
      type: 'text',
      label: 'Apellido',
      required: false,
    },
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
    // SEC-CUENTAS-01 (S1, S4): estado de la contraseña. Solo los escribe el hook `enforcePasswordLifecycle` (acceso de
    // campo create/update falso: REST y el panel no pueden fijarlos); los lee la propia cuenta (el panel decide si la
    // lleva a la pantalla de cambio) y el superadmin.
    {
      name: 'mustChangePassword',
      type: 'checkbox',
      label: 'Debe cambiar la contraseña al ingresar',
      defaultValue: false,
      access: {
        create: () => false,
        read: canReadOwnAccountSecurityField,
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Lo fija el sistema al restablecer la contraseña; se borra cuando el usuario la cambia.',
      },
    },
    {
      name: 'passwordChangedAt',
      type: 'date',
      label: 'Último cambio de contraseña',
      access: {
        create: () => false,
        read: canReadOwnAccountSecurityField,
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Vence a los 90 días. Sin fecha, el usuario debe cambiarla en su próximo ingreso.',
      },
    },
    // SEC-CUENTAS-01 (S2): hashes propios (scrypt con sal) de las últimas 5 contraseñas, para impedir repetirlas.
    // Oculto y sin acceso para nadie: no viaja en ninguna respuesta (ni en req.user) ni se muestra en el panel.
    {
      name: 'passwordHistory',
      type: 'json',
      hidden: true,
      access: {
        create: () => false,
        read: () => false,
        update: () => false,
      },
    },
    // SEC-CUENTAS-03 (S6): botón «Restablecer contraseña» con el diálogo estilo Google Workspace (solo superadmin sobre
    // otra cuenta; el endpoint vuelve a comprobarlo).
    cuentasAdmin.restablecerClaveField,
  ],
}
