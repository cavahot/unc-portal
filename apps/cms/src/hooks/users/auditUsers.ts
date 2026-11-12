// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S5 «todo auditado»): auditoría de las cuentas del CMS.
// Qué registra: ingreso (`login`), salida (`logout`), alta (`crear`), baja (`eliminar`), cambio de rol (`cambiar_rol`,
//   con antes/después), cambio de contraseña propio (`cambiar_clave`, con motivo) y restablecimiento por un
//   administrador (`restablecer_clave`, con modo y si exige cambio).
// Amenaza que evita: cambios de credenciales o de privilegios sin rastro.
// Límites: NUNCA copia contraseñas, hashes, sal, historial ni sesiones (solo valores elegidos campo por campo); la
//   auditoría no es transaccional con el cambio (`logAudit` no lanza y, si falla, queda en el log del servidor); los
//   intentos de ingreso fallidos los cuenta Payload (bloqueo tras 5) pero no tienen hook propio en 3.91.
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterLoginHook,
  CollectionAfterLogoutHook,
  PayloadRequest,
} from 'payload'

import { passwordExpiry } from '../../config/passwordPolicy'
import { getClientIP, logAudit, type AuditLogData } from '../../utilities/audit'
import type { PasswordChangeContext } from './passwordLifecycle'
import { isSelfAccountChange } from './passwordLifecycle'

type Account = {
  id?: number | string
  email?: string | null
  role?: string | null
  mustChangePassword?: boolean | null
  passwordChangedAt?: string | null
}

/** Motivo del cambio de contraseña propio (S5). */
export type MotivoCambioClave = 'voluntario' | 'primer_ingreso_o_restablecida' | 'vencida'

/**
 * Motivo según el estado ANTERIOR de la cuenta: marcada por un administrador → primer ingreso o restablecida; vencida o
 * sin fecha → vencida; si no, voluntario. Límite: si estaba marcada Y vencida prevalece la marca (la causa original).
 */
export const motivoCambioClave = (previous: Account | null | undefined, now: Date = new Date()): MotivoCambioClave => {
  if (previous?.mustChangePassword === true) return 'primer_ingreso_o_restablecida'
  if (passwordExpiry(previous?.role, previous?.passwordChangedAt ?? null, now).expired) return 'vencida'
  return 'voluntario'
}

/** Cuenta afectada en una forma legible para el log: correo e ID (nunca otros datos). */
const docLabel = (doc: Account | null | undefined, id?: number | string) =>
  `${doc?.email ?? 'sin correo'} (ID: ${doc?.id ?? id ?? '?'})`

/** Actor de la acción: la sesión, o `sistema` para la Local API sin usuario. */
const actor = (req: PayloadRequest) => ({
  usuario: (req.user as Account | null)?.email || 'sistema',
  rol: String((req.user as Account | null)?.role || 'system'),
})

/** Escribe un evento sin lanzar nunca (la auditoría no debe impedir la acción ya hecha). */
const write = async (req: PayloadRequest, data: Omit<AuditLogData, 'ip' | 'coleccion'>) => {
  try {
    await logAudit({ ...data, coleccion: 'users', ip: getClientIP(req) }, req.payload)
  } catch (error) {
    console.error('[Audit] No se pudo auditar la cuenta:', error instanceof Error ? error.name : 'desconocido')
  }
}

/**
 * `afterLogin`: registra el ingreso, con la marca de si la cuenta entra con el cambio de contraseña pendiente.
 * No registra la verificación de la contraseña actual que hace `cambiar-clave` con `payload.login` (no es un ingreso).
 */
export const auditUserLogin: CollectionAfterLoginHook = async ({ req, user, context }) => {
  if ((context as PasswordChangeContext | undefined)?.verificacionClave || (req.context as PasswordChangeContext)?.verificacionClave) {
    return user
  }
  const account = user as Account
  const pendiente =
    account.mustChangePassword === true || passwordExpiry(account.role, account.passwordChangedAt ?? null).expired
  await write(req, {
    usuario: account.email || 'desconocido',
    rol: String(account.role || 'desconocido'),
    accion: 'login',
    documento: docLabel(account),
    resultado: 'exito',
    mensaje: pendiente ? 'Ingreso con cambio de contraseña pendiente' : 'Ingreso',
    cambiosRelevantes: { cambioClavePendiente: pendiente },
  })
  return user
}

