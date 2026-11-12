// SEC-CUENTAS-04 (odd/tasks/seguridad-cuentas.md, S8): recuperación de emergencia de un superadmin desde el servidor.
// Qué hace: a una cuenta superadmin existente le fija una contraseña provisoria generada (16 caracteres que cumplen la
//   política), le exige cambiarla al ingresar, la desbloquea, cierra todas sus sesiones y deja en la auditoría quién
//   ejecutó la recuperación. Sin `--confirmar` solo muestra el plan.
// Por qué existe: la recuperación por correo está cerrada (endpoints/users/recuperacionCerrada.ts) y una contraseña la
//   restablece un superadmin; si el único superadmin la pierde, nadie podría administrar el portal.
// Amenaza que evita: quedarse sin administrador SIN reabrir una vía web. Exige acceso al servidor (shell y la base), un
//   factor más fuerte que un enlace por correo.
// Límite: no crea cuentas ni cambia roles; las demás cuentas se restablecen desde el panel. La contraseña se imprime UNA
//   vez en la terminal del operador (no se guarda en ningún registro).
// Uso (producción, en el VPS): docs/manual/CONTRASENAS-Y-CUENTAS.md, sección «Recuperación de emergencia».
import type { Payload, PayloadRequest, SanitizedConfig } from 'payload'

import { generatePassword } from '../endpoints/users/restablecerClave'
import { pruneSessions } from '../endpoints/users/sessions'

export type RecoveryArgs = { email: string; operador: string; confirmar: boolean }

export type RecoveryResult =
  | { ok: true; simulacion: true; email: string }
  | { ok: true; simulacion: false; email: string; clave: string }
  | { ok: false; error: string }

/** Lee `--email <correo> --operador "<quién>" [--confirmar]` (también acepta `--email=<correo>`). */
export function parseRecoveryArgs(argv: readonly string[]): RecoveryArgs {
  const value = (name: string): string => {
    const inline = argv.find((a) => a.startsWith(`--${name}=`))
    if (inline) return inline.slice(name.length + 3)
    const i = argv.indexOf(`--${name}`)
    const next = i >= 0 ? argv[i + 1] : undefined
    return next && !next.startsWith('--') ? next : ''
  }
  return { email: value('email').trim(), operador: value('operador').trim(), confirmar: argv.includes('--confirmar') }
}

/**
 * Ejecuta la recuperación. Devuelve el resultado en lugar de imprimir (lo prueban las pruebas unitarias).
 * El hook `enforcePasswordLifecycle` vuelve a validar la política, guarda el historial, fija la fecha y la marca de cambio
 * obligatorio; `auditUserAfterChange` registra `restablecer_clave` con el operador (contexto `recuperacionEmergencia`).
 */
export async function recuperarSuperadmin(payload: Payload, args: RecoveryArgs): Promise<RecoveryResult> {
  const email = args.email.trim().toLowerCase()
  const operador = args.operador.trim()
  if (!email) return { ok: false, error: 'Falta --email <correo del superadmin>.' }
  if (operador.length < 3) return { ok: false, error: 'Falta --operador "<nombre de quien ejecuta la recuperación>".' }

  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  const account = found.docs[0] as { id: number | string; email?: string; role?: string } | undefined
  if (!account) return { ok: false, error: 'No existe una cuenta con ese correo.' }
  if (account.role !== 'superadmin') {
    return { ok: false, error: 'Solo recupera cuentas superadmin; las demás las restablece un superadmin desde el panel.' }
  }
  if (!args.confirmar) return { ok: true, simulacion: true, email }

  const clave = generatePassword(email)
  await payload.update({
    collection: 'users',
    id: account.id,
    data: { password: clave },
    overrideAccess: true,
    context: { exigirCambio: true, modoRestablecimiento: 'generar', recuperacionEmergencia: { operador } },
  })
  // Una cuenta bloqueada por intentos fallidos no podría ingresar con la provisoria.
  // El tipo de Payload 3.91 pide `password`, pero la operación solo lee el correo (auth/operations/unlock.js:17).
  await payload.unlock({ collection: 'users', data: { email } as { email: string; password: string }, overrideAccess: true })
  // Cualquier sesión abierta (por ejemplo, de quien se apoderó de la cuenta) deja de valer.
  await pruneSessions({ payload } as PayloadRequest, account.id, () => false)
  return { ok: true, simulacion: false, email, clave }
}

/** Punto de entrada de `payload recuperar-superadmin` (registrado en `config.bin` de payload.config.ts). */
export async function script(config: SanitizedConfig): Promise<void> {
  const args = parseRecoveryArgs(process.argv.slice(2))
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config })
  const result = await recuperarSuperadmin(payload, args)
  if (!result.ok) {
    console.error(`ERROR: ${result.error}`)
    process.exit(1)
  }
  if (result.simulacion) {
    console.log(`Plan: restablecer la contraseña del superadmin ${result.email}, exigir el cambio al ingresar,`)
    console.log('desbloquear la cuenta y cerrar todas sus sesiones. No se cambió nada. Repita con --confirmar.')
    process.exit(0)
  }
  console.log(`Listo. Contraseña provisoria de ${result.email} (se muestra UNA sola vez; no queda registrada):`)
  console.log('')
  console.log(`    ${result.clave}`)
  console.log('')
  console.log('Entréguela por un canal seguro. Al ingresar, el panel exigirá elegir una nueva.')
  console.log('Borre el historial de esta terminal (por ejemplo `clear`) cuando la haya entregado.')
  process.exit(0)
}