/** `afterLogout`: registra la salida de la sesión actual. */
export const auditUserLogout: CollectionAfterLogoutHook = async ({ req }) => {
  await write(req, {
    ...actor(req),
    accion: 'logout',
    documento: docLabel(req.user as Account),
    resultado: 'exito',
    mensaje: 'Salida',
  })
}

/**
 * `afterChange`: alta de cuenta, cambio de rol y cambio de contraseña. Un cambio de contraseña se detecta porque
 * `passwordChangedAt` cambió (solo lo fija `enforcePasswordLifecycle` al recibir una contraseña nueva).
 */
export const auditUserAfterChange: CollectionAfterChangeHook = async ({ req, operation, doc, previousDoc }) => {
  const current = doc as Account
  const previous = (previousDoc ?? {}) as Account
  const ctx = (req.context ?? {}) as PasswordChangeContext

  if (operation === 'create') {
    await write(req, {
      ...actor(req),
      accion: 'crear',
      documento: docLabel(current),
      resultado: 'exito',
      mensaje: 'Cuenta creada',
      cambiosRelevantes: { role: current.role ?? null, mustChangePassword: current.mustChangePassword === true },
    })
    return doc
  }

  if (operation !== 'update') return doc

  if ((previous.role ?? null) !== (current.role ?? null)) {
    await write(req, {
      ...actor(req),
      accion: 'cambiar_rol',
      documento: docLabel(current),
      resultado: 'exito',
      mensaje: 'Cambio de rol',
      cambiosRelevantes: { role: { antes: previous.role ?? null, despues: current.role ?? null } },
    })
  }

  const passwordChanged =
    Boolean(current.passwordChangedAt) && String(current.passwordChangedAt) !== String(previous.passwordChangedAt ?? '')
  if (!passwordChanged) return doc

  if (isSelfAccountChange(req, current.id)) {
    const motivo = motivoCambioClave(previous)
    await write(req, {
      usuario: current.email || actor(req).usuario,
      rol: String(current.role || actor(req).rol),
      accion: 'cambiar_clave',
      documento: docLabel(current),
      resultado: 'exito',
      mensaje: 'Cambio de contraseña propio',
      cambiosRelevantes: { motivo },
    })
  } else {
    await write(req, {
      ...actor(req),
      accion: 'restablecer_clave',
      documento: docLabel(current),
      resultado: 'exito',
      mensaje: 'Contraseña restablecida por un administrador',
      cambiosRelevantes: {
        modo: ctx.modoRestablecimiento ?? 'crear',
        exigirCambio: current.mustChangePassword === true,
      },
    })
  }
  return doc
}

/** `afterDelete`: registra la baja de la cuenta (el borrado ya ocurrió; solo deja rastro). */
export const auditUserAfterDelete: CollectionAfterDeleteHook = async ({ req, doc, id }) => {
  await write(req, {
    ...actor(req),
    accion: 'eliminar',
    documento: docLabel(doc as Account, id),
    resultado: 'exito',
    mensaje: 'Cuenta eliminada',
  })
  return doc
}

/**
 * Registra un intento FALLIDO de cambio de contraseña propio (contraseña actual incorrecta o cuenta bloqueada). Lo usa
 * el endpoint `cambiar-clave`; nunca recibe ni guarda las contraseñas.
 */
export const auditFailedPasswordChange = async (req: PayloadRequest, motivo: 'clave_actual_incorrecta' | 'cuenta_bloqueada') =>
  write(req, {
    ...actor(req),
    accion: 'cambiar_clave',
    documento: docLabel(req.user as Account),
    resultado: 'error',
    mensaje: 'Intento fallido de cambio de contraseña',
    cambiosRelevantes: { motivo },
  })
